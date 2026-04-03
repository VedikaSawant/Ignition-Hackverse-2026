from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── Auth Schemas ────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "patient"
    age: Optional[int] = None
    phone: Optional[str] = None
    conditions: Optional[str] = ""
    linked_caregiver_email: Optional[str] = None
    linked_doctor_email: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    conditions: Optional[str] = None
    profile_photo_url: Optional[str] = None
    linked_caregiver_email: Optional[str] = None
    linked_doctor_email: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    age: Optional[int] = None
    phone: Optional[str] = None
    conditions: Optional[str] = ""
    profile_photo_url: Optional[str] = None
    linked_caregiver_id: Optional[int] = None
    linked_doctor_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Medicine Schemas ────────────────────────────────────────
class MedicineCreate(BaseModel):
    name: str
    dosage: str
    medicine_type: str = "tablet"
    frequency: str = "once"
    times_of_day: List[str] = ["08:00"]
    before_after_food: str = "after"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_quantity: int = 30
    remaining_quantity: Optional[int] = None
    refill_alert_threshold: int = 5


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    medicine_type: Optional[str] = None
    frequency: Optional[str] = None
    times_of_day: Optional[List[str]] = None
    before_after_food: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_quantity: Optional[int] = None
    remaining_quantity: Optional[int] = None
    refill_alert_threshold: Optional[int] = None
    is_paused: Optional[bool] = None


class MedicineOut(BaseModel):
    id: int
    user_id: int
    name: str
    dosage: str
    medicine_type: str
    frequency: str
    times_of_day: list
    before_after_food: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_quantity: int
    remaining_quantity: int
    refill_alert_threshold: int
    is_active: bool
    is_paused: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Dose Schemas ────────────────────────────────────────────
class DoseLogCreate(BaseModel):
    medicine_id: int
    scheduled_time: str
    status: str = "taken"  # taken/skipped
    skip_reason: Optional[str] = None
    actual_taken_time: Optional[str] = None
    logged_by: str = "self"


class DoseLogUpdate(BaseModel):
    status: Optional[str] = None
    skip_reason: Optional[str] = None
    actual_taken_time: Optional[str] = None


class DoseLogOut(BaseModel):
    id: int
    medicine_id: int
    user_id: int
    scheduled_time: str
    actual_taken_time: Optional[str] = None
    status: str
    skip_reason: Optional[str] = None
    logged_by: str
    created_at: Optional[datetime] = None
    medicine_name: Optional[str] = None
    medicine_dosage: Optional[str] = None
    medicine_type: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Health Metric Schemas ───────────────────────────────────
class HealthMetricCreate(BaseModel):
    date: str
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    blood_sugar: Optional[float] = None
    weight: Optional[float] = None
    mood: Optional[int] = None
    pain_level: Optional[int] = None
    notes: Optional[str] = None


class HealthMetricOut(BaseModel):
    id: int
    user_id: int
    date: str
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    blood_sugar: Optional[float] = None
    weight: Optional[float] = None
    mood: Optional[int] = None
    pain_level: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Prediction Schemas ──────────────────────────────────────
class PredictionOut(BaseModel):
    id: int
    user_id: int
    medicine_id: Optional[int] = None
    predicted_date: Optional[str] = None
    predicted_time: Optional[str] = None
    miss_probability: float
    risk_level: str
    ai_insight_text: Optional[str] = None
    created_at: Optional[datetime] = None
    medicine_name: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Alert Schemas ───────────────────────────────────────────
class AlertOut(BaseModel):
    id: int
    user_id: int
    triggered_for_user_id: Optional[int] = None
    alert_type: str
    message: str
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Achievement Schemas ─────────────────────────────────────
class AchievementOut(BaseModel):
    id: int
    user_id: int
    badge_name: str
    badge_icon: Optional[str] = None
    description: Optional[str] = None
    earned_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Analytics Schemas ───────────────────────────────────────
class AdherenceDaily(BaseModel):
    date: str
    adherence_percent: float
    taken: int
    scheduled: int


class AdherenceMedicine(BaseModel):
    medicine_id: int
    medicine_name: str
    adherence_percent: float
    taken: int
    total: int


class StreakData(BaseModel):
    current_streak: int
    longest_streak: int
    streak_history: list


class HeatmapEntry(BaseModel):
    date: str
    adherence_percent: float


# ─── Doctor/Caregiver Schemas ────────────────────────────────
class PatientSummary(BaseModel):
    id: int
    name: str
    email: str
    age: Optional[int] = None
    conditions: Optional[str] = ""
    profile_photo_url: Optional[str] = None
    weekly_adherence: float = 0.0
    risk_level: str = "low"
    medicines_count: int = 0
    last_active: Optional[str] = None


class PrescribeRequest(BaseModel):
    patient_id: int
    name: str
    dosage: str
    medicine_type: str = "tablet"
    frequency: str = "once"
    times_of_day: List[str] = ["08:00"]
    before_after_food: str = "after"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_quantity: int = 30
    refill_alert_threshold: int = 5


# ─── Consult Schemas ─────────────────────────────────────────
class ConsultRequest(BaseModel):
    message: str

class ConsultResponse(BaseModel):
    text_response: str
    audio_b64: Optional[str] = None
    intent: Optional[str] = None

class ConsultLogOut(BaseModel):
    id: int
    user_id: int
    role: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True
