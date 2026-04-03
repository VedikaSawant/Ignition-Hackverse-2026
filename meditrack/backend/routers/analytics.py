from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import DoseLog, Medicine, User
from auth import get_current_user
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/adherence/daily")
def daily_adherence(
    days: int = Query(default=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = []
    today = datetime.utcnow().date()

    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        logs = db.query(DoseLog).filter(
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time.like(f"{d}%"),
        ).all()
        total = len(logs)
        taken = sum(1 for l in logs if l.status == "taken")
        pct = round((taken / total) * 100, 1) if total > 0 else 0
        result.append({"date": d, "adherence_percent": pct, "taken": taken, "scheduled": total})

    return result


@router.get("/adherence/weekly")
def weekly_adherence(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicines = db.query(Medicine).filter(
        Medicine.user_id == current_user.id,
        Medicine.is_active == True,
    ).all()

    today = datetime.utcnow().date()
    cutoff = (today - timedelta(days=7)).isoformat()

    result = []
    for med in medicines:
        logs = db.query(DoseLog).filter(
            DoseLog.medicine_id == med.id,
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time >= cutoff,
        ).all()
        total = len(logs)
        taken = sum(1 for l in logs if l.status == "taken")
        pct = round((taken / total) * 100, 1) if total > 0 else 0
        result.append({
            "medicine_id": med.id,
            "medicine_name": med.name,
            "adherence_percent": pct,
            "taken": taken,
            "total": total,
        })

    return result


@router.get("/adherence/per-medicine")
def per_medicine_adherence(
    days: int = Query(default=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicines = db.query(Medicine).filter(
        Medicine.user_id == current_user.id,
        Medicine.is_active == True,
    ).all()

    cutoff = (datetime.utcnow().date() - timedelta(days=days)).isoformat()
    result = []

    for med in medicines:
        logs = db.query(DoseLog).filter(
            DoseLog.medicine_id == med.id,
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time >= cutoff,
        ).all()
        total = len(logs)
        taken = sum(1 for l in logs if l.status == "taken")
        pct = round((taken / total) * 100, 1) if total > 0 else 0
        result.append({
            "medicine_id": med.id,
            "medicine_name": med.name,
            "adherence_percent": pct,
            "taken": taken,
            "total": total,
        })

    return result


@router.get("/heatmap")
def heatmap_data(
    weeks: int = Query(default=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.utcnow().date()
    result = []

    for i in range(weeks * 7 - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        logs = db.query(DoseLog).filter(
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time.like(f"{d}%"),
        ).all()
        total = len(logs)
        taken = sum(1 for l in logs if l.status == "taken")
        pct = round((taken / total) * 100, 1) if total > 0 else -1  # -1 = no data
        result.append({"date": d, "adherence_percent": pct})

    return result


@router.get("/streak")
def streak_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.utcnow().date()

    # Calculate current streak
    current_streak = 0
    grace_used = False
    streak_history = []

    for i in range(365):
        d = (today - timedelta(days=i)).isoformat()
        logs = db.query(DoseLog).filter(
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time.like(f"{d}%"),
        ).all()

        if not logs:
            if i == 0:
                continue  # Today might not have all doses yet
            break

        total = len(logs)
        taken = sum(1 for l in logs if l.status == "taken")
        pct = (taken / total) * 100 if total > 0 else 0

        if pct >= 80:
            current_streak += 1
            streak_history.append({"date": d, "adherent": True})
        elif not grace_used:
            grace_used = True
            current_streak += 1
            streak_history.append({"date": d, "adherent": True, "grace": True})
        else:
            streak_history.append({"date": d, "adherent": False})
            break

    # Calculate longest streak (scan all data)
    longest_streak = 0
    temp_streak = 0
    all_dates = set()

    all_logs = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
    ).all()

    for log in all_logs:
        try:
            d = log.scheduled_time.split(" ")[0]
            all_dates.add(d)
        except Exception:
            pass

    sorted_dates = sorted(all_dates)
    temp_streak = 0

    for d in sorted_dates:
        day_logs = [l for l in all_logs if l.scheduled_time.startswith(d)]
        total = len(day_logs)
        taken = sum(1 for l in day_logs if l.status == "taken")
        pct = (taken / total) * 100 if total > 0 else 0

        if pct >= 80:
            temp_streak += 1
            longest_streak = max(longest_streak, temp_streak)
        else:
            temp_streak = 0

    return {
        "current_streak": current_streak,
        "longest_streak": max(longest_streak, current_streak),
        "streak_history": streak_history[:14],  # Last 14 days
    }


@router.get("/report")
def adherence_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.utcnow().date()
    cutoff_7 = (today - timedelta(days=7)).isoformat()
    cutoff_30 = (today - timedelta(days=30)).isoformat()

    logs_7 = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.scheduled_time >= cutoff_7,
    ).all()

    logs_30 = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.scheduled_time >= cutoff_30,
    ).all()

    taken_7 = sum(1 for l in logs_7 if l.status == "taken")
    taken_30 = sum(1 for l in logs_30 if l.status == "taken")

    return {
        "patient_name": current_user.name,
        "weekly_adherence": round((taken_7 / len(logs_7)) * 100, 1) if logs_7 else 0,
        "monthly_adherence": round((taken_30 / len(logs_30)) * 100, 1) if logs_30 else 0,
        "total_doses_7d": len(logs_7),
        "taken_doses_7d": taken_7,
        "missed_doses_7d": sum(1 for l in logs_7 if l.status == "missed"),
        "total_doses_30d": len(logs_30),
        "taken_doses_30d": taken_30,
        "missed_doses_30d": sum(1 for l in logs_30 if l.status == "missed"),
    }


@router.get("/missed-patterns")
def missed_patterns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = (datetime.utcnow().date() - timedelta(days=30)).isoformat()

    missed = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.status == "missed",
        DoseLog.scheduled_time >= cutoff,
    ).all()

    day_counts = defaultdict(int)
    time_counts = defaultdict(int)
    reason_counts = defaultdict(int)

    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    for log in missed:
        try:
            date_str = log.scheduled_time.split(" ")[0]
            dt = datetime.fromisoformat(date_str)
            day_counts[days_of_week[dt.weekday()]] += 1

            if " " in log.scheduled_time:
                time_str = log.scheduled_time.split(" ")[1]
                hour = int(time_str.split(":")[0])
                if hour < 12:
                    time_counts["Morning"] += 1
                elif hour < 17:
                    time_counts["Afternoon"] += 1
                else:
                    time_counts["Evening"] += 1

            if log.skip_reason:
                reason_counts[log.skip_reason] += 1
        except Exception:
            continue

    most_missed_day = max(day_counts, key=day_counts.get) if day_counts else "N/A"
    most_missed_time = max(time_counts, key=time_counts.get) if time_counts else "N/A"

    return {
        "most_missed_day": most_missed_day,
        "most_missed_time": most_missed_time,
        "day_breakdown": dict(day_counts),
        "time_breakdown": dict(time_counts),
        "reason_breakdown": dict(reason_counts),
        "total_missed": len(missed),
        "summary": f"Most missed: {most_missed_time} doses on {most_missed_day}s",
    }
