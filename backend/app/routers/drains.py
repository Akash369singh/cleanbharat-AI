from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.drain import DrainInspection
from backend.app.core.auth import get_current_user, require_roles
from backend.app.services.drain_analyzer import analyze_drain_hotspots

router = APIRouter(prefix="/drains", tags=["DrainGuard"])

@router.get("/hotspots", response_model=Dict[str, Any])
def get_drain_hotspots(db: Session = Depends(get_db)):
    """
    DrainGuard repeat-incident hotspot analytics.
    Strictly flags rainfall data as 'not configured' if no weather API is connected,
    and labels flood risk strictly as an estimate.
    """
    return analyze_drain_hotspots(db)

@router.get("/inspections", response_model=List[Dict[str, Any]])
def list_drain_inspections(db: Session = Depends(get_db)):
    inspections = db.query(DrainInspection).order_by(desc(DrainInspection.created_at)).all()
    results = []
    for insp in inspections:
        results.append({
            "id": insp.id,
            "drain_code_or_landmark": insp.drain_code_or_landmark,
            "ward_id": insp.ward_id,
            "ward_name": insp.ward.name if insp.ward else "Ward",
            "lat": insp.lat,
            "lng": insp.lng,
            "obstruction_level": insp.obstruction_level,
            "repeat_incident_count": insp.repeat_incident_count,
            "rainfall_risk_estimate": insp.rainfall_risk_estimate,
            "rainfall_source": insp.rainfall_source,
            "inspection_status": insp.inspection_status,
            "findings": insp.findings,
            "recommended_action": insp.recommended_action,
            "inspector_name": insp.inspector.full_name if insp.inspector else "Unassigned",
            "created_at": insp.created_at
        })
    return results

@router.post("/inspections")
def create_drain_inspection(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("supervisor", "admin"))
):
    insp = DrainInspection(
        drain_code_or_landmark=data.get("drain_code_or_landmark", "Drain Culvert"),
        ward_id=data.get("ward_id", 1),
        lat=float(data.get("lat", 28.6139)),
        lng=float(data.get("lng", 77.2090)),
        obstruction_level=data.get("obstruction_level", "medium"),
        repeat_incident_count=int(data.get("repeat_incident_count", 1)),
        rainfall_risk_estimate="Estimated: Moderate obstruction risk",
        rainfall_source="not_configured",
        inspection_status="pending",
        assigned_inspector_id=data.get("assigned_inspector_id"),
        recommended_action=data.get("recommended_action", "Clear blockage and inspect silt levels"),
        seed_demo=False
    )
    db.add(insp)
    db.commit()
    db.refresh(insp)
    return {"id": insp.id, "status": "created"}
