from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Medicine, DoseLog, HealthMetric
from schemas import PatientSummary, PrescribeRequest, MedicineOut
from auth import get_current_user
from predictions import compute_risk_score
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/doctor", tags=["doctor"])


@router.get("/patients", response_model=list[PatientSummary])
def list_patients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Not a doctor")

    patients = db.query(User).filter(
        User.linked_doctor_id == current_user.id,
        User.role == "patient",
    ).all()

    today = datetime.utcnow().date()
    cutoff = (today - timedelta(days=30)).isoformat()
    result = []

    for p in patients:
        logs = db.query(DoseLog).filter(
            DoseLog.user_id == p.id,
            DoseLog.scheduled_time >= cutoff,
        ).all()
        taken = sum(1 for l in logs if l.status == "taken")
        adherence = round((taken / len(logs)) * 100, 1) if logs else 0

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
            weekly_adherence=adherence,
            risk_level=risk["risk_level"],
            medicines_count=meds_count,
            last_active=last_log.created_at.isoformat() if last_log and last_log.created_at else None,
        ))

    return result


@router.get("/patients/{patient_id}/report")
def patient_report(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Not a doctor")

    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    today = datetime.utcnow().date()
    cutoff = (today - timedelta(days=30)).isoformat()

    logs = db.query(DoseLog).filter(DoseLog.user_id == patient_id, DoseLog.scheduled_time >= cutoff).all()
    taken = sum(1 for l in logs if l.status == "taken")
    missed = sum(1 for l in logs if l.status == "missed")

    medicines = db.query(Medicine).filter(Medicine.user_id == patient_id, Medicine.is_active == True).all()

    med_breakdown = []
    for med in medicines:
        med_logs = [l for l in logs if l.medicine_id == med.id]
        med_taken = sum(1 for l in med_logs if l.status == "taken")
        med_total = len(med_logs)
        med_breakdown.append({
            "medicine_name": med.name,
            "dosage": med.dosage,
            "type": med.medicine_type,
            "frequency": med.frequency,
            "taken": med_taken,
            "total": med_total,
            "adherence_percent": round((med_taken / med_total) * 100, 1) if med_total > 0 else 0,
        })

    health = db.query(HealthMetric).filter(
        HealthMetric.user_id == patient_id,
    ).order_by(HealthMetric.date.desc()).limit(15).all()

    health_data = [{
        "date": h.date,
        "bp_systolic": h.blood_pressure_systolic,
        "bp_diastolic": h.blood_pressure_diastolic,
        "blood_sugar": h.blood_sugar,
        "weight": h.weight,
        "mood": h.mood,
        "pain_level": h.pain_level,
    } for h in health]

    risk = compute_risk_score(db, patient_id)

    # Daily adherence trend
    daily = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        day_logs = [l for l in logs if l.scheduled_time.startswith(d)]
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
            "phone": patient.phone,
        },
        "report_period": f"Last 30 days ({cutoff} to {today.isoformat()})",
        "overall_adherence": round((taken / len(logs)) * 100, 1) if logs else 0,
        "total_doses": len(logs),
        "taken": taken,
        "missed": missed,
        "risk": risk,
        "medicine_breakdown": med_breakdown,
        "health_metrics": health_data,
        "daily_adherence": daily,
    }


@router.post("/prescribe", response_model=MedicineOut)
def prescribe(data: PrescribeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Not a doctor")

    patient = db.query(User).filter(User.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    med = Medicine(
        user_id=data.patient_id,
        name=data.name,
        dosage=data.dosage,
        medicine_type=data.medicine_type,
        frequency=data.frequency,
        times_of_day=data.times_of_day,
        before_after_food=data.before_after_food,
        start_date=data.start_date or datetime.utcnow().date().isoformat(),
        end_date=data.end_date,
        total_quantity=data.total_quantity,
        remaining_quantity=data.total_quantity,
        refill_alert_threshold=data.refill_alert_threshold,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return MedicineOut.model_validate(med)


@router.get("/non-compliant")
def non_compliant(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Not a doctor")

    patients = db.query(User).filter(
        User.linked_doctor_id == current_user.id,
        User.role == "patient",
    ).all()

    today = datetime.utcnow().date()
    cutoff = (today - timedelta(days=30)).isoformat()
    non_compliant_list = []

    for p in patients:
        logs = db.query(DoseLog).filter(
            DoseLog.user_id == p.id,
            DoseLog.scheduled_time >= cutoff,
        ).all()
        taken = sum(1 for l in logs if l.status == "taken")
        adherence = round((taken / len(logs)) * 100, 1) if logs else 0

        if adherence < 60:
            non_compliant_list.append({
                "id": p.id,
                "name": p.name,
                "age": p.age,
                "conditions": p.conditions,
                "adherence_percent": adherence,
            })

    return non_compliant_list
