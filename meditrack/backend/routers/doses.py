from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import DoseLog, Medicine, User
from schemas import DoseLogCreate, DoseLogUpdate, DoseLogOut
from auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/doses", tags=["doses"])


@router.get("/today", response_model=list[DoseLogOut])
def get_today_doses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()

    # Get all active medicines
    medicines = db.query(Medicine).filter(
        Medicine.user_id == current_user.id,
        Medicine.is_active == True,
        Medicine.is_paused == False,
    ).all()

    results = []
    for med in medicines:
        times = med.times_of_day or []
        for time_str in times:
            scheduled = f"{today} {time_str}"
            existing = db.query(DoseLog).filter(
                DoseLog.medicine_id == med.id,
                DoseLog.user_id == current_user.id,
                DoseLog.scheduled_time == scheduled,
            ).first()

            if existing:
                out = DoseLogOut.model_validate(existing)
                out.medicine_name = med.name
                out.medicine_dosage = med.dosage
                out.medicine_type = med.medicine_type
                results.append(out)
            else:
                # Create pending dose log
                dose = DoseLog(
                    medicine_id=med.id,
                    user_id=current_user.id,
                    scheduled_time=scheduled,
                    status="pending",
                )
                db.add(dose)
                db.flush()
                out = DoseLogOut.model_validate(dose)
                out.medicine_name = med.name
                out.medicine_dosage = med.dosage
                out.medicine_type = med.medicine_type
                results.append(out)

    db.commit()
    results.sort(key=lambda x: x.scheduled_time)
    return results


@router.post("/log", response_model=DoseLogOut)
def log_dose(data: DoseLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    med = db.query(Medicine).filter(Medicine.id == data.medicine_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")

    # Check if dose log already exists for this scheduled time
    existing = db.query(DoseLog).filter(
        DoseLog.medicine_id == data.medicine_id,
        DoseLog.user_id == current_user.id,
        DoseLog.scheduled_time == data.scheduled_time,
    ).first()

    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    if existing:
        existing.status = data.status
        existing.actual_taken_time = data.actual_taken_time or (now if data.status == "taken" else None)
        existing.skip_reason = data.skip_reason
        existing.logged_by = data.logged_by
        db.commit()
        db.refresh(existing)
        out = DoseLogOut.model_validate(existing)
        out.medicine_name = med.name
        out.medicine_dosage = med.dosage
        out.medicine_type = med.medicine_type
    else:
        dose = DoseLog(
            medicine_id=data.medicine_id,
            user_id=current_user.id,
            scheduled_time=data.scheduled_time,
            actual_taken_time=data.actual_taken_time or (now if data.status == "taken" else None),
            status=data.status,
            skip_reason=data.skip_reason,
            logged_by=data.logged_by,
        )
        db.add(dose)
        db.commit()
        db.refresh(dose)
        out = DoseLogOut.model_validate(dose)
        out.medicine_name = med.name
        out.medicine_dosage = med.dosage
        out.medicine_type = med.medicine_type

    # If taken, reduce remaining quantity
    if data.status == "taken" and med.remaining_quantity > 0:
        med.remaining_quantity -= 1
        db.commit()

    return out


@router.get("/history", response_model=list[DoseLogOut])
def get_history(
    days: int = Query(default=30),
    medicine_id: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = (datetime.utcnow() - timedelta(days=days)).date().isoformat()

    query = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.scheduled_time >= cutoff,
    )
    if medicine_id:
        query = query.filter(DoseLog.medicine_id == medicine_id)

    logs = query.order_by(DoseLog.scheduled_time.desc()).all()

    results = []
    for log in logs:
        med = db.query(Medicine).filter(Medicine.id == log.medicine_id).first()
        out = DoseLogOut.model_validate(log)
        if med:
            out.medicine_name = med.name
            out.medicine_dosage = med.dosage
            out.medicine_type = med.medicine_type
        results.append(out)

    return results


@router.put("/{dose_id}", response_model=DoseLogOut)
def update_dose(dose_id: int, data: DoseLogUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dose = db.query(DoseLog).filter(DoseLog.id == dose_id, DoseLog.user_id == current_user.id).first()
    if not dose:
        raise HTTPException(status_code=404, detail="Dose log not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(dose, field, value)

    db.commit()
    db.refresh(dose)
    med = db.query(Medicine).filter(Medicine.id == dose.medicine_id).first()
    out = DoseLogOut.model_validate(dose)
    if med:
        out.medicine_name = med.name
        out.medicine_dosage = med.dosage
        out.medicine_type = med.medicine_type
    return out


@router.get("/missed", response_model=list[DoseLogOut])
def get_missed(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cutoff = (datetime.utcnow() - timedelta(days=7)).date().isoformat()
    logs = db.query(DoseLog).filter(
        DoseLog.user_id == current_user.id,
        DoseLog.status == "missed",
        DoseLog.scheduled_time >= cutoff,
    ).order_by(DoseLog.scheduled_time.desc()).all()

    results = []
    for log in logs:
        med = db.query(Medicine).filter(Medicine.id == log.medicine_id).first()
        out = DoseLogOut.model_validate(log)
        if med:
            out.medicine_name = med.name
            out.medicine_dosage = med.dosage
            out.medicine_type = med.medicine_type
        results.append(out)
    return results
