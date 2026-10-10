from backend.app.config import settings

def test_iot_simulate_marks_simulated(client):
    res = client.post("/api/iot/simulate")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "simulation_executed"
    for r in data["readings"]:
        assert r["simulated"] is True
        assert r["source"] == "simulated"

def test_iot_hardware_webhook_with_api_key(client):
    payload = {
        "bin_code": "BIN-ESP32-HARDWARE-01",
        "fill_level_percent": 88.5,
        "raw_distance_cm": 11.5,
        "battery_level": 94.0
    }
    # 1. Reject without API key
    res_no_key = client.post("/api/iot/readings", json=payload)
    assert res_no_key.status_code == 401

    # 2. Accept with valid key
    res_valid = client.post(
        "/api/iot/readings",
        json=payload,
        headers={"X-API-Key": settings.IOT_API_KEY}
    )
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert data["simulated"] is False
    assert data["source"] == "hardware_webhook"

def test_quiz_answer_evaluation_and_points(client, citizen_headers):
    # Fetch questions
    q_res = client.get("/api/engagement/quiz")
    assert q_res.status_code == 200
    questions = q_res.json()
    assert len(questions) > 0

    first_q = questions[0]
    # First question is "Which bin color is designated under Swachh Bharat guidelines for Wet / Biodegradable Waste?"
    # Correct index is 0 (Green Bin)
    submit_res = client.post(
        "/api/engagement/quiz/submit",
        json={"question_id": first_q["id"], "selected_option_index": 0},
        headers=citizen_headers
    )
    assert submit_res.status_code == 200
    sub_data = submit_res.json()
    assert sub_data["is_correct"] is True
    assert sub_data["points_earned"] > 0
