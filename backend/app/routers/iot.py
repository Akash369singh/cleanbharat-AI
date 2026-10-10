from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models.iot import Bin, BinReading
from backend.app.schemas.schemas import BinOut, HardwareReadingIn
from backend.app.services.smart_bin_simulator import generate_simulated_readings, ingest_hardware_reading

router = APIRouter(prefix="/iot", tags=["IoT & Smart Bins"])

@router.get("/bins", response_model=List[BinOut])
def list_bins(db: Session = Depends(get_db)):
    """
    Returns list of all municipal smart bins.
    Honesty Rule: Every bin clearly discloses whether it is simulated or physical hardware.
    """
    return db.query(Bin).order_by(desc(Bin.fill_level_percent)).all()

@router.post("/simulate")
def trigger_bin_simulation(
    bin_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    On-demand telemetry step generator for demo evaluation.
    Strictly flags all generated rows with simulated=True and source='simulated'.
    """
    results = generate_simulated_readings(db, bin_id=bin_id)
    return {
        "status": "simulation_executed",
        "updated_bins_count": len(results),
        "readings": results,
        "transparency_note": "All data generated via this endpoint is strictly labeled simulated=True."
    }

@router.post("/readings")
def receive_hardware_reading(
    payload: HardwareReadingIn,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
):
    """
    Authentic Hardware Ingestion Webhook for physical ESP32 + HC-SR04 ultrasonic sensor nodes.
    
    Header requirement:
      X-API-Key: must match IOT_API_KEY environment variable.
      
    Payload schema:
      {
        "bin_code": "BIN-CP-01",
        "fill_level_percent": 84.5,
        "raw_distance_cm": 15.5,
        "battery_level": 92.0
      }
      
    Honesty disclosure: Readings ingested via this endpoint are recorded with
    simulated=False and source='hardware_webhook'.
    """
    if not x_api_key or x_api_key != settings.IOT_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header for IoT telemetry webhook"
        )

    res = ingest_hardware_reading(
        db=db,
        bin_code=payload.bin_code,
        fill_level_percent=payload.fill_level_percent,
        raw_distance_cm=payload.raw_distance_cm,
        battery_level=payload.battery_level
    )
    return res
