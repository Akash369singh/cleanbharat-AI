import random
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.iot import Bin, BinReading

def generate_simulated_readings(db: Session, bin_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Simulates realistic urban sensor telemetry for smart municipal bins.
    Strictly flags all generated rows with simulated=True and source='simulated'.
    """
    query = db.query(Bin)
    if bin_id:
        query = query.filter(Bin.id == bin_id)
    bins = query.all()

    created_readings = []
    for b in bins:
        # Realistic drift: bins gradually fill up; occasionally get cleared
        current_fill = b.fill_level_percent or 20.0
        if current_fill >= 95.0:
            # Emptied cycle simulation
            new_fill = round(random.uniform(5.0, 15.0), 1)
        else:
            increment = round(random.uniform(5.0, 18.0), 1)
            new_fill = min(100.0, round(current_fill + increment, 1))

        # Battery slow decay simulation
        current_batt = b.battery_level_percent or 95.0
        new_batt = max(10.0, round(current_batt - random.uniform(0.1, 0.5), 1))

        # Raw distance from ultrasonic sensor (assuming 100cm depth bin)
        raw_dist = round(100.0 * (1.0 - (new_fill / 100.0)), 1)

        # Status thresholding
        if new_fill >= 90.0:
            status = "overflow"
        elif new_fill >= 75.0:
            status = "near_full"
        else:
            status = "normal"

        b.fill_level_percent = new_fill
        b.battery_level_percent = new_batt
        b.status = status
        b.last_reading_at = datetime.utcnow()
        b.simulated = True

        reading = BinReading(
            bin_id=b.id,
            fill_level_percent=new_fill,
            battery_level_percent=new_batt,
            raw_distance_cm=raw_dist,
            reading_time=datetime.utcnow(),
            simulated=True,
            source="simulated",
            seed_demo=b.seed_demo
        )
        db.add(reading)
        created_readings.append({
            "bin_code": b.bin_code,
            "fill_level_percent": new_fill,
            "status": status,
            "simulated": True,
            "source": "simulated"
        })

    db.commit()
    return created_readings

def ingest_hardware_reading(
    db: Session,
    bin_code: str,
    fill_level_percent: float,
    raw_distance_cm: Optional[float] = None,
    battery_level: Optional[float] = 95.0
) -> Dict[str, Any]:
    """
    Authentic IoT ingestion endpoint for physical ESP32 + Ultrasonic HC-SR04 microcontrollers.
    Explicitly marks source as 'hardware_webhook' and simulated as False.
    """
    bin_obj = db.query(Bin).filter(Bin.bin_code == bin_code).first()
    if not bin_obj:
        # Auto-register newly reporting hardware bin in Central Ward default
        bin_obj = Bin(
            bin_code=bin_code,
            lat=28.6139,
            lng=77.2090,
            bin_type="dry_recyclable",
            fill_level_percent=fill_level_percent,
            battery_level_percent=battery_level or 95.0,
            status="normal",
            simulated=False,
            seed_demo=False
        )
        db.add(bin_obj)
        db.flush()

    # Update bin state
    if fill_level_percent >= 90.0:
        status = "overflow"
    elif fill_level_percent >= 75.0:
        status = "near_full"
    else:
        status = "normal"

    bin_obj.fill_level_percent = fill_level_percent
    bin_obj.battery_level_percent = battery_level or bin_obj.battery_level_percent
    bin_obj.status = status
    bin_obj.last_reading_at = datetime.utcnow()
    bin_obj.simulated = False  # Hardware connected

    reading = BinReading(
        bin_id=bin_obj.id,
        fill_level_percent=fill_level_percent,
        battery_level_percent=battery_level or 95.0,
        raw_distance_cm=raw_distance_cm,
        reading_time=datetime.utcnow(),
        simulated=False,
        source="hardware_webhook",
        seed_demo=False
    )
    db.add(reading)
    db.commit()

    return {
        "bin_code": bin_obj.bin_code,
        "fill_level_percent": fill_level_percent,
        "status": status,
        "simulated": False,
        "source": "hardware_webhook"
    }
