from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.config_setting import ConfigSetting
from backend.app.schemas.schemas import ConfigSettingUpdate, SeedResetConfirm
from backend.app.core.auth import require_roles
from backend.app.services.seeder import seed_database, safe_reset_database

router = APIRouter(prefix="/admin", tags=["Admin & System Configuration"])

@router.get("/config")
def get_all_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin"))
):
    settings = db.query(ConfigSetting).all()
    return [{"id": s.id, "key": s.key, "value": s.value_json, "description": s.description} for s in settings]

@router.put("/config")
def update_config(
    update_in: ConfigSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin"))
):
    setting = db.query(ConfigSetting).filter(ConfigSetting.key == update_in.key).first()
    if not setting:
        setting = ConfigSetting(key=update_in.key, value_json=update_in.value_json)
        db.add(setting)
    else:
        setting.value_json = update_in.value_json
    db.commit()
    return {"status": "updated", "key": update_in.key, "value": update_in.value_json}

@router.post("/seed")
def seed_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin"))
):
    """Idempotently seeds realistic demo data flagged with seed_demo=True."""
    res = seed_database(db)
    return res

@router.post("/reset")
def safe_reset(
    payload: SeedResetConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin"))
):
    """
    Safely resets ONLY rows flagged with seed_demo=True.
    Requires explicit admin_confirmed: true in body.
    """
    res = safe_reset_database(db, admin_confirmed=payload.admin_confirmed)
    return res
