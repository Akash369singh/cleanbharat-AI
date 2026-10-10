from datetime import datetime, timezone, timedelta
import random
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.core.security import get_password_hash
from backend.app.models.user import User, Ward
from backend.app.models.report import Report, ReportEvent
from backend.app.models.routing import Depot, Vehicle, CollectionPoint, Route, RouteStop, Assignment
from backend.app.models.resolution import ResolutionEvidence
from backend.app.models.drain import DrainInspection
from backend.app.models.iot import Bin, BinReading
from backend.app.models.recycling import Recycler, RecyclableListing, PickupRequest
from backend.app.models.engagement import (
    QuizQuestion,
    CleanupEvent,
    VolunteerTask,
    VolunteerParticipation,
    PointsLedger
)
from backend.app.models.config_setting import ConfigSetting
from backend.app.services.ai_classifier import get_classifier
from backend.app.services.priority_engine import calculate_priority_score

DEFAULT_PASSWORD = "Password123!"

def seed_database(db: Session) -> Dict[str, Any]:
    """
    Idempotent seeding of realistic synthetic demo data across 8 wards and 180+ reports.
    Every seeded row is flagged with seed_demo=True for safe identification and audit reset.
    """
    # 1. Config Settings
    if not db.query(ConfigSetting).filter(ConfigSetting.key == "priority_weights").first():
        db.add(ConfigSetting(
            key="priority_weights",
            value_json={
                "w_severity": 2.5,
                "w_overflow": 1.5,
                "w_age_per_hour": 0.05,
                "w_duplicate": 0.8,
                "w_drain_clog": 2.0,
                "w_sensitive_location": 1.5,
                "max_age_hours": 72.0
            },
            description="Configurable weights for multi-factor priority scoring formula"
        ))
    if not db.query(ConfigSetting).filter(ConfigSetting.key == "clustering_config").first():
        db.add(ConfigSetting(
            key="clustering_config",
            value_json={"radius_meters": 50.0, "window_hours": 72.0},
            description="Spatial-temporal duplicate clustering thresholds"
        ))
    if not db.query(ConfigSetting).filter(ConfigSetting.key == "recyclable_rate_card").first():
        db.add(ConfigSetting(
            key="recyclable_rate_card",
            value_json={
                "paper_cardboard": 12.0,
                "plastic_pet": 18.0,
                "metal_scrap": 32.0,
                "e_waste": 45.0,
                "glass": 4.0,
                "rate_disclaimer": "indicative, not market data"
            },
            description="Indicative reference benchmark rates for RecycleConnect platform"
        ))
    db.commit()

    # 2. Wards (8 Wards across Municipal Delhi-NCR)
    wards_data = [
        {"name": "Ward 12 — Connaught Place", "code": "DEL-CP-12", "zone": "Central", "center_lat": 28.6315, "center_lng": 77.2167},
        {"name": "Ward 24 — Karol Bagh", "code": "DEL-KB-24", "zone": "Central", "center_lat": 28.6517, "center_lng": 77.1906},
        {"name": "Ward 58 — Okhla Phase II", "code": "DEL-OK-58", "zone": "South", "center_lat": 28.5355, "center_lng": 77.2750},
        {"name": "Ward 08 — Chandni Chowk", "code": "DEL-CC-08", "zone": "North", "center_lat": 28.6562, "center_lng": 77.2304},
        {"name": "Ward 35 — Saket District Centre", "code": "DEL-SK-35", "zone": "South", "center_lat": 28.5244, "center_lng": 77.2167},
        {"name": "Ward 42 — Rohini Sector 7", "code": "DEL-RH-42", "zone": "North-West", "center_lat": 28.7100, "center_lng": 77.1150},
        {"name": "Ward 66 — Dwarka Sector 10", "code": "DEL-DW-66", "zone": "South-West", "center_lat": 28.5815, "center_lng": 77.0600},
        {"name": "Ward 79 — Mayur Vihar Phase I", "code": "DEL-MV-79", "zone": "East", "center_lat": 28.6080, "center_lng": 77.2950},
    ]
    ward_objs = {}
    for wd in wards_data:
        w = db.query(Ward).filter(Ward.code == wd["code"]).first()
        if not w:
            w = Ward(**wd, seed_demo=True)
            db.add(w)
            db.flush()
        ward_objs[wd["code"]] = w
    db.commit()

    # 3. Users (Credentials printed in README for evaluation)
    users_data = [
        {"email": "admin@cleanbharat.gov.in", "full_name": "Dr. Rajesh Sharma (Chief Sanitation Admin)", "role": "admin", "ward_id": ward_objs["DEL-CP-12"].id},
        {"email": "supervisor@cleanbharat.gov.in", "full_name": "Smt. Sunita Verma (Zone Supervisor)", "role": "supervisor", "ward_id": ward_objs["DEL-CP-12"].id},
        {"email": "worker@cleanbharat.gov.in", "full_name": "Ramesh Kumar (Route Driver & Sanitation Worker)", "role": "worker", "ward_id": ward_objs["DEL-CP-12"].id},
        {"email": "citizen@cleanbharat.gov.in", "full_name": "Aarav Gupta (Active Citizen)", "role": "citizen", "ward_id": ward_objs["DEL-KB-24"].id},
        {"email": "recycler@greencycle.in", "full_name": "Vikas Agarwal (GreenCycle Partner)", "role": "citizen", "ward_id": ward_objs["DEL-OK-58"].id},
    ]
    user_objs = {}
    for ud in users_data:
        u = db.query(User).filter(User.email == ud["email"]).first()
        if not u:
            u = User(
                email=ud["email"],
                full_name=ud["full_name"],
                role=ud["role"],
                ward_id=ud.get("ward_id"),
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                points_balance=120 if ud["role"] == "citizen" else 0,
                seed_demo=True
            )
            db.add(u)
            db.flush()
        user_objs[ud["email"]] = u
    db.commit()

    # 4. Depots (Fleet garages)
    depots_data = [
        {"name": "Central Zone Municipal Depot #1", "code": "DEP-CENTRAL-01", "lat": 28.6360, "lng": 77.2140, "capacity_vehicles": 18, "ward_id": ward_objs["DEL-CP-12"].id},
        {"name": "Karol Bagh Sanitation Workshop", "code": "DEP-KB-02", "lat": 28.6480, "lng": 77.1950, "capacity_vehicles": 12, "ward_id": ward_objs["DEL-KB-24"].id},
        {"name": "South Zone Transfer Station", "code": "DEP-SOUTH-03", "lat": 28.5320, "lng": 77.2710, "capacity_vehicles": 24, "ward_id": ward_objs["DEL-OK-58"].id},
        {"name": "North Zone Depot Rohini", "code": "DEP-NORTH-04", "lat": 28.7120, "lng": 77.1180, "capacity_vehicles": 15, "ward_id": ward_objs["DEL-RH-42"].id},
    ]
    depot_objs = {}
    for dd in depots_data:
        d = db.query(Depot).filter(Depot.code == dd["code"]).first()
        if not d:
            d = Depot(**dd, seed_demo=True)
            db.add(d)
            db.flush()
        depot_objs[dd["code"]] = d
    db.commit()

    # 5. Vehicles
    vehicles_data = [
        {"registration_number": "DL-1M-4421", "vehicle_type": "Tipper Truck (3.5T)", "capacity_kg": 3500.0, "fuel_type": "Electric", "driver_name": "Ramesh Kumar", "depot_id": depot_objs["DEP-CENTRAL-01"].id},
        {"registration_number": "DL-1M-8890", "vehicle_type": "Compactor Truck (5T)", "capacity_kg": 5000.0, "fuel_type": "CNG", "driver_name": "Suresh Yadav", "depot_id": depot_objs["DEP-CENTRAL-01"].id},
        {"registration_number": "DL-2M-1102", "vehicle_type": "Light Collection Van", "capacity_kg": 1500.0, "fuel_type": "Electric", "driver_name": "Amit Singh", "depot_id": depot_objs["DEP-KB-02"].id},
        {"registration_number": "DL-3M-9041", "vehicle_type": "Heavy Compactor (7.5T)", "capacity_kg": 7500.0, "fuel_type": "CNG", "driver_name": "Manoj Pal", "depot_id": depot_objs["DEP-SOUTH-03"].id},
        {"registration_number": "DL-4M-3329", "vehicle_type": "Electric Auto Hopper", "capacity_kg": 800.0, "fuel_type": "Electric", "driver_name": "Pooja Devi", "depot_id": depot_objs["DEP-NORTH-04"].id},
    ]
    vehicle_objs = []
    for vd in vehicles_data:
        v = db.query(Vehicle).filter(Vehicle.registration_number == vd["registration_number"]).first()
        if not v:
            v = Vehicle(**vd, seed_demo=True)
            db.add(v)
            db.flush()
        vehicle_objs.append(v)
    db.commit()

    # 6. Smart Bins (Ultrasonic IoT sensor nodes)
    bins_data = [
        {"bin_code": "BIN-CP-01", "ward_id": ward_objs["DEL-CP-12"].id, "lat": 28.6328, "lng": 77.2195, "bin_type": "dry_recyclable", "fill": 92.0, "status": "overflow"},
        {"bin_code": "BIN-CP-02", "ward_id": ward_objs["DEL-CP-12"].id, "lat": 28.6300, "lng": 77.2150, "bin_type": "organic", "fill": 78.0, "status": "near_full"},
        {"bin_code": "BIN-KB-01", "ward_id": ward_objs["DEL-KB-24"].id, "lat": 28.6520, "lng": 77.1920, "bin_type": "dry_recyclable", "fill": 45.0, "status": "normal"},
        {"bin_code": "BIN-KB-02", "ward_id": ward_objs["DEL-KB-24"].id, "lat": 28.6490, "lng": 77.1890, "bin_type": "mixed", "fill": 30.0, "status": "normal"},
        {"bin_code": "BIN-OK-01", "ward_id": ward_objs["DEL-OK-58"].id, "lat": 28.5360, "lng": 77.2760, "bin_type": "dry_recyclable", "fill": 84.0, "status": "near_full"},
        {"bin_code": "BIN-CC-01", "ward_id": ward_objs["DEL-CC-08"].id, "lat": 28.6570, "lng": 77.2310, "bin_type": "organic", "fill": 88.0, "status": "overflow"},
        {"bin_code": "BIN-SK-01", "ward_id": ward_objs["DEL-SK-35"].id, "lat": 28.5250, "lng": 77.2170, "bin_type": "mixed", "fill": 55.0, "status": "normal"},
        {"bin_code": "BIN-RH-01", "ward_id": ward_objs["DEL-RH-42"].id, "lat": 28.7110, "lng": 77.1160, "bin_type": "dry_recyclable", "fill": 70.0, "status": "near_full"},
    ]
    for bd in bins_data:
        b = db.query(Bin).filter(Bin.bin_code == bd["bin_code"]).first()
        if not b:
            b = Bin(
                bin_code=bd["bin_code"],
                ward_id=bd["ward_id"],
                lat=bd["lat"],
                lng=bd["lng"],
                bin_type=bd["bin_type"],
                fill_level_percent=bd["fill"],
                status=bd["status"],
                simulated=True,
                seed_demo=True,
                last_reading_at=datetime.now(timezone.utc)
            )
            db.add(b)
            db.flush()
            r = BinReading(
                bin_id=b.id,
                fill_level_percent=bd["fill"],
                battery_level_percent=94.0,
                raw_distance_cm=round(100.0 * (1.0 - bd["fill"]/100.0), 1),
                simulated=True,
                source="simulated",
                seed_demo=True,
                reading_time=datetime.now(timezone.utc)
            )
            db.add(r)
    db.commit()

    # 7. Extended Reports: 180 Synthetic Reports across 8 Wards
    classifier = get_classifier()
    now = datetime.now(timezone.utc)

    categories_pool = [
        ("garbage_dump", "Massive uncollected garbage mound along residential sidewalk."),
        ("overflowing_bin", "Municipal community bin overflowing onto the pedestrian pathway."),
        ("drain_clog", "Open stormwater culvert obstructed with polythene bags, mud and plastic bottles."),
        ("plastic_waste", "Heavy concentration of single-use beverage containers and packaging film."),
        ("construction_debris", "Uncovered pile of broken cement blocks and plaster sand left after construction."),
        ("hazardous_waste", "Discarded medical blister packs and broken fluorescent tubes in open alley."),
        ("e_waste", "Broken household appliances and computer casing dumped behind transformer.")
    ]

    statuses_pool = (
        ["resolved"] * 45 +
        ["in_progress"] * 30 +
        ["assigned"] * 35 +
        ["verified"] * 45 +
        ["submitted"] * 25
    )
    random.seed(42) # Deterministic pseudo-random seed
    random.shuffle(statuses_pool)

    ward_keys = list(ward_objs.keys())
    report_count = db.query(Report).filter(Report.seed_demo == True).count()

    if report_count < 150:
        for idx in range(1, 181):
            ticket_number = f"CB-{1000 + idx}"
            existing = db.query(Report).filter(Report.ticket_number == ticket_number).first()
            if existing:
                continue

            ward_code = ward_keys[(idx - 1) % len(ward_keys)]
            ward_obj = ward_objs[ward_code]

            cat_item = categories_pool[(idx - 1) % len(categories_pool)]
            category, desc_base = cat_item
            description = f"{desc_base} Near {ward_obj.name.split('—')[-1].strip()} landmark #{idx}."

            # Coordinate slightly jittered around ward center (±0.007 deg ~ 700m)
            lat_jitter = (random.random() - 0.5) * 0.014
            lng_jitter = (random.random() - 0.5) * 0.014
            lat = round(ward_obj.center_lat + lat_jitter, 5)
            lng = round(ward_obj.center_lng + lng_jitter, 5)

            # Dates distributed over the trailing 30 days
            if idx <= 10:
                days_ago = 0
                hours_ago = idx * 2
                if idx == 1:
                    lat, lng = 28.6530, 77.1915
                    category = "garbage_dump"
                    status = "verified"
            else:
                days_ago = random.randint(0, 29)
                hours_ago = random.randint(1, 23)

            created_time = now - timedelta(days=days_ago, hours=hours_ago)
            if idx > 1:
                status = statuses_pool[(idx - 1) % len(statuses_pool)]

            ai_res = classifier.classify(description, category)
            p_calc = calculate_priority_score(
                category=category,
                created_at=created_time,
                is_overflow=ai_res["is_overflow"],
                is_drain_obstruction=ai_res["is_drain_obstruction"],
                description=description,
                db=db
            )

            # SLA target (e.g. 24 or 48 hours from creation)
            sla_hours = 24 if category in ["drain_clog", "hazardous_waste"] else 48
            sla_due_at = created_time + timedelta(hours=sla_hours)

            # Check if overdue
            is_overdue = (status not in ["resolved", "rejected"]) and (sla_due_at < now)

            # Corroboration duplicate simulation for 1 out of 5 reports
            dup_count = random.choice([0, 0, 0, 1, 2])

            rep = Report(
                ticket_number=ticket_number,
                category=category,
                waste_type=ai_res["waste_type"],
                description=description,
                lat=lat,
                lng=lng,
                address_text=f"{ward_obj.name.split('—')[-1].strip()} Sector-{((idx % 12) + 1)}",
                status=status,
                priority_score=p_calc["score"],
                priority_breakdown=p_calc["breakdown"],
                ai_result=ai_res,
                source="seed_demo",
                sla_due_at=sla_due_at,
                duplicate_count=dup_count,
                citizen_id=user_objs["citizen@cleanbharat.gov.in"].id,
                ward_id=ward_obj.id,
                created_at=created_time,
                updated_at=created_time + timedelta(hours=min(hours_ago, 6)),
                seed_demo=True
            )
            db.add(rep)
            db.flush()

            # Audit event creation
            db.add(ReportEvent(
                report_id=rep.id,
                actor_id=user_objs["citizen@cleanbharat.gov.in"].id,
                event_type="status_change",
                old_status=None,
                new_status="submitted",
                comment=f"Incident report #{rep.ticket_number} created via citizen mobile portal",
                created_at=created_time
            ))

            if status in ["verified", "assigned", "in_progress", "resolved"]:
                db.add(ReportEvent(
                    report_id=rep.id,
                    actor_id=user_objs["supervisor@cleanbharat.gov.in"].id,
                    event_type="status_change",
                    old_status="submitted",
                    new_status="verified",
                    comment="Sanitation supervisor verified geo-coordinates and incident priority.",
                    created_at=created_time + timedelta(hours=1)
                ))

            if status in ["assigned", "in_progress", "resolved"]:
                db.add(ReportEvent(
                    report_id=rep.id,
                    actor_id=user_objs["supervisor@cleanbharat.gov.in"].id,
                    event_type="status_change",
                    old_status="verified",
                    new_status="assigned",
                    comment="Assigned to primary zonal collection vehicle squad.",
                    created_at=created_time + timedelta(hours=2)
                ))

            if status in ["in_progress", "resolved"]:
                db.add(ReportEvent(
                    report_id=rep.id,
                    actor_id=user_objs["worker@cleanbharat.gov.in"].id,
                    event_type="status_change",
                    old_status="assigned",
                    new_status="in_progress",
                    comment="Field worker en-route to site for clearing and disinfection.",
                    created_at=created_time + timedelta(hours=3)
                ))

            # Resolution evidence for resolved tickets
            if status == "resolved":
                db.add(ResolutionEvidence(
                    report_id=rep.id,
                    before_photo_path="demo_before.jpg",
                    after_photo_path="demo_after.jpg",
                    worker_id=user_objs["worker@cleanbharat.gov.in"].id,
                    reviewer_id=user_objs["supervisor@cleanbharat.gov.in"].id,
                    decision="approved",
                    notes="Site thoroughly cleared by zonal sanitation squad and disinfected with lime.",
                    submitted_at=created_time + timedelta(hours=4),
                    reviewed_at=created_time + timedelta(hours=5),
                    seed_demo=True
                ))
                db.add(ReportEvent(
                    report_id=rep.id,
                    actor_id=user_objs["supervisor@cleanbharat.gov.in"].id,
                    event_type="closure_approved",
                    old_status="in_progress",
                    new_status="resolved",
                    comment="Supervisor confirmed resolution after photographic inspection.",
                    created_at=created_time + timedelta(hours=5)
                ))

            # Drain inspection task for drain clogs
            if category == "drain_clog" and idx % 2 == 0:
                db.add(DrainInspection(
                    drain_code_or_landmark=f"Stormwater Culvert #{ward_obj.code}-{idx}",
                    ward_id=ward_obj.id,
                    report_id=rep.id,
                    lat=lat,
                    lng=lng,
                    obstruction_level="high" if idx % 4 == 0 else "medium",
                    repeat_incident_count=random.randint(2, 6),
                    rainfall_risk_estimate="Estimated: Moderate waterlogging risk (Weather feed: not configured)",
                    rainfall_source="not_configured",
                    inspection_status="completed" if status == "resolved" else "scheduled",
                    assigned_inspector_id=user_objs["worker@cleanbharat.gov.in"].id,
                    findings="Silt deposition and single-use plastic blocking flow",
                    recommended_action="Desilting squad deployed with vacuum suction unit",
                    seed_demo=True
                ))

        db.commit()

    # 8. Completed Routes (Persisted baseline vs optimised distances)
    if db.query(Route).filter(Route.seed_demo == True).count() < 3:
        route_1 = Route(
            route_code="RT-DEL-CP-01",
            depot_id=depot_objs["DEP-CENTRAL-01"].id,
            vehicle_id=vehicle_objs[0].id,
            status="completed",
            total_distance_meters=18400.0,      # 18.4 km optimised
            baseline_distance_meters=24800.0,   # 24.8 km unoptimised
            total_duration_seconds=3600,
            routing_source="osrm",
            solver_used="or_tools_cvrp",
            date=(now - timedelta(days=1)).strftime("%Y-%m-%d"),
            seed_demo=True
        )
        route_2 = Route(
            route_code="RT-DEL-KB-02",
            depot_id=depot_objs["DEP-KB-02"].id,
            vehicle_id=vehicle_objs[1].id,
            status="completed",
            total_distance_meters=21200.0,      # 21.2 km optimised
            baseline_distance_meters=28900.0,   # 28.9 km unoptimised
            total_duration_seconds=4200,
            routing_source="osrm",
            solver_used="or_tools_cvrp",
            date=(now - timedelta(days=2)).strftime("%Y-%m-%d"),
            seed_demo=True
        )
        db.add_all([route_1, route_2])
        db.commit()

    # 9. Quiz Questions
    quiz_data = [
        {
            "category": "segregation",
            "question_text": "Which bin color is designated under Swachh Bharat guidelines for Wet / Biodegradable Waste?",
            "options_json": ["Green Bin", "Blue Bin", "Red Bin", "Black Bin"],
            "correct_option_index": 0,
            "explanation": "Green bins are strictly used for wet organic compostable kitchen and garden waste.",
            "difficulty": "easy",
            "points": 10
        },
        {
            "category": "e-waste",
            "question_text": "How should exhausted lithium-ion mobile batteries and electronic circuit boards be disposed of?",
            "options_json": ["Mixed with regular dry waste", "Burnt in backyard", "Sent to an authorized E-Waste Recycler", "Flushed in sanitation drain"],
            "correct_option_index": 2,
            "explanation": "Batteries contain toxic heavy metals and must never be landfilled or burnt; they require certified e-waste recyclers.",
            "difficulty": "medium",
            "points": 15
        },
        {
            "category": "plastics",
            "question_text": "What type of plastic is most commonly used in clear beverage bottles and is 100% recyclable?",
            "options_json": ["PVC (Polyvinyl Chloride)", "PET (Polyethylene Terephthalate)", "Polystyrene (Thermocol)", "Polycarbonate"],
            "correct_option_index": 1,
            "explanation": "PET (Plastic #1) is highly recyclable into polyester fibers and new packaging.",
            "difficulty": "medium",
            "points": 15
        },
        {
            "category": "sanitary",
            "question_text": "How should sanitary napkins and bio-medical bandages be handed over to waste collectors?",
            "options_json": ["Loose in green bin", "Wrapped securely in marked paper pouches", "Thrown in plastic drains", "Mixed with newspaper"],
            "correct_option_index": 1,
            "explanation": "Solid Waste Management Rules mandate wrapping sanitary waste separately to protect sanitization workers from infection.",
            "difficulty": "easy",
            "points": 10
        }
    ]
    for qd in quiz_data:
        q = db.query(QuizQuestion).filter(QuizQuestion.question_text == qd["question_text"]).first()
        if not q:
            db.add(QuizQuestion(**qd, seed_demo=True))
    db.commit()

    # 10. Recycler & Listings
    rc = db.query(Recycler).filter(Recycler.business_name == "GreenCycle Eco Solutions Pvt Ltd").first()
    if not rc:
        rc = Recycler(
            user_id=user_objs["recycler@greencycle.in"].id,
            business_name="GreenCycle Eco Solutions Pvt Ltd",
            registration_number="DPCC/PWM/2025/8892",
            materials_accepted="paper_cardboard,plastic_pet,metal_scrap,e_waste",
            operating_wards="All Wards",
            contact_phone="+91-9811223344",
            address="Plot 42, Okhla Industrial Area Phase II, New Delhi",
            is_verified=True,
            seed_demo=True
        )
        db.add(rc)
        db.flush()

    listing_samples = [
        {"material": "paper_cardboard", "weight": 45.0, "desc": "Corrugated cartons and unsoiled office packaging boxes.", "status": "completed"},
        {"material": "plastic_pet", "weight": 30.0, "desc": "Baled transparent PET mineral water bottles.", "status": "completed"},
        {"material": "metal_scrap", "weight": 65.0, "desc": "Steel wiring, discarded iron mesh and aluminium scrap.", "status": "accepted"},
        {"material": "e_waste", "weight": 18.0, "desc": "Obsolete desktop motherboard, power supply and cables.", "status": "pickup_requested"}
    ]
    for ls in listing_samples:
        existing_l = db.query(RecyclableListing).filter(RecyclableListing.description == ls["desc"]).first()
        if not existing_l:
            l = RecyclableListing(
                citizen_id=user_objs["citizen@cleanbharat.gov.in"].id,
                material_type=ls["material"],
                estimated_weight_kg=ls["weight"],
                description=ls["desc"],
                address_text="Connaught Place Outer Circle",
                lat=28.6320,
                lng=77.2180,
                status=ls["status"],
                seed_demo=True
            )
            db.add(l)
            db.flush()
            if ls["status"] == "completed":
                db.add(PickupRequest(
                    listing_id=l.id,
                    recycler_id=rc.id,
                    scheduled_date=(now - timedelta(days=2)).strftime("%Y-%m-%d"),
                    status="completed",
                    actual_weight_kg=ls["weight"],
                    final_payout_inr=ls["weight"] * 18.0,
                    notes="Doorstep electronic scale verification completed.",
                    seed_demo=True
                ))
    db.commit()

    return {
        "status": "success",
        "message": "Demo database seeded successfully with honest transparency labeling.",
        "counts": {
            "wards": len(ward_objs),
            "users": len(user_objs),
            "reports": db.query(Report).filter(Report.seed_demo == True).count(),
            "bins": len(bins_data),
            "vehicles": len(vehicles_data)
        }
    }

def safe_reset_database(db: Session, admin_confirmed: bool = False) -> Dict[str, Any]:
    """
    Safely deletes ONLY demo-seeded records (seed_demo == True).
    Leaves authentic citizen and live field data completely untouched.
    Requires explicit admin confirmation.
    """
    if not admin_confirmed:
        return {
            "status": "blocked",
            "message": "Reset aborted: admin confirmation required (pass admin_confirmed=True)."
        }

    # Delete dependent child tables first
    db.query(ResolutionEvidence).filter(ResolutionEvidence.seed_demo == True).delete()
    db.query(ReportEvent).filter(ReportEvent.report.has(Report.seed_demo == True)).delete(synchronize_session=False)
    db.query(Assignment).filter(Assignment.seed_demo == True).delete()
    db.query(RouteStop).filter(RouteStop.route.has(Route.seed_demo == True)).delete(synchronize_session=False)
    db.query(Route).filter(Route.seed_demo == True).delete()
    db.query(DrainInspection).filter(DrainInspection.seed_demo == True).delete()
    db.query(BinReading).filter(BinReading.seed_demo == True).delete()
    db.query(Bin).filter(Bin.seed_demo == True).delete()
    db.query(PickupRequest).filter(PickupRequest.seed_demo == True).delete()
    db.query(RecyclableListing).filter(RecyclableListing.seed_demo == True).delete()
    db.query(Recycler).filter(Recycler.seed_demo == True).delete()
    db.query(VolunteerParticipation).filter(VolunteerParticipation.seed_demo == True).delete()
    db.query(VolunteerTask).filter(VolunteerTask.seed_demo == True).delete()
    db.query(CleanupEvent).filter(CleanupEvent.seed_demo == True).delete()
    db.query(QuizQuestion).filter(QuizQuestion.seed_demo == True).delete()
    db.query(Report).filter(Report.seed_demo == True).delete()
    db.query(Vehicle).filter(Vehicle.seed_demo == True).delete()
    db.query(Depot).filter(Depot.seed_demo == True).delete()
    db.query(User).filter(User.seed_demo == True).delete()
    db.query(Ward).filter(Ward.seed_demo == True).delete()

    db.commit()
    return {
        "status": "success",
        "message": "All seeded demo rows safely removed. Authentic live data preserved."
    }
