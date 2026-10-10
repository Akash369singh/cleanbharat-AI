import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.config import settings
from backend.app.database import engine, Base, get_db
import backend.app.models  # Ensures all models are imported and registered
from backend.app.services.seeder import seed_database

# Routers
from backend.app.routers import (
    auth,
    wards,
    reports,
    routing,
    resolution,
    drains,
    iot,
    recycling,
    engagement,
    metrics,
    assistant,
    admin
)

# Initialize schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Clean Bharat Intelligence Platform (AI First Product Builder Hackathon 2026)",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all module routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(wards.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(routing.router, prefix=settings.API_V1_STR)
app.include_router(resolution.router, prefix=settings.API_V1_STR)
app.include_router(drains.router, prefix=settings.API_V1_STR)
app.include_router(iot.router, prefix=settings.API_V1_STR)
app.include_router(recycling.router, prefix=settings.API_V1_STR)
app.include_router(engagement.router, prefix=settings.API_V1_STR)
app.include_router(metrics.router, prefix=settings.API_V1_STR)
app.include_router(assistant.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    # Auto-seed initial reference data and demo records if db is fresh
    from backend.app.database import SessionLocal
    db = SessionLocal()
    try:
        from backend.app.models.user import User
        if db.query(User).count() == 0:
            seed_database(db)
    finally:
        db.close()

@app.get("/health")
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Health status and transparency telemetry."""
    from datetime import datetime, timezone
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": settings.PROJECT_NAME,
        "database": db_status,
        "transparency_audit": {
            "ai_classifier_source": "rules_fallback",
            "routing_matrix_fallback": "haversine_fallback",
            "weather_provider": "active" if settings.WEATHER_API_KEY else "not configured",
            "llm_provider": "active" if settings.LLM_API_KEY else "deterministic_local_rules",
            "hardware_iot": "webhook_ready_unconnected"
        }
    }

@app.get("/api/uploads/{subfolder}/{filename}")
def serve_uploaded_file(subfolder: str, filename: str):
    """Safely serves uploaded sanitized media outside web root with path traversal protection."""
    if ".." in subfolder or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path components")

    file_path = os.path.join(settings.UPLOAD_DIR, subfolder, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(file_path)
