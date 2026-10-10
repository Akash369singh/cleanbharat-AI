from datetime import datetime, timedelta
from backend.app.services.priority_engine import calculate_priority_score

def test_priority_calculation_severity_and_factors():
    now = datetime.utcnow()
    # High severity category: dead_animal or hazardous_waste
    calc = calculate_priority_score(
        category="hazardous_waste",
        created_at=now,
        is_overflow=True,
        is_drain_obstruction=False,
        description="Hazardous chemical drums leaking near city hospital gate",
        duplicate_count=2
    )

    score = calc["score"]
    breakdown = calc["breakdown"]
    
    # Base severity for hazardous_waste is 5.0 * 2.5 = 12.5
    assert breakdown["base_severity"] == 5.0
    assert breakdown["severity_weighted"] == 12.5
    # Overflow bonus
    assert breakdown["overflow_weighted"] > 0
    # Duplicate bonus (2 * 0.8 = 1.6)
    assert breakdown["duplicate_weighted"] == 1.6
    # Sensitive location bonus (hospital detected)
    assert breakdown["sensitive_location_detected"] is True
    assert breakdown["location_weighted"] > 0
    assert score > 15.0

def test_priority_score_increases_with_age():
    now = datetime.utcnow()
    fresh_time = now
    old_time = now - timedelta(hours=48)

    calc_fresh = calculate_priority_score(category="plastic_waste", created_at=fresh_time)
    calc_old = calculate_priority_score(category="plastic_waste", created_at=old_time)

    assert calc_old["score"] > calc_fresh["score"]
    assert calc_old["breakdown"]["hours_open"] >= 47.9
