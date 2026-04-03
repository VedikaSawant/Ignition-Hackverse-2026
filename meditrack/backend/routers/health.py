from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import HealthMetric, DoseLog, User
from schemas import HealthMetricCreate, HealthMetricOut
from auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/health", tags=["health"])


@router.post("/log", response_model=HealthMetricOut)
def log_health(data: HealthMetricCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    metric = HealthMetric(
        user_id=current_user.id,
        date=data.date,
        blood_pressure_systolic=data.blood_pressure_systolic,
        blood_pressure_diastolic=data.blood_pressure_diastolic,
        blood_sugar=data.blood_sugar,
        weight=data.weight,
        mood=data.mood,
        pain_level=data.pain_level,
        notes=data.notes,
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return HealthMetricOut.model_validate(metric)


@router.get("/history", response_model=list[HealthMetricOut])
def health_history(
    days: int = Query(default=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = (datetime.utcnow().date() - timedelta(days=days)).isoformat()
    metrics = db.query(HealthMetric).filter(
        HealthMetric.user_id == current_user.id,
        HealthMetric.date >= cutoff,
    ).order_by(HealthMetric.date.desc()).all()
    return [HealthMetricOut.model_validate(m) for m in metrics]


@router.get("/correlations")
def correlations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    metrics = db.query(HealthMetric).filter(
        HealthMetric.user_id == current_user.id,
    ).order_by(HealthMetric.date.asc()).all()

    result = []
    for m in metrics:
        day_logs = db.query(DoseLog).filter(
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time.like(f"{m.date}%"),
        ).all()
        total = len(day_logs)
        taken = sum(1 for l in day_logs if l.status == "taken")
        adherence = round((taken / total) * 100, 1) if total > 0 else 0

        result.append({
            "date": m.date,
            "adherence_percent": adherence,
            "blood_pressure_systolic": m.blood_pressure_systolic,
            "blood_pressure_diastolic": m.blood_pressure_diastolic,
            "blood_sugar": m.blood_sugar,
            "weight": m.weight,
            "mood": m.mood,
            "pain_level": m.pain_level,
        })

    return result
