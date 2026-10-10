from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import Ward
from backend.app.schemas.schemas import WardOut

router = APIRouter(prefix="/wards", tags=["Wards"])

@router.get("", response_model=List[WardOut])
def list_wards(db: Session = Depends(get_db)):
    return db.query(Ward).all()

@router.get("/{ward_id}", response_model=WardOut)
def get_ward(ward_id: int, db: Session = Depends(get_db)):
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ward not found")
    return ward
