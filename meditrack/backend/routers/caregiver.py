from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Medicine, DoseLog, Alert, HealthMetric
from schemas import PatientSummary, AlertOut, DoseLogCreate, DoseLogOut
from auth import get_current_user, require_role
from predictions import compute_risk_score, generate_weekly_summary
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/caregiver", tags=["caregiver"])


@router.get("/patients", response_model=list[PatientSummary])
def list_patients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "caregiver":
        raise HTTPException(status_code=403, detail="Not a caregiver")

    patients = db.query(User).filter(
        User.linked_caregiver_id == current_user.id,
        User.role == "patient",
    ).all()

    today = datetime.utcnow().date()
    cutoff = (today - timedelta(days=7)).isoformat()
    result = []

    for p in patients:
        logs = db.query(DoseLog).filter(
            DoseLog.user_id == p.id,
            DoseLog.scheduled_time >= cutoff,
        ).all()
        taken = sum(1 for l in logs if l.status == "taken")
        weekly = round((taken / len(logs)) * 100, 1) if logs else 0

        risk = compute_risk_score(db, p.id)
        meds_count = db.query(Medicine).filter(Medicine.user_id == p.id, Medicine.is_active == True).count()

        last_log = db.query(DoseLog).filter(
            DoseLog.user_id == p.id, DoseLog.status == "taken"
        ).order_by(DoseLog.created_at.desc()).first()

        result.append(PatientSummary(
            id=p.id,
            name=p.name,
            email=p.email,
            age=p.age,
            conditions=p.conditions,
            profile_photo_url=p.profile_photo_url,
            weekly_adherence=weekly,
            risk_level=risk["risk_level"],
            medicines_count=meds_count,
            last_active=last_log.created_at.isoformat() if last_log and last_log.created_at else None,
        ))

    return result


@router.get("/patients/{patient_id}/summary")
def patient_summary(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "caregiver":
        raise HTTPException(status_code=403, detail="Not a caregiver")

    patient = db.query(User).filter(User.id == patient_id, User.linked_caregiver_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or not linked")

    today = datetime.utcnow().date()
    cutoff_7 = (today - timedelta(days=7)).isoformat()
    cutoff_30 = (today - timedelta(days=30)).isoformat()

    logs_7 = db.query(DoseLog).filter(DoseLog.user_id == patient_id, DoseLog.scheduled_time >= cutoff_7).all()
    logs_30 = db.query(DoseLog).filter(DoseLog.user_id == patient_id, DoseLog.scheduled_time >= cutoff_30).all()

    taken_7 = sum(1 for l in logs_7 if l.status == "taken")
    taken_30 = sum(1 for l in logs_30 if l.status == "taken")

    risk = compute_risk_score(db, patient_id)
    medicines = db.query(Medicine).filter(Medicine.user_id == patient_id, Medicine.is_active == True).all()

    # Today's schedule
    today_str = today.isoformat()
    today_doses = db.query(DoseLog).filter(
        DoseLog.user_id == patient_id,
        DoseLog.scheduled_time.like(f"{today_str}%"),
    ).all()

    today_schedule = []
    for d in today_doses:
        med = db.query(Medicine).filter(Medicine.id == d.medicine_id).first()
        today_schedule.append({
            "dose_id": d.id,
            "medicine_name": med.name if med else "Unknown",
            "medicine_dosage": med.dosage if med else "",
            "scheduled_time": d.scheduled_time,
            "status": d.status,
        })

    missed_recent = db.query(DoseLog).filter(
        DoseLog.user_id == patient_id,
        DoseLog.status == "missed",
        DoseLog.scheduled_time >= cutoff_7,
    ).order_by(DoseLog.scheduled_time.desc()).limit(10).all()

    missed_list = []
    for m in missed_recent:
        med = db.query(Medicine).filter(Medicine.id == m.medicine_id).first()
        missed_list.append({
            "medicine_name": med.name if med else "Unknown",
            "scheduled_time": m.scheduled_time,
            "skip_reason": m.skip_reason,
        })

    # Daily adherence for chart
    daily = []
    for i in range(6, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        day_logs = [l for l in logs_7 if l.scheduled_time.startswith(d)]
        total = len(day_logs)
        t = sum(1 for l in day_logs if l.status == "taken")
        pct = round((t / total) * 100, 1) if total > 0 else 0
        daily.append({"date": d, "adherence_percent": pct})

    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "conditions": patient.conditions,
            "email": patient.email,
        },
        "weekly_adherence": round((taken_7 / len(logs_7)) * 100, 1) if logs_7 else 0,
        "monthly_adherence": round((taken_30 / len(logs_30)) * 100, 1) if logs_30 else 0,
        "risk": risk,
        "medicines": [{"id": m.id, "name": m.name, "dosage": m.dosage, "type": m.medicine_type} for m in medicines],
        "today_schedule": today_schedule,
        "missed_recent": missed_list,
        "daily_adherence": daily,
    }


@router.get("/alerts", response_model=list[AlertOut])
def caregiver_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(Alert).filter(
        Alert.user_id == current_user.id,
    ).order_by(Alert.created_at.desc()).limit(50).all()
    return [AlertOut.model_validate(a) for a in alerts]


@router.post("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"message": "Alert marked as read"}


@router.post("/doses/confirm")
def confirm_dose(data: DoseLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "caregiver":
        raise HTTPException(status_code=403, detail="Not a caregiver")

    data.logged_by = "caregiver"
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    existing = db.query(DoseLog).filter(
        DoseLog.medicine_id == data.medicine_id,
        DoseLog.scheduled_time == data.scheduled_time,
    ).first()

    if existing:
        existing.status = data.status
        existing.actual_taken_time = now if data.status == "taken" else None
        existing.logged_by = "caregiver"
        db.commit()
        db.refresh(existing)
        return DoseLogOut.model_validate(existing)

    dose = DoseLog(
        medicine_id=data.medicine_id,
        user_id=data.medicine_id,  # Will need patient's user_id
        scheduled_time=data.scheduled_time,
        actual_taken_time=now if data.status == "taken" else None,
        status=data.status,
        logged_by="caregiver",
    )
    db.add(dose)
    db.commit()
    db.refresh(dose)
    return DoseLogOut.model_validate(dose)


@router.get("/patients/{patient_id}/report")
def patient_report(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    today = datetime.utcnow().date()
    cutoff_30 = (today - timedelta(days=30)).isoformat()
    logs = db.query(DoseLog).filter(DoseLog.user_id == patient_id, DoseLog.scheduled_time >= cutoff_30).all()
    taken = sum(1 for l in logs if l.status == "taken")
    missed = sum(1 for l in logs if l.status == "missed")

    medicines = db.query(Medicine).filter(Medicine.user_id == patient_id, Medicine.is_active == True).all()
    health = db.query(HealthMetric).filter(HealthMetric.user_id == patient_id).order_by(HealthMetric.date.desc()).limit(10).all()

    return {
        "patient_name": patient.name,
        "patient_age": patient.age,
        "conditions": patient.conditions,
        "report_period": f"{cutoff_30} to {today.isoformat()}",
        "total_doses": len(logs),
        "taken": taken,
        "missed": missed,
        "adherence_percent": round((taken / len(logs)) * 100, 1) if logs else 0,
        "medicines": [{"name": m.name, "dosage": m.dosage} for m in medicines],
        "health_metrics": [{"date": h.date, "bp": f"{h.blood_pressure_systolic}/{h.blood_pressure_diastolic}", "sugar": h.blood_sugar} for h in health],
    }
