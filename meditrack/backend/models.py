from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="patient")  # patient/caregiver/doctor
    age = Column(Integer, nullable=True)
    phone = Column(String(20), nullable=True)
    conditions = Column(String(500), nullable=True, default="")
    profile_photo_url = Column(String(500), nullable=True)
    linked_caregiver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    linked_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    medicines = relationship("Medicine", back_populates="user", foreign_keys="Medicine.user_id")
    dose_logs = relationship("DoseLog", back_populates="user", foreign_keys="DoseLog.user_id")
    health_metrics = relationship("HealthMetric", back_populates="user")
    predictions = relationship("Prediction", back_populates="user")
    alerts_received = relationship("Alert", back_populates="user", foreign_keys="Alert.user_id")
    achievements = relationship("Achievement", back_populates="user")
    consultations = relationship("ConsultationLog", back_populates="user")

    caregiver = relationship("User", remote_side=[id], foreign_keys=[linked_caregiver_id])
    doctor = relationship("User", remote_side=[id], foreign_keys=[linked_doctor_id])


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    dosage = Column(String(100), nullable=False)
    medicine_type = Column(String(50), default="tablet")  # tablet/syrup/injection/inhaler
    frequency = Column(String(50), default="once")  # once/twice/thrice/custom
    times_of_day = Column(JSON, default=list)  # ["08:00","14:00","21:00"]
    before_after_food = Column(String(20), default="after")  # before/after/with
    start_date = Column(String(20), nullable=True)
    end_date = Column(String(20), nullable=True)
    total_quantity = Column(Integer, default=30)
    remaining_quantity = Column(Integer, default=30)
    refill_alert_threshold = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    is_paused = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="medicines", foreign_keys=[user_id])
    dose_logs = relationship("DoseLog", back_populates="medicine")
    predictions = relationship("Prediction", back_populates="medicine")


class DoseLog(Base):
    __tablename__ = "dose_logs"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_time = Column(String(30), nullable=False)
    actual_taken_time = Column(String(30), nullable=True)
    status = Column(String(20), default="pending")  # taken/missed/skipped/pending
    skip_reason = Column(String(100), nullable=True)
    logged_by = Column(String(20), default="self")  # self/caregiver
    delay_minutes = Column(Integer, default=0)
    behavior_tag = Column(String(50), default="unknown")
    created_at = Column(DateTime, default=datetime.utcnow)

    medicine = relationship("Medicine", back_populates="dose_logs")
    user = relationship("User", back_populates="dose_logs", foreign_keys=[user_id])


class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String(20), nullable=False)
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)
    blood_sugar = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    mood = Column(Integer, nullable=True)  # 1-5
    pain_level = Column(Integer, nullable=True)  # 1-5
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="health_metrics")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    predicted_date = Column(String(20), nullable=True)
    predicted_time = Column(String(10), nullable=True)
    miss_probability = Column(Float, default=0.0)
    risk_level = Column(String(20), default="low")  # low/medium/high
    ai_insight_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="predictions")
    medicine = relationship("Medicine", back_populates="predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    triggered_for_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    alert_type = Column(String(50), nullable=False)  # missed_dose/low_stock/high_risk/streak_broken
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="alerts_received", foreign_keys=[user_id])
    triggered_for = relationship("User", foreign_keys=[triggered_for_user_id])


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_name = Column(String(100), nullable=False)
    badge_icon = Column(String(10), nullable=True)
    description = Column(String(300), nullable=True)
    earned_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="achievements")

class ConsultationLog(Base):
    __tablename__ = "consultation_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(50), nullable=False)  # user/ai/system
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="consultations")
