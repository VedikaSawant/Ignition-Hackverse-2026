from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Medicine, User
from schemas import MedicineCreate, MedicineUpdate, MedicineOut
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/medicines", tags=["medicines"])


@router.get("/", response_model=list[MedicineOut])
def list_medicines(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meds = db.query(Medicine).filter(
        Medicine.user_id == current_user.id,
        Medicine.is_active == True,
    ).all()
    return [MedicineOut.model_validate(m) for m in meds]


@router.post("/", response_model=MedicineOut)
def add_medicine(data: MedicineCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    med = Medicine(
        user_id=current_user.id,
        name=data.name,
        dosage=data.dosage,
        medicine_type=data.medicine_type,
        frequency=data.frequency,
        times_of_day=data.times_of_day,
        before_after_food=data.before_after_food,
        start_date=data.start_date or datetime.utcnow().date().isoformat(),
        end_date=data.end_date,
        total_quantity=data.total_quantity,
        remaining_quantity=data.remaining_quantity if data.remaining_quantity is not None else data.total_quantity,
        refill_alert_threshold=data.refill_alert_threshold,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return MedicineOut.model_validate(med)


@router.put("/{med_id}", response_model=MedicineOut)
def update_medicine(med_id: int, data: MedicineUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(med, field, value)

    db.commit()
    db.refresh(med)
    return MedicineOut.model_validate(med)


@router.delete("/{med_id}")
def delete_medicine(med_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    med.is_active = False
    db.commit()
    return {"message": "Medicine deactivated"}


@router.put("/{med_id}/pause")
def pause_medicine(med_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    med.is_paused = not med.is_paused
    db.commit()
    return {"message": f"Medicine {'paused' if med.is_paused else 'resumed'}", "is_paused": med.is_paused}


@router.get("/{med_id}/schedule")
def get_schedule(med_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {
        "medicine_id": med.id,
        "name": med.name,
        "times_of_day": med.times_of_day,
        "before_after_food": med.before_after_food,
        "is_paused": med.is_paused,
    }
