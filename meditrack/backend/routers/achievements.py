from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Achievement, DoseLog, User
from schemas import AchievementOut
from auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/achievements", tags=["achievements"])

BADGE_DEFS = [
    {"name": "First Step", "icon": "🎯", "desc": "Logged your first dose!"},
    {"name": "Week Warrior", "icon": "🔥", "desc": "Achieved a 7-day streak!"},
    {"name": "Month Master", "icon": "🏆", "desc": "Achieved a 30-day streak!"},
    {"name": "Century Club", "icon": "💊", "desc": "100 doses taken!"},
    {"name": "Perfect Week", "icon": "⭐", "desc": "100% adherence for 7 consecutive days!"},
    {"name": "Comeback Kid", "icon": "💪", "desc": "Resumed after 3+ missed days!"},
    {"name": "Early Bird", "icon": "🌅", "desc": "10 morning doses taken on time!"},
    {"name": "Night Owl", "icon": "🌙", "desc": "10 night doses taken on time!"},
    {"name": "Caregiver Connected", "icon": "👨‍👩‍👧", "desc": "Connected with a caregiver!"},
    {"name": "30-Day Champion", "icon": "🏅", "desc": "30 days of tracking!"},
]


@router.get("/", response_model=list[AchievementOut])
def get_achievements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    earned = db.query(Achievement).filter(
        Achievement.user_id == current_user.id,
    ).order_by(Achievement.earned_at.desc()).all()
    return [AchievementOut.model_validate(a) for a in earned]


@router.get("/all")
def get_all_badges(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    earned = db.query(Achievement).filter(Achievement.user_id == current_user.id).all()
    earned_names = {a.badge_name for a in earned}

    result = []
    for badge in BADGE_DEFS:
        is_earned = badge["name"] in earned_names
        earned_ach = next((a for a in earned if a.badge_name == badge["name"]), None)
        result.append({
            "badge_name": badge["name"],
            "badge_icon": badge["icon"],
            "description": badge["desc"],
            "earned": is_earned,
            "earned_at": earned_ach.earned_at.isoformat() if earned_ach else None,
        })

    return result


@router.get("/points")
def get_points(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    taken_on_time = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.status == "taken",
    ).count()

    # Calculate points
    points = taken_on_time * 10  # +10 per dose taken

    # Perfect days bonus
    today = datetime.utcnow().date()
    for i in range(90):
        d = (today - timedelta(days=i)).isoformat()
        day_logs = db.query(DoseLog).filter(
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time.like(f"{d}%"),
        ).all()
        if day_logs:
            day_taken = sum(1 for dl in day_logs if dl.status == "taken")
            if day_taken == len(day_logs):
                points += 50

    # Streak bonuses
    earned = db.query(Achievement).filter(Achievement.user_id == current_user.id).all()
    for a in earned:
        if a.badge_name == "Week Warrior":
            points += 200
        elif a.badge_name == "Month Master":
            points += 500

    # Level
    if points >= 5000:
        level = "Legend ⭐"
    elif points >= 2001:
        level = "Champion 🏆"
    elif points >= 501:
        level = "Regular 💊"
    else:
        level = "Beginner 🌱"

    return {"points": points, "level": level}


@router.post("/check")
def check_achievements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    earned = db.query(Achievement).filter(Achievement.user_id == current_user.id).all()
    earned_names = {a.badge_name for a in earned}
    new_badges = []

    total_taken = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.status == "taken",
    ).count()

    # Calculate streak
    today = datetime.utcnow().date()
    streak = 0
    for i in range(365):
        d = (today - timedelta(days=i)).isoformat()
        day_logs = db.query(DoseLog).filter(
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time.like(f"{d}%"),
        ).all()
        if not day_logs:
            if i == 0:
                continue
            break
        day_taken = sum(1 for dl in day_logs if dl.status == "taken")
        if (day_taken / len(day_logs)) >= 0.8:
            streak += 1
        else:
            break

    morning_taken = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.status == "taken",
        DoseLog.scheduled_time.like("% 08:%"),
    ).count()

    night_taken = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.status == "taken",
        DoseLog.scheduled_time.like("% 20:%"),
    ).count() + db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.status == "taken",
        DoseLog.scheduled_time.like("% 21:%"),
    ).count()

    checks = {
        "First Step": total_taken >= 1,
        "Week Warrior": streak >= 7,
        "Month Master": streak >= 30,
        "Century Club": total_taken >= 100,
        "Early Bird": morning_taken >= 10,
        "Night Owl": night_taken >= 10,
        "Caregiver Connected": current_user.linked_caregiver_id is not None,
        "30-Day Champion": total_taken >= 30,
    }

    for badge in BADGE_DEFS:
        name = badge["name"]
        if name not in earned_names and checks.get(name, False):
            ach = Achievement(
                user_id=current_user.id,
                badge_name=name,
                badge_icon=badge["icon"],
                description=badge["desc"],
            )
            db.add(ach)
            new_badges.append(name)

    db.commit()
    return {"new_badges": new_badges, "total_earned": len(earned_names) + len(new_badges)}
