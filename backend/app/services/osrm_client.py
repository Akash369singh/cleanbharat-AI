from typing import List, Tuple, Dict, Any
import httpx
from backend.app.config import settings
from backend.app.services.clustering import haversine_distance_meters

# Typical Indian urban collection speed for fallback: 22 km/h ≈ 6.11 m/s
URBAN_FALLBACK_SPEED_MPS = 6.11

def compute_haversine_matrix(coords: List[Tuple[float, float]]) -> Tuple[List[List[float]], List[List[float]]]:
    n = len(coords)
    distance_matrix: List[List[float]] = [[0.0] * n for _ in range(n)]
    duration_matrix: List[List[float]] = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            dist = haversine_distance_meters(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
            # Account for road circuity factor (Manhattan / urban road network typically ~1.3x Euclidean/Haversine)
            road_dist = dist * 1.3
            distance_matrix[i][j] = round(road_dist, 1)
            duration_matrix[i][j] = round(road_dist / URBAN_FALLBACK_SPEED_MPS, 1)

    return distance_matrix, duration_matrix

def fetch_distance_duration_matrix(coords: List[Tuple[float, float]]) -> Tuple[List[List[float]], List[List[float]], str]:
    """
    Attempts to fetch real road-network distance and duration matrix from OSRM.
    If unreachable, times out, or fails, transparently returns a calibrated Haversine fallback matrix.
    Returns: (distance_matrix_meters, duration_matrix_seconds, routing_source)
    """
    n = len(coords)
    if n <= 1:
        return [[0.0] * n for _ in range(n)], [[0.0] * n for _ in range(n)], "osrm"

    # Format for OSRM: {lon},{lat};{lon},{lat}...
    coord_str = ";".join(f"{lon},{lat}" for lat, lon in coords)
    url = f"{settings.OSRM_BASE_URL.rstrip('/')}/table/v1/driving/{coord_str}?annotations=distance,duration"

    try:
        with httpx.Client(timeout=settings.OSRM_TIMEOUT_SECONDS) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and "distances" in data and "durations" in data:
                    return data["distances"], data["durations"], "osrm"
    except Exception:
        # Expected fallback if OSRM is unreachable, offline, or times out
        pass

    distances, durations = compute_haversine_matrix(coords)
    return distances, durations, "haversine_fallback"
