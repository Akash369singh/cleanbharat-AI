from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Bin(Base):
    __tablename__ = "bins"

    id = Column(Integer, primary_key=True, index=True)
    bin_code = Column(String(50), unique=True, nullable=False, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    bin_type = Column(String(50), default="dry_recyclable")  # organic, dry_recyclable, mixed
    capacity_liters = Column(Float, default=240.0)
    fill_level_percent = Column(Float, default=20.0)
    battery_level_percent = Column(Float, default=95.0)
    sensor_health = Column(String(50), default="healthy")  # healthy, degraded, offline
    status = Column(String(50), default="normal")  # normal, near_full, overflow
    last_reading_at = Column(DateTime, default=datetime.utcnow)
    
    # Transparency
    simulated = Column(Boolean, default=True)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ward = relationship("Ward")
    readings = relationship("BinReading", back_populates="bin", cascade="all, delete-orphan", order_by="desc(BinReading.reading_time)")

class BinReading(Base):
    __tablename__ = "bin_readings"

    id = Column(Integer, primary_key=True, index=True)
    bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False, index=True)
    fill_level_percent = Column(Float, nullable=False)
    battery_level_percent = Column(Float, default=90.0)
    raw_distance_cm = Column(Float, nullable=True)
    reading_time = Column(DateTime, default=datetime.utcnow)
    
    # Transparency rule: explicitly label simulated vs hardware_webhook
    simulated = Column(Boolean, default=True)
    source = Column(String(50), default="simulated")  # simulated, hardware_webhook
    seed_demo = Column(Boolean, default=False)

    bin = relationship("Bin", back_populates="readings")
