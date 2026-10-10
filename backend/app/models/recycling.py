from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Recycler(Base):
    __tablename__ = "recyclers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    business_name = Column(String(150), nullable=False)
    registration_number = Column(String(100), nullable=True)
    materials_accepted = Column(String(255), default="paper_cardboard,plastic_pet,metal_scrap,e_waste")
    operating_wards = Column(String(255), default="All Wards")
    contact_phone = Column(String(20), default="+91-9876543210")
    address = Column(String(255), default="Okhla Industrial Area, Phase II")
    is_verified = Column(Boolean, default=True)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    pickups = relationship("PickupRequest", back_populates="recycler")

class RecyclableListing(Base):
    __tablename__ = "recyclable_listings"

    id = Column(Integer, primary_key=True, index=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    material_type = Column(String(100), nullable=False)  # paper_cardboard, plastic_pet, metal_scrap, e_waste, glass
    estimated_weight_kg = Column(Float, nullable=False, default=5.0)
    description = Column(Text, nullable=True)
    photos_json = Column(JSON, nullable=True)
    address_text = Column(String(255), nullable=True)
    lat = Column(Float, nullable=False, default=28.6139)
    lng = Column(Float, nullable=False, default=77.2090)
    status = Column(String(50), default="listed")  # listed, pickup_requested, collected, cancelled
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    citizen = relationship("User")
    pickup_requests = relationship("PickupRequest", back_populates="listing", cascade="all, delete-orphan")

class PickupRequest(Base):
    __tablename__ = "pickup_requests"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("recyclable_listings.id"), nullable=False)
    recycler_id = Column(Integer, ForeignKey("recyclers.id"), nullable=False)
    scheduled_date = Column(String(50), nullable=False)
    time_slot = Column(String(50), default="10:00 - 13:00")
    status = Column(String(50), default="pending")  # pending, accepted, completed, cancelled
    
    # Transparency rule: explicitly label indicative prices
    offered_price_inr = Column(Float, default=0.0)
    price_label = Column(String(100), default="indicative, not market data")
    actual_weight_kg = Column(Float, nullable=True)
    final_payout_inr = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    listing = relationship("RecyclableListing", back_populates="pickup_requests")
    recycler = relationship("Recycler", back_populates="pickups")
