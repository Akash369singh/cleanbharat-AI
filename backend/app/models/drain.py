from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class DrainInspection(Base):
    __tablename__ = "drain_inspections"

    id = Column(Integer, primary_key=True, index=True)
    drain_code_or_landmark = Column(String(150), nullable=False)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    
    obstruction_level = Column(String(50), default="medium")  # low, medium, high, critical
    repeat_incident_count = Column(Integer, default=1)
    
    # Transparency rule: Label risk as estimate, rainfall only if real provider
    rainfall_risk_estimate = Column(String(100), default="Estimated: Moderate risk based on obstruction")
    rainfall_source = Column(String(50), default="not_configured")  # not_configured, weather_api
    
    inspection_status = Column(String(50), default="pending")  # pending, scheduled, completed
    assigned_inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    inspection_date = Column(DateTime, nullable=True)
    findings = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ward = relationship("Ward")
    report = relationship("Report")
    inspector = relationship("User", foreign_keys=[assigned_inspector_id])
