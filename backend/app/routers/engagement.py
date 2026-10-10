from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.engagement import (
    QuizQuestion,
    QuizAttempt,
    CleanupEvent,
    VolunteerTask,
    VolunteerParticipation,
    PointsLedger
)
from backend.app.schemas.schemas import QuizQuestionOut, QuizSubmitIn, EventOut, VolunteerTaskOut
from backend.app.core.auth import get_current_user, require_roles

router = APIRouter(prefix="/engagement", tags=["Civic Engagement & Gamification"])

DAILY_QUIZ_POINTS_CAP = 50

@router.get("/quiz", response_model=List[QuizQuestionOut])
def get_quiz_questions(db: Session = Depends(get_db)):
    """Returns active segregation questions without exposing correct answers."""
    questions = db.query(QuizQuestion).all()
    return [
        QuizQuestionOut(
            id=q.id,
            category=q.category,
            question_text=q.question_text,
            options=q.options_json if isinstance(q.options_json, list) else [],
            difficulty=q.difficulty,
            points=q.points
        )
        for q in questions
    ]

@router.post("/quiz/submit")
def submit_quiz_answer(
    submission: QuizSubmitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates quiz answer server-side.
    Enforces anti-gaming guards:
    1. Idempotency per user/question
    2. Daily points cap (max 50 points/day for quiz)
    """
    question = db.query(QuizQuestion).filter(QuizQuestion.id == submission.question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    is_correct = (submission.selected_option_index == question.correct_option_index)

    # Check previous attempts
    prev_attempt = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.question_id == question.id,
        QuizAttempt.is_correct == True
    ).first()

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    daily_earned = db.query(func.sum(PointsLedger.points)).filter(
        PointsLedger.user_id == current_user.id,
        PointsLedger.action_type == "quiz",
        PointsLedger.date_str == today_str
    ).scalar() or 0

    points_to_award = 0
    if is_correct and not prev_attempt:
        if daily_earned < DAILY_QUIZ_POINTS_CAP:
            points_to_award = min(question.points, DAILY_QUIZ_POINTS_CAP - daily_earned)
            idemp_key = f"quiz:{current_user.id}:{question.id}"
            
            db.add(PointsLedger(
                user_id=current_user.id,
                action_type="quiz",
                points=points_to_award,
                reference_id=str(question.id),
                idempotency_key=idemp_key,
                date_str=today_str
            ))
            current_user.points_balance += points_to_award

    # Record attempt
    attempt = QuizAttempt(
        user_id=current_user.id,
        question_id=question.id,
        selected_option_index=submission.selected_option_index,
        is_correct=is_correct,
        points_earned=points_to_award
    )
    db.add(attempt)
    db.commit()

    return {
        "is_correct": is_correct,
        "points_earned": points_to_award,
        "explanation": question.explanation,
        "current_balance": current_user.points_balance,
        "daily_cap_remaining": max(0, DAILY_QUIZ_POINTS_CAP - (daily_earned + points_to_award))
    }

@router.get("/events")
def list_cleanup_events(db: Session = Depends(get_db)):
    events = db.query(CleanupEvent).order_by(desc(CleanupEvent.created_at)).all()
    results = []
    for ev in events:
        results.append({
            "id": ev.id,
            "title": ev.title,
            "description": ev.description,
            "location_name": ev.location_name,
            "lat": ev.lat,
            "lng": ev.lng,
            "scheduled_date": ev.scheduled_date,
            "max_volunteers": ev.max_volunteers,
            "status": ev.status,
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "description": t.description,
                    "safety_instructions": t.safety_instructions,
                    "is_hazardous": t.is_hazardous,
                    "points_reward": t.points_reward
                }
                for t in ev.tasks
            ]
        })
    return results

@router.post("/events/{event_id}/volunteer")
def register_as_volunteer(
    event_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registers a citizen volunteer for a community cleanup task.
    Honesty and safety rule: Hazardous tasks are strictly disallowed for citizen volunteers.
    """
    event = db.query(CleanupEvent).filter(CleanupEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    task_id = payload.get("task_id")
    if task_id:
        task = db.query(VolunteerTask).filter(VolunteerTask.id == task_id).first()
        if task and task.is_hazardous:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Safety violation: citizen volunteers cannot be assigned hazardous tasks"
            )

    # Check existing registration
    existing = db.query(VolunteerParticipation).filter(
        VolunteerParticipation.event_id == event.id,
        VolunteerParticipation.user_id == current_user.id
    ).first()
    if existing:
        return {"status": "already_registered", "participation_id": existing.id}

    participation = VolunteerParticipation(
        event_id=event.id,
        task_id=task_id,
        user_id=current_user.id,
        status="registered",
        seed_demo=False
    )
    db.add(participation)
    db.commit()
    db.refresh(participation)

    return {"status": "registered", "participation_id": participation.id}

@router.get("/leaderboard")
def get_citizen_leaderboard(db: Session = Depends(get_db)):
    citizens = db.query(User).filter(User.role == "citizen").order_by(desc(User.points_balance)).limit(10).all()
    return [
        {
            "rank": idx + 1,
            "name": c.full_name,
            "points": c.points_balance,
            "ward_name": c.ward.name if c.ward else "General Ward"
        }
        for idx, c in enumerate(citizens)
    ]
