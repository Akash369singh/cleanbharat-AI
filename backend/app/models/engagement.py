from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base

class PointsLedger(Base):
    __tablename__ = "points_ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)  # quiz, report_verified, cleanup_volunteer, recycling_pickup
    points = Column(Integer, nullable=False)
    reference_id = Column(String(100), nullable=True)
    idempotency_key = Column(String(150), unique=True, nullable=False, index=True)
    date_str = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), default="segregation")
    question_text = Column(Text, nullable=False)
    options_json = Column(JSON, nullable=False)  # list of choices
    correct_option_index = Column(Integer, nullable=False)  # server-side check only
    explanation = Column(Text, nullable=False)
    difficulty = Column(String(20), default="easy")
    points = Column(Integer, default=10)
    seed_demo = Column(Boolean, default=False)

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False)
    selected_option_index = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    points_earned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    question = relationship("QuizQuestion")

class CleanupEvent(Base):
    __tablename__ = "cleanup_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    location_name = Column(String(150), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    scheduled_date = Column(String(50), nullable=False)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    max_volunteers = Column(Integer, default=30)
    status = Column(String(50), default="upcoming")  # upcoming, completed, cancelled
    seed_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ward = relationship("Ward")
    organizer = relationship("User")
    tasks = relationship("VolunteerTask", back_populates="event", cascade="all, delete-orphan")
    participations = relationship("VolunteerParticipation", back_populates="event", cascade="all, delete-orphan")

class VolunteerTask(Base):
    __tablename__ = "volunteer_tasks"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("cleanup_events.id"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    safety_instructions = Column(Text, default="Wear gloves and closed-toe footwear. Do not touch sharp objects directly.")
    is_hazardous = Column(Boolean, default=False)  # Strict rule: no hazardous tasks allowed for citizens
    points_reward = Column(Integer, default=50)
    seed_demo = Column(Boolean, default=False)

    event = relationship("CleanupEvent", back_populates="tasks")

class VolunteerParticipation(Base):
    __tablename__ = "volunteer_participations"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("cleanup_events.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("volunteer_tasks.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="registered")  # registered, attended, verified
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    seed_demo = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint('event_id', 'user_id', name='uq_event_user_participation'),
    )

    event = relationship("CleanupEvent", back_populates="participations")
    task = relationship("VolunteerTask")
    user = relationship("User", foreign_keys=[user_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
