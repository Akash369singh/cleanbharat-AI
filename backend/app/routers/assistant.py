from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.services.assistant_intent import handle_assistant_query

router = APIRouter(prefix="/assistant", tags=["Assistant"])

class AssistantQueryIn(BaseModel):
    query: str

@router.post("/query")
def ask_assistant(
    payload: AssistantQueryIn,
    db: Session = Depends(get_db)
):
    """
    Assistant query interface:
    Handles questions regarding report counts, SLAs, top priority issues, and explainable scoring.
    Uses deterministic local database queries; clearly discloses execution mode.
    """
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query cannot be empty")

    response = handle_assistant_query(payload.query, db)
    return response
