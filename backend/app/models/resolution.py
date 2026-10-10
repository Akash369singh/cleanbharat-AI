from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ResolutionEvidence(Base):
    __tablename__ = "resolution_evidences"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, unique=True, index=True)
    before_photo_path = Column(String(255), nullable=True)
    after_photo_path = Column(String(255), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    decision = Column(String(50), default="pending")  # pending, approved, rejected
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    seed_demo = Column(Boolean, default=False)

    report = relationship("Report", back_populates="resolution_evidence")
    worker = relationship("User", foreign_keys=[worker_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
