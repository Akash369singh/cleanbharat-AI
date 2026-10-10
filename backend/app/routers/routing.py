import uuid
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.routing import Depot, Vehicle, Route, RouteStop, Assignment
from backend.app.models.report import Report, ReportEvent
from backend.app.schemas.schemas import VehicleOut, DepotOut, RouteOut, RouteOptimizeIn
from backend.app.core.auth import get_current_user, require_roles
from backend.app.services.route_optimizer import optimize_route

router = APIRouter(prefix="/routing", tags=["Routing & Fleet"])

@router.get("/depots", response_model=List[DepotOut])
def list_depots(db: Session = Depends(get_db)):
    return db.query(Depot).all()

@router.get("/vehicles", response_model=List[VehicleOut])
def list_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).all()

@router.get("/routes", response_model=List[RouteOut])
def list_routes(db: Session = Depends(get_db)):
    return db.query(Route).order_by(desc(Route.created_at)).all()

@router.get("/routes/{route_id}", response_model=RouteOut)
def get_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    return route

@router.post("/optimize", response_model=Dict[str, Any])
def optimize_collection_route(
    optimize_in: RouteOptimizeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("supervisor", "admin"))
):
    """
    Optimizes a multi-point sanitation vehicle route using Google OR-Tools (with 2-opt fallback)
    and OSRM road matrix (with Haversine fallback).
    Always persists both Baseline and Optimised metrics.
    """
    vehicle = db.query(Vehicle).filter(Vehicle.id == optimize_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    depot = db.query(Depot).filter(Depot.id == optimize_in.depot_id).first()
    if not depot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Depot not found")

    reports = db.query(Report).filter(Report.id.in_(optimize_in.report_ids)).all()
    if not reports:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid reports provided for routing")

    stops_input = []
    for r in reports:
        stops_input.append({
            "report_id": r.id,
            "ticket_number": r.ticket_number,
            "lat": r.lat,
            "lng": r.lng,
            "demand_kg": 50.0,
            "category": r.category,
            "priority_score": r.priority_score
        })

    # Run solver
    optimization_result = optimize_route(
        depot_coord=(depot.lat, depot.lng),
        stops=stops_input,
        vehicle_capacity_kg=vehicle.capacity_kg
    )

    date_str = optimize_in.date_str or datetime.utcnow().strftime("%Y-%m-%d")
    route_code = f"RT-{uuid.uuid4().hex[:6].upper()}"

    # Persist Route
    route = Route(
        route_code=route_code,
        vehicle_id=vehicle.id,
        depot_id=depot.id,
        date=date_str,
        status="planned",
        total_distance_meters=optimization_result["optimised"]["distance_meters"],
        total_duration_seconds=optimization_result["optimised"]["duration_seconds"],
        baseline_distance_meters=optimization_result["baseline"]["distance_meters"],
        baseline_duration_seconds=optimization_result["baseline"]["duration_seconds"],
        routing_source=optimization_result["routing_source"],
        solver_used=optimization_result["solver_used"],
        seed_demo=False
    )
    db.add(route)
    db.flush()

    # Persist RouteStops and link reports
    for stop_data in optimization_result["ordered_stops"]:
        rs = RouteStop(
            route_id=route.id,
            stop_order=stop_data["stop_order"],
            report_id=stop_data["report_id"],
            stop_type="report",
            lat=stop_data["lat"],
            lng=stop_data["lng"],
            estimated_waste_kg=stop_data["demand_kg"],
            status="pending"
        )
        db.add(rs)
        db.flush()

        # Update report status to assigned if currently verified or submitted
        rep = db.query(Report).filter(Report.id == stop_data["report_id"]).first()
        if rep:
            old_st = rep.status
            rep.status = "assigned"
            db.add(ReportEvent(
                report_id=rep.id,
                actor_id=current_user.id,
                event_type="assigned",
                old_status=old_st,
                new_status="assigned",
                comment=f"Assigned to Route #{route.route_code} (Vehicle: {vehicle.registration_number})"
            ))

    db.commit()

    return {
        "route_id": route.id,
        "route_code": route.route_code,
        "optimization": optimization_result
    }
