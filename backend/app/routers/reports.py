import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.user import User, Ward
from backend.app.models.report import Report, ReportEvent
from backend.app.schemas.schemas import ReportCreate, ReportOut, StatusTransitionIn, ReportEventOut
from backend.app.core.auth import get_current_user, get_optional_user, require_roles
from backend.app.core.file_storage import save_and_sanitize_image
from backend.app.services.ai_classifier import get_classifier
from backend.app.services.priority_engine import calculate_priority_score
from backend.app.services.clustering import find_duplicate_cluster, link_duplicate_report

router = APIRouter(prefix="/reports", tags=["Reports"])

VALID_TRANSITIONS = {
    "submitted": ["verified", "rejected"],
    "verified": ["assigned", "rejected"],
    "assigned": ["in_progress", "verified"],
    "in_progress": ["resolved", "assigned"],
    "resolved": [],
    "rejected": ["submitted"]  # Admin reopening
}

@router.post("/upload")
def upload_report_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Secure photo upload endpoint with size check (max 5MB), magic-byte verification,
    and automatic EXIF GPS coordinate stripping for citizen privacy.
    """
    relative_path = save_and_sanitize_image(file, subfolder="reports")
    return {"photo_path": relative_path, "status": "sanitized_and_saved"}

@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Creates a new citizen civic report:
    1. Runs AI waste intelligence (or transparent rules_fallback)
    2. Runs spatial-temporal duplicate clustering (links to cluster if duplicate found)
    3. Calculates explainable multi-factor priority score
    4. Computes SLA deadline and records audit event in ReportEvent
    """
    # 1. AI Waste classification
    classifier = get_classifier()
    ai_result = classifier.classify(report_in.description, report_in.category)

    # 2. SLA target calculation (12h for drains/hazard, 24h standard)
    sla_hours = 12 if (ai_result.get("is_drain_obstruction") or report_in.category in ["drain_clog", "hazardous_waste"]) else 24
    now = datetime.utcnow()
    sla_due = now + timedelta(hours=sla_hours)

    # 3. Calculate initial priority score
    priority_calc = calculate_priority_score(
        category=report_in.category,
        created_at=now,
        is_overflow=ai_result.get("is_overflow", False),
        is_drain_obstruction=ai_result.get("is_drain_obstruction", False),
        description=report_in.description,
        duplicate_count=0,
        db=db
    )

    # Generate unique ticket number
    ticket = f"CB-{uuid.uuid4().hex[:6].upper()}"

    # Auto-resolve ward if not explicitly supplied
    ward_id = report_in.ward_id
    if not ward_id:
        first_ward = db.query(Ward).first()
        ward_id = first_ward.id if first_ward else None

    new_report = Report(
        ticket_number=ticket,
        category=report_in.category,
        waste_type=ai_result.get("waste_type", "mixed_other"),
        description=report_in.description,
        lat=report_in.lat,
        lng=report_in.lng,
        address_text=report_in.address_text,
        photo_path=report_in.photo_path,
        status="submitted",
        priority_score=priority_calc["score"],
        priority_breakdown=priority_calc["breakdown"],
        ai_result=ai_result,
        sla_due_at=sla_due,
        source=ai_result.get("source", "rules_fallback"),
        citizen_id=current_user.id if current_user else None,
        ward_id=ward_id,
        seed_demo=False
    )
    db.add(new_report)
    db.flush()

    # 4. Check for duplicate cluster in vicinity
    cluster_parent = find_duplicate_cluster(
        db=db,
        lat=report_in.lat,
        lng=report_in.lng,
        category=report_in.category,
        exclude_report_id=new_report.id
    )
    if cluster_parent:
        link_duplicate_report(db, new_report, cluster_parent)

    # 5. Audit event log
    event = ReportEvent(
        report_id=new_report.id,
        actor_id=current_user.id if current_user else None,
        event_type="status_change",
        old_status=None,
        new_status="submitted",
        comment=f"Report submitted via Clean Bharat portal. AI classification: {ai_result.get('waste_type')}",
        metadata_json={"source": ai_result.get("source"), "cluster_id": new_report.cluster_id}
    )
    db.add(event)
    db.commit()
    db.refresh(new_report)

    return new_report

@router.get("", response_model=List[ReportOut])
def list_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    ward_id: Optional[int] = None,
    cluster_only: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == status_filter)
    if category:
        query = query.filter(Report.category == category)
    if ward_id:
        query = query.filter(Report.ward_id == ward_id)
    if cluster_only:
        query = query.filter(Report.is_cluster_parent == True)

    return query.order_by(desc(Report.priority_score)).all()

@router.get("/my", response_model=List[ReportOut])
def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Report).filter(Report.citizen_id == current_user.id).order_by(desc(Report.created_at)).all()

@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report

@router.get("/{report_id}/events", response_model=List[ReportEventOut])
def get_report_events(report_id: int, db: Session = Depends(get_db)):
    events = db.query(ReportEvent).filter(ReportEvent.report_id == report_id).order_by(ReportEvent.created_at.asc()).all()
    return events

@router.post("/{report_id}/status", response_model=ReportOut)
def transition_report_status(
    report_id: int,
    transition_in: StatusTransitionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("supervisor", "admin", "worker"))
):
    """
    Enforces strict server-side status state machine:
    submitted -> verified -> assigned -> in_progress -> resolved (or rejected)
    Returns HTTP 409 Conflict if transition is illegal.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    old_status = report.status
    target = transition_in.new_status.lower()

    allowed = VALID_TRANSITIONS.get(old_status, [])
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invalid status transition: cannot change report status from '{old_status}' to '{target}'. Allowed transitions: {allowed}"
        )

    # Resolution transition can only occur through supervisor verification workflow
    if target == "resolved" and current_user.role not in ["supervisor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resolution closure requires supervisor or administrator sign-off"
        )

    report.status = target
    report.updated_at = datetime.utcnow()

    event = ReportEvent(
        report_id=report.id,
        actor_id=current_user.id,
        event_type="status_change",
        old_status=old_status,
        new_status=target,
        comment=transition_in.comment or f"Status updated to {target} by {current_user.full_name} ({current_user.role})",
        metadata_json={"changed_by_role": current_user.role}
    )
    db.add(event)
    db.commit()
    db.refresh(report)

    return report
