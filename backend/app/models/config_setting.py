from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from backend.app.database import Base

class ConfigSetting(Base):
    __tablename__ = "config_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value_json = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
