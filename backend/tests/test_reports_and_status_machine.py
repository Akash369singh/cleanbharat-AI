import pytest
from backend.app.models.report import Report

def test_create_report_endpoint(client, citizen_headers):
    payload = {
        "category": "plastic_waste",
        "description": "Discarded plastic bottles and food packaging scattered along pathway",
        "lat": 28.6400,
        "lng": 77.2100,
        "address_text": "Connaught Place Radial Road"
    }
    response = client.post("/api/reports", json=payload, headers=citizen_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["ticket_number"].startswith("CB-")
    assert data["status"] == "submitted"
    assert data["source"] in ["rules_fallback", "model"]
    assert data["waste_type"] == "plastic"
    assert data["priority_score"] > 0
    assert data["priority_breakdown"] is not None

def test_valid_status_transitions(client, supervisor_headers, db):
    # Find a submitted report
    rep = db.query(Report).filter(Report.status == "submitted").first()
    assert rep is not None

    # 1. submitted -> verified (Allowed)
    res1 = client.post(f"/api/reports/{rep.id}/status", json={"new_status": "verified"}, headers=supervisor_headers)
    assert res1.status_code == 200
    assert res1.json()["status"] == "verified"

    # 2. verified -> assigned (Allowed)
    res2 = client.post(f"/api/reports/{rep.id}/status", json={"new_status": "assigned"}, headers=supervisor_headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == "assigned"

    # 3. assigned -> in_progress (Allowed)
    res3 = client.post(f"/api/reports/{rep.id}/status", json={"new_status": "in_progress"}, headers=supervisor_headers)
    assert res3.status_code == 200
    assert res3.json()["status"] == "in_progress"

def test_invalid_status_transition_conflict(client, supervisor_headers, db):
    # Create or find a submitted report
    rep = db.query(Report).filter(Report.status == "submitted").first()
    assert rep is not None

    # submitted -> in_progress directly is ILLEGAL (must go through verification/assignment)
    # Expected: 409 Conflict
    res = client.post(f"/api/reports/{rep.id}/status", json={"new_status": "in_progress"}, headers=supervisor_headers)
    assert res.status_code == 409
    assert "Invalid status transition" in res.json()["detail"]

def test_role_authorization_on_supervisor_endpoint(client, citizen_headers, db):
    # Citizen trying to approve status transition
    rep = db.query(Report).first()
    res = client.post(f"/api/reports/{rep.id}/status", json={"new_status": "verified"}, headers=citizen_headers)
    # Citizen should be rejected with 403 Forbidden
    assert res.status_code == 403
