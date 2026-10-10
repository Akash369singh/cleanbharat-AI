import math
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.models.report import Report, ReportEvent
from backend.app.models.config_setting import ConfigSetting
from backend.app.services.priority_engine import calculate_priority_score

DEFAULT_CLUSTER_RADIUS_METERS = 50.0
DEFAULT_CLUSTER_WINDOW_HOURS = 72.0

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two points in meters using Haversine formula."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def find_duplicate_cluster(
    db: Session,
    lat: float,
    lng: float,
    category: str,
    exclude_report_id: Optional[int] = None
) -> Optional[Report]:
    """
    Searches for an active existing report within configured radius and time window with matching category.
    Returns parent report if found, else None.
    """
    setting = db.query(ConfigSetting).filter(ConfigSetting.key == "clustering_config").first()
    radius_meters = DEFAULT_CLUSTER_RADIUS_METERS
    window_hours = DEFAULT_CLUSTER_WINDOW_HOURS
    if setting and isinstance(setting.value_json, dict):
        radius_meters = float(setting.value_json.get("radius_meters", DEFAULT_CLUSTER_RADIUS_METERS))
        window_hours = float(setting.value_json.get("window_hours", DEFAULT_CLUSTER_WINDOW_HOURS))

    time_cutoff = datetime.utcnow() - timedelta(hours=window_hours)
    
    # Query candidate reports: open statuses, matching category, within time window
    query = db.query(Report).filter(
        Report.category == category,
        Report.status.in_(["submitted", "verified", "assigned", "in_progress"]),
        Report.created_at >= time_cutoff,
        Report.cluster_id.is_(None)  # Find top-level cluster root
    )
    if exclude_report_id:
        query = query.filter(Report.id != exclude_report_id)

    candidates = query.all()
    for candidate in candidates:
        dist = haversine_distance_meters(lat, lng, candidate.lat, candidate.lng)
        if dist <= radius_meters:
            return candidate

    return None

def link_duplicate_report(db: Session, new_report: Report, parent_report: Report) -> None:
    """Links new_report to parent_report cluster and updates parent's corroboration score."""
    new_report.cluster_id = parent_report.id
    parent_report.is_cluster_parent = True
    parent_report.duplicate_count = (parent_report.duplicate_count or 0) + 1
    
    # Recalculate parent's priority score with updated duplicate count
    ai_res = parent_report.ai_result or {}
    new_calc = calculate_priority_score(
        category=parent_report.category,
        created_at=parent_report.created_at,
        is_overflow=ai_res.get("is_overflow", False),
        is_drain_obstruction=ai_res.get("is_drain_obstruction", False),
        description=parent_report.description,
        duplicate_count=parent_report.duplicate_count,
        db=db
    )
    parent_report.priority_score = new_calc["score"]
    parent_report.priority_breakdown = new_calc["breakdown"]

    # Record audit events
    event_parent = ReportEvent(
        report_id=parent_report.id,
        actor_id=new_report.citizen_id,
        event_type="cluster_linked",
        old_status=parent_report.status,
        new_status=parent_report.status,
        comment=f"Corroborating report #{new_report.ticket_number} linked to this cluster. Total duplicates: {parent_report.duplicate_count}",
        metadata_json={"linked_child_id": new_report.id, "distance_m": round(haversine_distance_meters(new_report.lat, new_report.lng, parent_report.lat, parent_report.lng), 1)}
    )
    event_child = ReportEvent(
        report_id=new_report.id,
        actor_id=new_report.citizen_id,
        event_type="cluster_linked",
        old_status=new_report.status,
        new_status=new_report.status,
        comment=f"Linked to parent cluster report #{parent_report.ticket_number}",
        metadata_json={"parent_cluster_id": parent_report.id}
    )
    db.add(event_parent)
    db.add(event_child)
