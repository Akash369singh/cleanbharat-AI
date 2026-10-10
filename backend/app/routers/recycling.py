from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.recycling import Recycler, RecyclableListing, PickupRequest
from backend.app.models.config_setting import ConfigSetting
from backend.app.schemas.schemas import ListingCreate, ListingOut, PickupRequestCreate, PickupRequestOut
from backend.app.core.auth import get_current_user

router = APIRouter(prefix="/recycling", tags=["RecycleConnect"])

@router.get("/rate-card")
def get_rate_card(db: Session = Depends(get_db)):
    """
    Returns admin-configured indicative price benchmarks.
    Explicitly labeled as 'indicative, not market data'.
    """
    setting = db.query(ConfigSetting).filter(ConfigSetting.key == "recyclable_rate_card").first()
    if setting and isinstance(setting.value_json, dict):
        return setting.value_json
    return {
        "paper_cardboard": 12.0,
        "plastic_pet": 18.0,
        "metal_scrap": 32.0,
        "e_waste": 45.0,
        "glass": 4.0,
        "rate_disclaimer": "indicative, not market data"
    }

@router.get("/listings", response_model=List[ListingOut])
def list_recyclable_listings(db: Session = Depends(get_db)):
    return db.query(RecyclableListing).order_by(desc(RecyclableListing.created_at)).all()

@router.post("/listings", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
def create_recyclable_listing(
    listing_in: ListingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    listing = RecyclableListing(
        citizen_id=current_user.id,
        material_type=listing_in.material_type,
        estimated_weight_kg=listing_in.estimated_weight_kg,
        description=listing_in.description,
        address_text=listing_in.address_text,
        lat=listing_in.lat,
        lng=listing_in.lng,
        status="listed",
        seed_demo=False
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing

@router.get("/recyclers")
def list_recyclers(db: Session = Depends(get_db)):
    recyclers = db.query(Recycler).all()
    return [
        {
            "id": r.id,
            "business_name": r.business_name,
            "materials_accepted": r.materials_accepted.split(",") if r.materials_accepted else [],
            "operating_wards": r.operating_wards,
            "contact_phone": r.contact_phone,
            "address": r.address,
            "is_verified": r.is_verified
        }
        for r in recyclers
    ]

@router.post("/pickups", response_model=PickupRequestOut, status_code=status.HTTP_201_CREATED)
def create_pickup_request(
    req_in: PickupRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    listing = db.query(RecyclableListing).filter(RecyclableListing.id == req_in.listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    recycler = db.query(Recycler).filter(Recycler.id == req_in.recycler_id).first()
    if not recycler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recycler partner not found")

    pickup = PickupRequest(
        listing_id=listing.id,
        recycler_id=recycler.id,
        scheduled_date=req_in.scheduled_date,
        time_slot=req_in.time_slot or "10:00 - 13:00",
        status="pending",
        offered_price_inr=req_in.offered_price_inr or 0.0,
        price_label="indicative, not market data",
        seed_demo=False
    )
    listing.status = "pickup_requested"
    db.add(pickup)
    db.commit()
    db.refresh(pickup)
    return pickup

@router.patch("/pickups/{pickup_id}/status")
def update_pickup_status(
    pickup_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pickup = db.query(PickupRequest).filter(PickupRequest.id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup request not found")

    new_status = payload.get("status", pickup.status)
    pickup.status = new_status
    if "actual_weight_kg" in payload:
        pickup.actual_weight_kg = float(payload["actual_weight_kg"])
    if "final_payout_inr" in payload:
        pickup.final_payout_inr = float(payload["final_payout_inr"])
    if new_status == "completed":
        pickup.completed_at = datetime.utcnow()
        if pickup.listing:
            pickup.listing.status = "collected"

    db.commit()
    return {"id": pickup.id, "status": pickup.status}
