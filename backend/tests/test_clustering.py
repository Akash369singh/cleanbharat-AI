from backend.app.services.clustering import haversine_distance_meters, find_duplicate_cluster, link_duplicate_report
from backend.app.models.report import Report

def test_haversine_distance_formula():
    # CP center to Rajiv Chowk gate (~300m)
    lat1, lon1 = 28.6315, 77.2167
    lat2, lon2 = 28.6328, 77.2195
    dist = haversine_distance_meters(lat1, lon1, lat2, lon2)
    assert 250.0 < dist < 400.0

def test_duplicate_cluster_detection_and_linking(db):
    # Existing report in DB: CB-1001 at (28.6530, 77.1915), category: garbage_dump
    parent = db.query(Report).filter(Report.ticket_number == "CB-1001").first()
    assert parent is not None

    # Report very close (approx 20m away), same category
    close_lat, close_lng = 28.6531, 77.1916
    match = find_duplicate_cluster(db, lat=close_lat, lng=close_lng, category="garbage_dump")
    assert match is not None
    assert match.id == parent.id

    # Report far away (e.g. 500m away)
    far_lat, far_lng = 28.6600, 77.2000
    far_match = find_duplicate_cluster(db, lat=far_lat, lng=far_lng, category="garbage_dump")
    assert far_match is None

    # Link duplicate
    new_rep = Report(
        ticket_number="CB-TEST-DUP",
        category="garbage_dump",
        waste_type="mixed_other",
        description="Another complaint on same garbage pile",
        lat=close_lat,
        lng=close_lng,
        status="submitted",
        source="rules_fallback"
    )
    db.add(new_rep)
    db.flush()

    old_dup_count = parent.duplicate_count or 0
    link_duplicate_report(db, new_rep, parent)
    assert new_rep.cluster_id == parent.id
    assert parent.duplicate_count == old_dup_count + 1
    assert parent.is_cluster_parent is True
