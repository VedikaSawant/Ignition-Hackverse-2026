from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, DoseLog, Medicine, Prediction, HealthMetric
from schemas import PredictionOut
from auth import get_current_user
from predictions import (
    compute_risk_score,
    generate_adherence_insight,
    generate_weekly_summary,
    generate_predictions_for_user,
    train_ml_model,
    analyze_behavioral_patterns,
    generate_behavioral_narrative,
)
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/risk-score")
def risk_score(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return compute_risk_score(db, current_user.id)


@router.get("/behavioral-suite")
def behavioral_suite(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch the full suite of detected behavioral patterns and the clinical narrative."""
    patterns = analyze_behavioral_patterns(db, current_user.id)
    narrative = generate_behavioral_narrative(db, current_user.id)
    return {
        "patterns": patterns,
        "narrative": narrative
    }


@router.get("/next-miss")
def next_miss(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    preds = db.query(Prediction).filter(
        Prediction.user_id == current_user.id,
        Prediction.predicted_date >= datetime.utcnow().date().isoformat(),
    ).order_by(Prediction.miss_probability.desc()).limit(1).first()

    if preds:
        med = db.query(Medicine).filter(Medicine.id == preds.medicine_id).first()
        return {
            "medicine_name": med.name if med else "Unknown",
            "medicine_id": preds.medicine_id,
            "predicted_date": preds.predicted_date,
            "predicted_time": preds.predicted_time,
            "miss_probability": round(preds.miss_probability * 100, 1),
            "risk_level": preds.risk_level,
        }
    return {
        "medicine_name": "N/A",
        "predicted_date": None,
        "predicted_time": None,
        "miss_probability": 0,
        "risk_level": "low",
    }


@router.post("/generate")
def generate(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    train_ml_model(db)
    generate_predictions_for_user(db, current_user.id)
    return {"message": "Predictions generated successfully"}


@router.get("/insights")
def insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Gather patient data for Gemini
    today = datetime.utcnow().date()
    cutoff_7 = (today - timedelta(days=7)).isoformat()

    logs_7 = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.scheduled_time >= cutoff_7,
    ).all()

    taken = sum(1 for l in logs_7 if l.status == "taken")
    weekly_rate = round((taken / len(logs_7)) * 100) if logs_7 else 75

    # Find most missed medicine
    missed_by_med = defaultdict(int)
    for l in logs_7:
        if l.status == "missed":
            med = db.query(Medicine).filter(Medicine.id == l.medicine_id).first()
            if med:
                missed_by_med[med.name] += 1

    most_missed = max(missed_by_med, key=missed_by_med.get) if missed_by_med else "None"

    # Most missed time
    time_counts = defaultdict(int)
    for l in logs_7:
        if l.status == "missed":
            try:
                t = l.scheduled_time.split(" ")[1]
                hour = int(t.split(":")[0])
                if hour < 12:
                    time_counts["Morning"] += 1
                elif hour < 17:
                    time_counts["Afternoon"] += 1
                else:
                    time_counts["Evening"] += 1
            except Exception:
                pass
    most_missed_time = max(time_counts, key=time_counts.get) if time_counts else "Evening"

    # Streak
    streak = 0
    for i in range(365):
        d = (today - timedelta(days=i)).isoformat()
        day_logs = [l for l in logs_7 if l.scheduled_time.startswith(d)] if i < 7 else []
        if not day_logs and i > 0:
            all_day = db.query(DoseLog).filter(
                DoseLog.user_id == current_user.id,
                DoseLog.scheduled_time.like(f"{d}%"),
            ).all()
            day_logs = all_day
        if not day_logs:
            if i == 0:
                continue
            break
        day_taken = sum(1 for dl in day_logs if dl.status == "taken")
        if (day_taken / len(day_logs)) >= 0.8:
            streak += 1
        else:
            break

    # Reasons
    reasons = defaultdict(int)
    for l in logs_7:
        if l.skip_reason:
            reasons[l.skip_reason] += 1

    # Health trends
    health = db.query(HealthMetric).filter(
        HealthMetric.user_id == current_user.id
    ).order_by(HealthMetric.date.desc()).limit(5).all()

    bp_values = [h.blood_pressure_systolic for h in health if h.blood_pressure_systolic]
    sugar_values = [h.blood_sugar for h in health if h.blood_sugar]

    bp_trend = "stable"
    if len(bp_values) >= 2:
        bp_trend = "rising" if bp_values[0] > bp_values[-1] + 5 else "falling" if bp_values[0] < bp_values[-1] - 5 else "stable"

    sugar_trend = "stable"
    if len(sugar_values) >= 2:
        sugar_trend = "rising" if sugar_values[0] > sugar_values[-1] + 10 else "falling" if sugar_values[0] < sugar_values[-1] - 10 else "stable"

    patient_data = {
        "age": current_user.age or "N/A",
        "conditions": current_user.conditions or "N/A",
        "weekly_rate": weekly_rate,
        "most_missed_medicine": most_missed,
        "most_missed_time": most_missed_time,
        "current_streak": streak,
        "miss_reasons": dict(reasons) if reasons else "forgot",
        "bp_trend": bp_trend,
        "sugar_trend": sugar_trend,
    }

    insight = generate_adherence_insight(patient_data)

    # Weekly summary
    medicines = db.query(Medicine).filter(
        Medicine.user_id == current_user.id,
        Medicine.is_active == True,
    ).all()

    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_rates = {}
    for i in range(7):
        d = (today - timedelta(days=i)).isoformat()
        day_logs = db.query(DoseLog).filter(
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time.like(f"{d}%"),
        ).all()
        if day_logs:
            dt = datetime.fromisoformat(d)
            dn = days_of_week[dt.weekday()]
            day_taken = sum(1 for dl in day_logs if dl.status == "taken")
            day_rates[dn] = round((day_taken / len(day_logs)) * 100)

    best_day = max(day_rates, key=day_rates.get) if day_rates else "Monday"
    worst_day = min(day_rates, key=day_rates.get) if day_rates else "Sunday"

    summary_data = {
        "name": current_user.name,
        "age": current_user.age,
        "conditions": current_user.conditions,
        "weekly_rate": weekly_rate,
        "best_day": best_day,
        "worst_day": worst_day,
        "medicines": ", ".join(m.name for m in medicines),
        "current_streak": streak,
        "missed_count": sum(1 for l in logs_7 if l.status == "missed"),
    }

    weekly_summary = generate_weekly_summary(summary_data)

    return {
        "insight": insight,
        "weekly_summary": weekly_summary,
        "patient_data": patient_data,
    }
