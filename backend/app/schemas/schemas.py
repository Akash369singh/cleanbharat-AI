from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# --- Auth & User ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "citizen"  # citizen, worker, supervisor, admin
    phone: Optional[str] = None
    ward_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    ward_id: Optional[int] = None
    points_balance: int = 0
    is_active: bool = True
    seed_demo: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

# --- Ward ---
class WardOut(BaseModel):
    id: int
    name: str
    code: str
    zone: Optional[str]
    population: Optional[int]
    area_sq_km: Optional[float]
    center_lat: float
    center_lng: float
    contact_officer: Optional[str]
    contact_phone: Optional[str]

    class Config:
        from_attributes = True

# --- Reports & Status Machine ---
class ReportCreate(BaseModel):
    category: str = Field(..., description="garbage_dump, overflowing_bin, drain_clog, plastic_waste, etc.")
    description: str = Field(..., min_length=5)
    lat: float
    lng: float
    address_text: Optional[str] = None
    photo_path: Optional[str] = None
    ward_id: Optional[int] = None

class StatusTransitionIn(BaseModel):
    new_status: str = Field(..., description="verified, assigned, in_progress, resolved, rejected")
    comment: Optional[str] = None

class ReportEventOut(BaseModel):
    id: int
    event_type: str
    old_status: Optional[str]
    new_status: Optional[str]
    comment: Optional[str]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

class ReportOut(BaseModel):
    id: int
    ticket_number: str
    category: str
    waste_type: str
    description: str
    lat: float
    lng: float
    address_text: Optional[str] = None
    photo_path: Optional[str] = None
    status: str
    priority_score: float
    priority_breakdown: Optional[Dict[str, Any]] = None
    ai_result: Optional[Dict[str, Any]] = None
    cluster_id: Optional[int] = None
    is_cluster_parent: bool = False
    duplicate_count: int = 0
    sla_due_at: Optional[datetime] = None
    source: str
    seed_demo: bool = False
    citizen_id: Optional[int] = None
    ward_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Resolution Evidence ---
class ResolutionEvidenceCreate(BaseModel):
    report_id: int
    after_photo_path: str
    notes: Optional[str] = None

class ResolutionReviewIn(BaseModel):
    decision: str = Field(..., description="approved or rejected")
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None

class ResolutionEvidenceOut(BaseModel):
    id: int
    report_id: int
    before_photo_path: Optional[str]
    after_photo_path: str
    worker_id: int
    reviewer_id: Optional[int]
    decision: str
    notes: Optional[str]
    rejection_reason: Optional[str]
    submitted_at: datetime
    reviewed_at: Optional[datetime]

    class Config:
        from_attributes = True

# --- Routing ---
class VehicleOut(BaseModel):
    id: int
    registration_number: str
    vehicle_type: str
    capacity_kg: float
    status: str
    fuel_type: str
    driver_name: str

    class Config:
        from_attributes = True

class DepotOut(BaseModel):
    id: int
    name: str
    code: str
    lat: float
    lng: float
    capacity_vehicles: int

    class Config:
        from_attributes = True

class RouteOptimizeIn(BaseModel):
    vehicle_id: int
    depot_id: int
    report_ids: List[int]
    date_str: Optional[str] = None

class RouteStopOut(BaseModel):
    id: int
    stop_order: int
    report_id: Optional[int]
    stop_type: str
    lat: float
    lng: float
    estimated_waste_kg: float
    status: str

    class Config:
        from_attributes = True

class RouteOut(BaseModel):
    id: int
    route_code: str
    vehicle_id: int
    depot_id: int
    date: str
    status: str
    total_distance_meters: float
    total_duration_seconds: float
    baseline_distance_meters: float
    baseline_duration_seconds: float
    routing_source: str
    solver_used: str
    created_at: datetime
    stops: List[RouteStopOut] = []

    class Config:
        from_attributes = True

# --- IoT Smart Bins ---
class BinOut(BaseModel):
    id: int
    bin_code: str
    ward_id: Optional[int]
    lat: float
    lng: float
    bin_type: str
    capacity_liters: float
    fill_level_percent: float
    battery_level_percent: float
    sensor_health: str
    status: str
    simulated: bool
    last_reading_at: Optional[datetime]

    class Config:
        from_attributes = True

class HardwareReadingIn(BaseModel):
    bin_code: str
    fill_level_percent: float = Field(..., ge=0.0, le=100.0)
    raw_distance_cm: Optional[float] = None
    battery_level: Optional[float] = Field(default=95.0, ge=0.0, le=100.0)

# --- Recycling ---
class ListingCreate(BaseModel):
    material_type: str
    estimated_weight_kg: float = Field(..., gt=0.0)
    description: Optional[str] = None
    address_text: str
    lat: float = 28.6139
    lng: float = 77.2090

class ListingOut(BaseModel):
    id: int
    citizen_id: int
    material_type: str
    estimated_weight_kg: float
    description: Optional[str]
    address_text: Optional[str]
    lat: float
    lng: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class PickupRequestCreate(BaseModel):
    listing_id: int
    scheduled_date: str
    time_slot: Optional[str] = "10:00 - 13:00"
    offered_price_inr: Optional[float] = 0.0

class PickupRequestOut(BaseModel):
    id: int
    listing_id: int
    recycler_id: int
    scheduled_date: str
    time_slot: str
    status: str
    offered_price_inr: float
    price_label: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Engagement ---
class QuizQuestionOut(BaseModel):
    id: int
    category: str
    question_text: str
    options: List[str]
    difficulty: str
    points: int

class QuizSubmitIn(BaseModel):
    question_id: int
    selected_option_index: int

class EventOut(BaseModel):
    id: int
    title: str
    description: str
    location_name: str
    lat: float
    lng: float
    ward_id: Optional[int]
    scheduled_date: str
    max_volunteers: int
    status: str

    class Config:
        from_attributes = True

class VolunteerTaskOut(BaseModel):
    id: int
    event_id: int
    title: str
    description: str
    safety_instructions: str
    is_hazardous: bool
    points_reward: int

    class Config:
        from_attributes = True

# --- Config & Admin ---
class ConfigSettingUpdate(BaseModel):
    key: str
    value_json: Dict[str, Any]

class SeedResetConfirm(BaseModel):
    admin_confirmed: bool
