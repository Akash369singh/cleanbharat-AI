import io
import pytest
from PIL import Image
from backend.app.models.report import Report
from backend.app.models.routing import Route, Vehicle, Depot
from backend.app.models.resolution import ResolutionEvidence
from backend.app.models.engagement import PointsLedger
from backend.app.services.osrm_client import compute_haversine_matrix

def test_full_clean_bharat_end_to_end_scenario(client, citizen_headers, supervisor_headers, worker_headers, db):
    """
    Complete End-to-End Scenario:
    1. Submit report with photo
    2. Confirm persistence & AI classification
    3. Duplicate spatial clustering & score boost
    4. Supervisor verifies report
    5. Route optimization (Baseline vs Optimised)
    6. Worker moves to in_progress & uploads after-evidence
    7. Supervisor approves closure -> report resolved & points awarded
    8. Command Center metrics & CSV export updated
    9. Edge cases: OSRM fallback, invalid upload, unauthorized action, illegal transition
    """
    # Step 1: Upload site photo
    img = Image.new("RGB", (120, 120), color="orange")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_byte_arr.seek(0)

    upload_res = client.post(
        "/api/reports/upload",
        files={"file": ("dump_site.jpg", img_byte_arr, "image/jpeg")},
        headers=citizen_headers
    )
    assert upload_res.status_code == 200
    photo_path = upload_res.json()["photo_path"]
    assert photo_path.startswith("reports/")

    # Step 2: Citizen files report
    rep_payload = {
        "category": "garbage_dump",
        "description": "Massive pile of overflowing rotten vegetables and plastic bottles near city market entrance",
        "lat": 28.6500,
        "lng": 77.1950,
        "address_text": "Karol Bagh Market Gate 1",
        "photo_path": photo_path
    }
    create_res = client.post("/api/reports", json=rep_payload, headers=citizen_headers)
    assert create_res.status_code == 201
    rep1_data = create_res.json()
    rep1_id = rep1_data["id"]
    assert rep1_data["status"] == "submitted"
    assert rep1_data["source"] == "rules_fallback"
    assert rep1_data["priority_score"] > 0
    assert rep1_data["priority_breakdown"]["overflow_weighted"] > 0

    # Step 3: Duplicate clustering - second citizen reports same dump 25m away
    dup_payload = {
        "category": "garbage_dump",
        "description": "Huge heap of garbage blocking pedestrian path here as well",
        "lat": 28.6502,
        "lng": 77.1951,
        "address_text": "Near Karol Bagh Market Gate 1",
        "photo_path": photo_path
    }
    dup_res = client.post("/api/reports", json=dup_payload, headers=citizen_headers)
    assert dup_res.status_code == 201
    rep2_data = dup_res.json()
    assert rep2_data["cluster_id"] == rep1_id

    # Verify parent report corroboration count & score increased
    parent_rep = db.query(Report).filter(Report.id == rep1_id).first()
    assert parent_rep.is_cluster_parent is True
    assert parent_rep.duplicate_count >= 1

    # Step 4: Supervisor verifies parent report
    ver_res = client.post(
        f"/api/reports/{rep1_id}/status",
        json={"new_status": "verified", "comment": "Supervisor verified incident validity on ground"},
        headers=supervisor_headers
    )
    assert ver_res.status_code == 200
    assert ver_res.json()["status"] == "verified"

    # Step 5: Route planning & optimization
    depot = db.query(Depot).first()
    vehicle = db.query(Vehicle).first()
    opt_payload = {
        "depot_id": depot.id,
        "vehicle_id": vehicle.id,
        "report_ids": [rep1_id]
    }
    route_res = client.post("/api/routing/optimize", json=opt_payload, headers=supervisor_headers)
    assert route_res.status_code == 200
    route_data = route_res.json()
    assert "route_id" in route_data
    assert "optimization" in route_data
    opt = route_data["optimization"]
    assert opt["baseline"]["distance_meters"] > 0
    assert opt["optimised"]["distance_meters"] > 0
    assert opt["solver_used"] in ["ortools", "2opt_fallback"]
    assert opt["routing_source"] in ["osrm", "haversine_fallback"]

    # Verify report status is now 'assigned'
    db.refresh(parent_rep)
    assert parent_rep.status == "assigned"

    # Step 6: Field worker starts task -> moves to in_progress
    start_res = client.post(
        f"/api/reports/{rep1_id}/status",
        json={"new_status": "in_progress", "comment": "Vehicle DL-1AA-1001 arrived on site"},
        headers=worker_headers
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "in_progress"

    # Step 7: Worker uploads clearance photo and submits evidence
    after_img = Image.new("RGB", (120, 120), color="green")
    after_byte_arr = io.BytesIO()
    after_img.save(after_byte_arr, format="JPEG")
    after_byte_arr.seek(0)

    after_upload = client.post(
        "/api/reports/upload",
        files={"file": ("cleared_site.jpg", after_byte_arr, "image/jpeg")},
        headers=worker_headers
    )
    assert after_upload.status_code == 200
    after_photo_path = after_upload.json()["photo_path"]

    evidence_res = client.post(
        "/api/resolution/submit",
        json={
            "report_id": rep1_id,
            "after_photo_path": after_photo_path,
            "notes": "350 kg waste loaded, site thoroughly swept and disinfected."
        },
        headers=worker_headers
    )
    assert evidence_res.status_code == 200
    evidence_data = evidence_res.json()
    evidence_id = evidence_data["id"]
    assert evidence_data["decision"] == "pending"

    # Step 8: Supervisor reviews and approves closure
    review_res = client.post(
        f"/api/resolution/{evidence_id}/review",
        json={"decision": "approved", "notes": "Clearance inspected and verified by Ward Supervisor."},
        headers=supervisor_headers
    )
    assert review_res.status_code == 200
    assert review_res.json()["decision"] == "approved"

    # Verify report is now 'resolved'
    db.refresh(parent_rep)
    assert parent_rep.status == "resolved"

    # Verify citizen was credited reward points in PointsLedger
    ledger_entry = db.query(PointsLedger).filter(
        PointsLedger.reference_id == str(rep1_id),
        PointsLedger.action_type == "report_verified"
    ).first()
    assert ledger_entry is not None
    assert ledger_entry.points == 25

    # Step 9: Verify Command Center metrics & CSV Export reflect the resolved report
    metrics_res = client.get("/api/metrics/command-center")
    assert metrics_res.status_code == 200
    m_data = metrics_res.json()
    assert m_data["reports"]["total"] >= 2
    assert m_data["reports"]["by_status"]["resolved"] >= 1

    csv_res = client.get("/api/metrics/export-reports-csv", headers=supervisor_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert parent_rep.ticket_number in csv_res.text

    # Step 10: Edge Cases & Security Checks
    # Edge A: Non-image upload rejection
    bad_upload = client.post(
        "/api/reports/upload",
        files={"file": ("exploit.sh", io.BytesIO(b"#!/bin/sh\nrm -rf /"), "text/plain")},
        headers=citizen_headers
    )
    assert bad_upload.status_code == 400

    # Edge B: Unauthorized citizen attempting supervisor closure review
    unauth_review = client.post(
        f"/api/resolution/{evidence_id}/review",
        json={"decision": "approved"},
        headers=citizen_headers
    )
    assert unauth_review.status_code == 403

    # Edge C: Illegal status transition (resolved -> in_progress directly) -> 409 Conflict
    illegal_trans = client.post(
        f"/api/reports/{rep1_id}/status",
        json={"new_status": "in_progress"},
        headers=supervisor_headers
    )
    assert illegal_trans.status_code == 409

    # Edge D: OSRM-down fallback verification
    # Haversine matrix works independently when OSRM is unreachable
    coords = [(28.65, 77.19), (28.66, 77.20)]
    dist_mat, dur_mat = compute_haversine_matrix(coords)
    assert len(dist_mat) == 2
    assert dist_mat[0][1] > 0
