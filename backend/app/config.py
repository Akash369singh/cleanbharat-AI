import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartRoute AI — Clean Bharat Intelligence Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "clean-bharat-hackathon-2026-super-secret-key-change-in-prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cleanbharat.db")
    
    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads")))
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # OSRM & Routing
    OSRM_BASE_URL: str = os.getenv("OSRM_BASE_URL", "http://router.project-osrm.org")
    OSRM_TIMEOUT_SECONDS: float = float(os.getenv("OSRM_TIMEOUT_SECONDS", "3.0"))
    
    # IoT
    IOT_API_KEY: str = os.getenv("IOT_API_KEY", "esp32-sensor-cleanbharat-key")
    
    # External APIs (Honesty rule: rainfall & LLM only if real keys exist)
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
