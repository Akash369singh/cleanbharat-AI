from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.config_setting import ConfigSetting

DEFAULT_PRIORITY_WEIGHTS = {
    "w_severity": 2.5,
    "w_overflow": 1.5,
    "w_age_per_hour": 0.05,
    "w_duplicate": 0.8,
    "w_drain_clog": 2.0,
    "w_sensitive_location": 1.5,
    "max_age_hours": 72.0
}

SEVERITY_BY_CATEGORY = {
    "drain_clog": 4.0,
    "garbage_dump": 3.5,
    "overflowing_bin": 3.0,
    "plastic_waste": 2.0,
    "dead_animal": 4.5,
    "hazardous_waste": 5.0,
    "other": 2.0
}

def get_configured_weights(db: Optional[Session]) -> Dict[str, float]:
    if not db:
        return DEFAULT_PRIORITY_WEIGHTS
    setting = db.query(ConfigSetting).filter(ConfigSetting.key == "priority_weights").first()
    if setting and isinstance(setting.value_json, dict):
        weights = DEFAULT_PRIORITY_WEIGHTS.copy()
        weights.update(setting.value_json)
        return weights
    return DEFAULT_PRIORITY_WEIGHTS

def calculate_priority_score(
    category: str,
    created_at: datetime,
    is_overflow: bool = False,
    is_drain_obstruction: bool = False,
    description: str = "",
    duplicate_count: int = 0,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    weights = get_configured_weights(db)
    
    # 1. Base severity score (0 to 5)
    base_severity = SEVERITY_BY_CATEGORY.get(category.lower(), 2.0)
    severity_weighted = base_severity * weights["w_severity"]
    
    if created_at.tzinfo is not None:
        created_at = created_at.replace(tzinfo=None)
    now = datetime.utcnow()
    hours_open = max(0.0, (now - created_at).total_seconds() / 3600.0)
    capped_hours = min(hours_open, weights["max_age_hours"])
    age_weighted = capped_hours * weights["w_age_per_hour"]
    
    # 3. Overflow factor
    overflow_weighted = weights["w_overflow"] if is_overflow else 0.0
    
    # 4. Drain clog extra factor (flood risk)
    drain_weighted = weights["w_drain_clog"] if (is_drain_obstruction or category == "drain_clog") else 0.0
    
    # 5. Duplicate cluster factor (more citizens reporting = higher impact)
    duplicate_weighted = min(5.0, duplicate_count * weights["w_duplicate"])
    
    # 6. Sensitive location context check (keywords in description)
    desc_lower = description.lower()
    is_sensitive = any(kw in desc_lower for kw in ["hospital", "school", "dispensary", "clinic", "market", "metro", "temple", "bus stop"])
    location_weighted = weights["w_sensitive_location"] if is_sensitive else 0.0
    
    # Total calculation
    total_score = round(severity_weighted + age_weighted + overflow_weighted + drain_weighted + duplicate_weighted + location_weighted, 2)
    
    return {
        "score": total_score,
        "breakdown": {
            "base_severity": round(base_severity, 2),
            "severity_weighted": round(severity_weighted, 2),
            "hours_open": round(hours_open, 1),
            "age_weighted": round(age_weighted, 2),
            "overflow_weighted": round(overflow_weighted, 2),
            "drain_weighted": round(drain_weighted, 2),
            "duplicate_count": duplicate_count,
            "duplicate_weighted": round(duplicate_weighted, 2),
            "sensitive_location_detected": is_sensitive,
            "location_weighted": round(location_weighted, 2),
            "weights_used": weights
        },
        "explainable_summary": (
            f"Score {total_score} computed from base severity {base_severity} (wt {weights['w_severity']}), "
            f"open duration {round(hours_open, 1)}h (added {round(age_weighted, 2)}), "
            f"{duplicate_count} duplicate corroborations (added {round(duplicate_weighted, 2)}), "
            f"{'overflow flag active' if is_overflow else 'normal containment'}."
        )
    }
