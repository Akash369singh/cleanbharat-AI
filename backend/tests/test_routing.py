from backend.app.services.route_optimizer import optimize_route, solve_2opt_fallback
from backend.app.services.osrm_client import compute_haversine_matrix

def test_haversine_matrix_fallback():
    coords = [(28.6350, 77.2200), (28.6530, 77.1915), (28.6325, 77.2185)]
    distances, durations = compute_haversine_matrix(coords)
    assert len(distances) == 3
    assert distances[0][0] == 0.0
    assert distances[0][1] > 0.0
    assert durations[0][1] > 0.0

def test_route_optimization_and_baseline_comparison():
    depot = (28.6350, 77.2200)
    stops = [
        {"lat": 28.6530, "lng": 77.1915, "demand_kg": 150.0, "id": 1},
        {"lat": 28.6510, "lng": 77.1880, "demand_kg": 200.0, "id": 2},
        {"lat": 28.6325, "lng": 77.2185, "demand_kg": 100.0, "id": 3},
    ]
    res = optimize_route(depot_coord=depot, stops=stops, vehicle_capacity_kg=1500.0)

    assert "baseline" in res
    assert "optimised" in res
    assert "savings" in res
    assert res["baseline"]["distance_meters"] > 0
    assert res["optimised"]["distance_meters"] > 0
    assert res["metrics"]["total_stops"] == 3
    assert res["metrics"]["total_waste_kg"] == 450.0
    assert res["solver_used"] in ["ortools", "2opt_fallback"]
    assert res["routing_source"] in ["osrm", "haversine_fallback"]

def test_2opt_capacity_respect():
    # Matrix with 4 nodes: 0 (depot), 1, 2, 3
    coords = [(28.63, 77.22), (28.64, 77.23), (28.65, 77.24), (28.66, 77.25)]
    distances, _ = compute_haversine_matrix(coords)
    demands = [0.0, 500.0, 600.0, 700.0]
    
    # Capacity is 1200kg -> cannot take all 3 (sum is 1800kg)
    route = solve_2opt_fallback(distances, demands, capacity=1200.0)
    # Must start and end at depot (0)
    assert route[0] == 0
    assert route[-1] == 0
    
    # Calculate load on route
    load = sum(demands[node] for node in route)
    assert load <= 1200.0
