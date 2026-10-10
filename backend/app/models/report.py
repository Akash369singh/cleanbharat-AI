from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, index=True, nullable=False)
    category = Column(String(100), nullable=False)  # garbage_dump, overflowing_bin, drain_clog, plastic_waste, etc.
    waste_type = Column(String(100), nullable=False, default="mixed_other")  # organic, plastic, paper, metal, glass, e-waste, mixed_other
    description = Column(Text, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    address_text = Column(String(255), nullable=True)
    photo_path = Column(String(255), nullable=True)
    
    # Status Machine: submitted -> verified -> assigned -> in_progress -> resolved (or rejected)
    status = Column(String(50), nullable=False, default="submitted", index=True)
    
    priority_score = Column(Float, default=1.0)
    priority_breakdown = Column(JSON, nullable=True)
    ai_result = Column(JSON, nullable=True)
    
    # Duplicate clustering
    cluster_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    is_cluster_parent = Column(Boolean, default=False)
    duplicate_count = Column(Integer, default=0)
    
    # SLA & Source Transparency
    sla_due_at = Column(DateTime, nullable=True)
    source = Column(String(50), default="rules_fallback")  # model, rules_fallback, simulated, seed_demo
    seed_demo = Column(Boolean, default=False)
    
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    citizen = relationship("User", foreign_keys=[citizen_id], back_populates="reports")
    ward = relationship("Ward", back_populates="reports")
    events = relationship("ReportEvent", back_populates="report", cascade="all, delete-orphan")
    resolution_evidence = relationship("ResolutionEvidence", back_populates="report", uselist=False, cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="report", cascade="all, delete-orphan")
    cluster_children = relationship("Report", backref="cluster_parent", remote_side=[id])

class ReportEvent(Base):
    __tablename__ = "report_events"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String(50), nullable=False)  # status_change, priority_update, cluster_linked, verification, etc.
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    comment = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="events")
    actor = relationship("User", back_populates="events")
