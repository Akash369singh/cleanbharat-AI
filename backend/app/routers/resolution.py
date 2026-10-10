from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.report import Report, ReportEvent
from backend.app.models.resolution import ResolutionEvidence
from backend.app.models.engagement import PointsLedger
from backend.app.schemas.schemas import ResolutionEvidenceCreate, ResolutionReviewIn, ResolutionEvidenceOut
from backend.app.core.auth import get_current_user, require_roles

router = APIRouter(prefix="/resolution", tags=["Resolution Verification"])

@router.post("/submit", response_model=ResolutionEvidenceOut)
def submit_resolution_evidence(
    evidence_in: ResolutionEvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("worker", "supervisor", "admin"))
):
    """
    Submits after-cleanup photographic proof.
    Enforces honest protocol: no automated AI cleanup confirmation claims are made;
    closure requires formal human supervisor review.
    """
    report = db.query(Report).filter(Report.id == evidence_in.report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if report.status not in ["assigned", "in_progress"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit resolution evidence for report currently in '{report.status}' state"
        )

    # Check for existing evidence
    evidence = db.query(ResolutionEvidence).filter(ResolutionEvidence.report_id == report.id).first()
    if not evidence:
        evidence = ResolutionEvidence(
            report_id=report.id,
            before_photo_path=report.photo_path,
            after_photo_path=evidence_in.after_photo_path,
            worker_id=current_user.id,
            decision="pending",
            notes=evidence_in.notes,
            submitted_at=datetime.utcnow(),
            seed_demo=False
        )
        db.add(evidence)
    else:
        evidence.after_photo_path = evidence_in.after_photo_path
        evidence.worker_id = current_user.id
        evidence.decision = "pending"
        evidence.notes = evidence_in.notes
        evidence.submitted_at = datetime.utcnow()

    # Move report to in_progress if not already
    report.status = "in_progress"
    db.add(ReportEvent(
        report_id=report.id,
        actor_id=current_user.id,
        event_type="evidence_submitted",
        old_status=report.status,
        new_status="in_progress",
        comment=f"Worker {current_user.full_name} uploaded completion evidence. Awaiting supervisor inspection."
    ))

    db.commit()
    db.refresh(evidence)
    return evidence

@router.get("/queue", response_model=List[ResolutionEvidenceOut])
def list_pending_verification_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("supervisor", "admin"))
):
    """Lists pending cleanup resolutions awaiting supervisor sign-off."""
    return db.query(ResolutionEvidence).filter(ResolutionEvidence.decision == "pending").order_by(desc(ResolutionEvidence.submitted_at)).all()

@router.post("/{evidence_id}/review", response_model=ResolutionEvidenceOut)
def review_resolution_evidence(
    evidence_id: int,
    review_in: ResolutionReviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("supervisor", "admin"))
):
    """
    Supervisor or Administrator verification review:
    - On approval: sets status='resolved', records audit trail, and credits citizen points.
    - On rejection: records rejection reason and keeps report in_progress.
    """
    evidence = db.query(ResolutionEvidence).filter(ResolutionEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resolution evidence record not found")

    report = db.query(Report).filter(Report.id == evidence.report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated report not found")

    decision = review_in.decision.lower()
    if decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Decision must be 'approved' or 'rejected'")

    evidence.decision = decision
    evidence.reviewer_id = current_user.id
    evidence.reviewed_at = datetime.utcnow()
    evidence.rejection_reason = review_in.rejection_reason if decision == "rejected" else None

    if decision == "approved":
        report.status = "resolved"
        report.updated_at = datetime.utcnow()

        db.add(ReportEvent(
            report_id=report.id,
            actor_id=current_user.id,
            event_type="closure_approved",
            old_status="in_progress",
            new_status="resolved",
            comment=f"Supervisor {current_user.full_name} confirmed resolution. Photographic evidence verified.",
            metadata_json={"reviewer_id": current_user.id, "notes": review_in.notes}
        ))

        # Reward citizen reporting points (idempotent ledger entry)
        if report.citizen_id:
            citizen = db.query(User).filter(User.id == report.citizen_id).first()
            if citizen:
                idemp_key = f"report_verified:{report.id}:{citizen.id}"
                existing_entry = db.query(PointsLedger).filter(PointsLedger.idempotency_key == idemp_key).first()
                if not existing_entry:
                    db.add(PointsLedger(
                        user_id=citizen.id,
                        action_type="report_verified",
                        points=25,
                        reference_id=str(report.id),
                        idempotency_key=idemp_key,
                        date_str=datetime.utcnow().strftime("%Y-%m-%d")
                    ))
                    citizen.points_balance += 25

    else:
        # Rejected
        db.add(ReportEvent(
            report_id=report.id,
            actor_id=current_user.id,
            event_type="closure_rejected",
            old_status="in_progress",
            new_status="in_progress",
            comment=f"Supervisor {current_user.full_name} rejected resolution. Reason: {review_in.rejection_reason or 'Incomplete clearing'}",
            metadata_json={"reviewer_id": current_user.id, "reason": review_in.rejection_reason}
        ))

    db.commit()
    db.refresh(evidence)
    return evidence
