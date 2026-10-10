from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_kpi_summary_endpoint():
    response = client.get("/api/metrics/kpi-summary")
    assert response.status_code == 200
    data = response.json()
    assert "open_reports" in data
    assert "critical_open" in data
    assert "sla_overdue" in data
    assert "mean_resolution_hours" in data
    assert "points_awarded" in data
    assert isinstance(data["open_reports"]["value"], int)
    assert len(data["open_reports"]["sparkline"]) == 7
    assert "tooltip" in data["open_reports"]

def test_analytics_series_endpoint():
    response = client.get("/api/metrics/analytics-series?days=14")
    assert response.status_code == 200
    data = response.json()
    assert "daily_created_vs_resolved" in data
    assert len(data["daily_created_vs_resolved"]) == 14
    assert "category_mix" in data
    assert "ward_comparison" in data
    assert "resolution_distribution" in data

def test_activity_feed_endpoint():
    response = client.get("/api/metrics/activity-feed?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first = data[0]
        assert "ticket_number" in first
        assert "action" in first
        assert "actor_name" in first
        assert "timestamp" in first

def test_notifications_endpoint():
    response = client.get("/api/metrics/notifications")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Check that smart bin alerts carry simulated badge if present
    for n in data:
        if n["type"] == "smart_bin_alert":
            assert n.get("badge") == "SIMULATED"

def test_global_search_endpoint():
    response = client.get("/api/metrics/search?q=karol")
    assert response.status_code == 200
    data = response.json()
    assert "reports" in data
    assert "wards" in data
    assert "actions" in data

def test_wards_geojson_endpoint():
    response = client.get("/api/metrics/wards-geojson")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 3
    first_feat = data["features"][0]
    assert "properties" in first_feat
    assert "density_color" in first_feat["properties"]
    assert "open_reports" in first_feat["properties"]

def test_chart_csv_export():
    response = client.get("/api/metrics/export-chart-csv/created_vs_resolved")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    content = response.text
    assert "Date,Reports Created,Reports Resolved" in content
