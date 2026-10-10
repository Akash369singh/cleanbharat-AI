from typing import List, Dict, Any, Tuple, Optional
import math
from backend.app.services.osrm_client import fetch_distance_duration_matrix

def solve_2opt_fallback(
    distance_matrix: List[List[float]],
    demands: List[float],
    capacity: float
) -> List[int]:
    """
    Deterministic Capacity-Constrained Nearest-Neighbour followed by 2-Opt TSP local search.
    Guarantees a valid, high-efficiency route order starting and ending at Depot (index 0).
    """
    n = len(distance_matrix)
    if n <= 1:
        return [0]
    if n == 2:
        return [0, 1, 0]

    unvisited = set(range(1, n))
    current = 0
    route = [0]
    current_load = 0.0

    # Nearest neighbour heuristic respecting capacity
    while unvisited:
        best_next = None
        best_dist = float("inf")
        for candidate in unvisited:
            if current_load + demands[candidate] <= capacity:
                d = distance_matrix[current][candidate]
                if d < best_dist:
                    best_dist = d
                    best_next = candidate

        if best_next is not None:
            route.append(best_next)
            current_load += demands[best_next]
            unvisited.remove(best_next)
            current = best_next
        else:
            # Capacity exceeded, must return to depot if more stops remain
            break

    route.append(0)  # Return to depot

    # 2-Opt optimization on the intermediate stops
    improved = True
    iterations = 0
    while improved and iterations < 100:
        improved = False
        iterations += 1
        for i in range(1, len(route) - 2):
            for j in range(i + 1, len(route) - 1):
                # Calculate change in distance
                d1 = distance_matrix[route[i - 1]][route[i]] + distance_matrix[route[j]][route[j + 1]]
                d2 = distance_matrix[route[i - 1]][route[j]] + distance_matrix[route[i]][route[j + 1]]
                if d2 < d1 - 1e-4:
                    # Reverse route segment from i to j
                    route[i : j + 1] = reversed(route[i : j + 1])
                    improved = True

    return route

def solve_with_ortools(
    distance_matrix: List[List[float]],
    demands: List[float],
    capacity: float
) -> Optional[List[int]]:
    """Solves Capacitated Vehicle Routing Problem (CVRP) using Google OR-Tools."""
    try:
        from ortools.constraint_solver import routing_enums_pb2
        from ortools.constraint_solver import pywrapcp

        n = len(distance_matrix)
        # Convert distances to integer meters for OR-Tools
        int_distance_matrix = [[int(d) for d in row] for row in distance_matrix]
        int_demands = [int(math.ceil(d)) for d in demands]
        int_capacity = int(math.floor(capacity))

        # Create routing manager: 1 vehicle, start & end at depot (index 0)
        manager = pywrapcp.RoutingIndexManager(n, 1, 0)
        routing = pywrapcp.RoutingModel(manager)

        # Distance callback
        def distance_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int_distance_matrix[from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Capacity callback & dimension
        def demand_callback(from_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            return int_demands[from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            [int_capacity],  # vehicle maximum capacities
            True,  # start cumul to zero
            "Capacity"
        )

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = 2

        solution = routing.SolveWithParameters(search_parameters)
        if solution:
            route = []
            index = routing.Start(0)
            while not routing.IsEnd(index):
                route.append(manager.IndexToNode(index))
                index = solution.Value(routing.NextVar(index))
            route.append(manager.IndexToNode(index))
            return route
    except Exception:
        pass
    return None

def optimize_route(
    depot_coord: Tuple[float, float],
    stops: List[Dict[str, Any]],  # each dict: {"lat": float, "lng": float, "demand_kg": float, ...}
    vehicle_capacity_kg: float
) -> Dict[str, Any]:
    """
    Optimizes a single or multi-stop vehicle collection route.
    Calculates both Baseline (unoptimized visit order) and Optimised route.
    Returns complete comparison metrics and stop ordering.
    """
    coords = [depot_coord] + [(s["lat"], s["lng"]) for s in stops]
    demands = [0.0] + [s.get("demand_kg", 50.0) for s in stops]

    dist_matrix, dur_matrix, routing_source = fetch_distance_duration_matrix(coords)

    # 1. Compute Baseline (sequential order: depot -> 1 -> 2 -> ... -> N -> depot)
    n = len(coords)
    baseline_order = list(range(n)) + [0]
    baseline_dist = 0.0
    baseline_dur = 0.0
    for i in range(len(baseline_order) - 1):
        u, v = baseline_order[i], baseline_order[i + 1]
        baseline_dist += dist_matrix[u][v]
        baseline_dur += dur_matrix[u][v]

    # 2. Optimize: Try OR-Tools first, fallback to 2-Opt
    optimized_order = solve_with_ortools(dist_matrix, demands, vehicle_capacity_kg)
    solver_used = "ortools"
    if not optimized_order:
        optimized_order = solve_2opt_fallback(dist_matrix, demands, vehicle_capacity_kg)
        solver_used = "2opt_fallback"

    # 3. Compute Optimised distance and duration
    optimized_dist = 0.0
    optimized_dur = 0.0
    for i in range(len(optimized_order) - 1):
        u, v = optimized_order[i], optimized_order[i + 1]
        optimized_dist += dist_matrix[u][v]
        optimized_dur += dur_matrix[u][v]

    # Savings calculation
    dist_saved = max(0.0, baseline_dist - optimized_dist)
    time_saved = max(0.0, baseline_dur - optimized_dur)
    pct_saved = round((dist_saved / baseline_dist * 100.0), 1) if baseline_dist > 0 else 0.0

    # Build ordered stop results (excluding depot start and end indices)
    ordered_stops = []
    total_waste_collected = 0.0
    for order_idx, node in enumerate(optimized_order[1:-1], start=1):
        stop_data = stops[node - 1].copy()
        stop_data["stop_order"] = order_idx
        total_waste_collected += stop_data.get("demand_kg", 50.0)
        ordered_stops.append(stop_data)

    return {
        "ordered_stops": ordered_stops,
        "stop_indices": optimized_order,
        "baseline": {
            "distance_meters": round(baseline_dist, 1),
            "distance_km": round(baseline_dist / 1000.0, 2),
            "duration_seconds": round(baseline_dur, 1),
            "duration_minutes": round(baseline_dur / 60.0, 1),
        },
        "optimised": {
            "distance_meters": round(optimized_dist, 1),
            "distance_km": round(optimized_dist / 1000.0, 2),
            "duration_seconds": round(optimized_dur, 1),
            "duration_minutes": round(optimized_dur / 60.0, 1),
        },
        "savings": {
            "distance_saved_km": round(dist_saved / 1000.0, 2),
            "time_saved_minutes": round(time_saved / 60.0, 1),
            "efficiency_gain_percent": pct_saved,
        },
        "metrics": {
            "total_stops": len(ordered_stops),
            "total_waste_kg": round(total_waste_collected, 1),
            "vehicle_capacity_kg": vehicle_capacity_kg,
            "capacity_utilization_percent": round((total_waste_collected / vehicle_capacity_kg * 100.0), 1) if vehicle_capacity_kg > 0 else 0.0
        },
        "routing_source": routing_source,  # "osrm" or "haversine_fallback"
        "solver_used": solver_used  # "ortools" or "2opt_fallback"
    }
