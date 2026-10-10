from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    zone = Column(String(100), default="Central")
    population = Column(Integer, default=50000)
    area_sq_km = Column(Float, default=5.0)
    center_lat = Column(Float, nullable=False, default=28.6139)
    center_lng = Column(Float, nullable=False, default=77.2090)
    contact_officer = Column(String(100), default="Ward Officer")
    contact_phone = Column(String(20), default="+91-11-23456789")
    boundary_geojson = Column(JSON, nullable=True)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="ward")
    reports = relationship("Report", back_populates="ward")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False, default="citizen")  # citizen, worker, supervisor, admin
    phone = Column(String(20), nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    points_balance = Column(Integer, default=0)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ward = relationship("Ward", back_populates="users")
    reports = relationship("Report", back_populates="citizen", foreign_keys="Report.citizen_id")
    events = relationship("ReportEvent", back_populates="actor")
