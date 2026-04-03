from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Alert, User
from schemas import AlertOut
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/", response_model=list[AlertOut])
def get_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(Alert).filter(
        Alert.user_id == current_user.id,
    ).order_by(Alert.created_at.desc()).limit(50).all()
    return [AlertOut.model_validate(a) for a in alerts]


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Alert).filter(
        Alert.user_id == current_user.id,
        Alert.is_read == False,
    ).count()
    return {"count": count}


@router.put("/{alert_id}/read")
def mark_read(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"message": "Alert marked as read"}


@router.post("/test")
def test_alert(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = Alert(
        user_id=current_user.id,
        triggered_for_user_id=current_user.id,
        alert_type="missed_dose",
        message="This is a test alert for demo purposes",
    )
    db.add(alert)
    db.commit()
    return {"message": "Test alert created"}


@router.put("/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Alert).filter(
        Alert.user_id == current_user.id,
        Alert.is_read == False,
    ).update({Alert.is_read: True})
    db.commit()
    return {"message": "All alerts marked as read"}
