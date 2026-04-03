from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any

from database import get_db
from models import DoseLog, User
from auth import get_current_user
import predictions

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

@router.get("/metrics")
def get_intelligence_metrics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns AI Behavioral analytics for the user's dashboard."""
    logs = db.query(DoseLog).filter(DoseLog.user_id == current_user.id).all()
    
    # Adherence Trend (last 7 days mapping)
    trends = []
    today = datetime.utcnow().date()
    for i in range(6, -1, -1):
        target_day = today - timedelta(days=i)
        day_logs = [l for l in logs if l.scheduled_time.startswith(target_day.isoformat())]
        taken_count = sum(1 for d in day_logs if d.status == "taken")
        adherence = (taken_count / len(day_logs) * 100) if day_logs else 100
        trends.append({
            "date": target_day.strftime("%a"),
            "adherence": round(adherence, 1)
        })

    # Behavior Breakdown Pie Chart
    behavior_counts = {"forgetfulness": 0, "busy": 0, "side_effects": 0, "intentional_skip": 0, "unknown": 0, "on_time": 0}
    for l in logs:
        tag = l.behavior_tag or "unknown"
        if tag in behavior_counts:
            behavior_counts[tag] += 1
        elif tag != "unknown":
            behavior_counts["unknown"] += 1

    # Format for chart.js Pie
    behaviors = []
    for k, v in behavior_counts.items():
        if v > 0 and k != "on_time":
            behaviors.append({"label": k.replace("_", " ").title(), "value": v})

    return {
        "trends": trends,
        "behaviors": behaviors
    }

@router.get("/ml-stats")
def get_ml_pipeline_stats(current_user: User = Depends(get_current_user)):
    """Exposes global ML pipeline metrics initialized in predictions."""
    if not predictions.ml_models:
        return {"status": "untrained", "message": "ML Pipeline requires more synthetic data."}
    
    return {
        "status": "trained",
        "models": ["XGBoost", "Random Forest", "Logistic Regression"],
        "metrics": predictions.ml_metrics,
        "feature_importances": predictions.feature_importances[:5]  # Top 5
    }
