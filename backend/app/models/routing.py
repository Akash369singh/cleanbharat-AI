from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Depot(Base):
    __tablename__ = "depots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    capacity_vehicles = Column(Integer, default=10)
    address = Column(String(255), nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicles = relationship("Vehicle", back_populates="depot")
    routes = relationship("Route", back_populates="depot")

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String(50), unique=True, nullable=False, index=True)
    vehicle_type = Column(String(50), default="tipper_truck")  # tipper_truck, compactor, e_rickshaw, auto_tipper
    capacity_kg = Column(Float, default=1500.0)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    status = Column(String(50), default="idle")  # idle, on_route, maintenance
    fuel_type = Column(String(50), default="Electric")  # Electric, CNG, Diesel
    driver_name = Column(String(100), default="Ramesh Kumar")
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=True)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    depot = relationship("Depot", back_populates="vehicles")
    routes = relationship("Route", back_populates="vehicle")
    assignments = relationship("Assignment", back_populates="vehicle")

class CollectionPoint(Base):
    __tablename__ = "collection_points"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    point_type = Column(String(50), default="community_dump")  # community_dump, transfer_station, market_point
    capacity_kg = Column(Float, default=2000.0)
    current_load_kg = Column(Float, default=500.0)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route_code = Column(String(50), unique=True, index=True, nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    status = Column(String(50), default="planned")  # planned, in_progress, completed, cancelled
    
    # Distance / Duration comparison (Baseline vs Optimised)
    total_distance_meters = Column(Float, default=0.0)
    total_duration_seconds = Column(Float, default=0.0)
    baseline_distance_meters = Column(Float, default=0.0)
    baseline_duration_seconds = Column(Float, default=0.0)
    
    # Transparency flags
    routing_source = Column(String(50), default="osrm")  # osrm, haversine_fallback
    solver_used = Column(String(50), default="ortools")  # ortools, 2opt_fallback
    geometry_geojson = Column(JSON, nullable=True)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="routes")
    depot = relationship("Depot", back_populates="routes")
    stops = relationship("RouteStop", back_populates="route", cascade="all, delete-orphan", order_by="RouteStop.stop_order")

class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    stop_order = Column(Integer, nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    collection_point_id = Column(Integer, ForeignKey("collection_points.id"), nullable=True)
    stop_type = Column(String(50), default="report")  # depot_start, report, collection_point, depot_end
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    estimated_waste_kg = Column(Float, default=50.0)
    status = Column(String(50), default="pending")  # pending, completed, skipped
    arrival_time = Column(DateTime, nullable=True)
    departure_time = Column(DateTime, nullable=True)

    route = relationship("Route", back_populates="stops")
    report = relationship("Report")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    route_stop_id = Column(Integer, ForeignKey("route_stops.id"), nullable=True)
    status = Column(String(50), default="pending")  # pending, accepted, completed, cancelled
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    seed_demo = Column(Boolean, default=False)

    report = relationship("Report", back_populates="assignments")
    worker = relationship("User", foreign_keys=[worker_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    vehicle = relationship("Vehicle", back_populates="assignments")
