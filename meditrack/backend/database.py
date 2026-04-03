from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./meditrack.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)


def seed_demo_data():
    """Seed demo data for hackathon judges."""
    from models import User, Medicine, DoseLog, HealthMetric, Achievement, Alert
    from passlib.context import CryptContext
    from datetime import datetime, timedelta
    import random
    import json

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    db = SessionLocal()

    if db.query(User).filter(User.email == "patient@demo.com").first():
        db.close()
        return

    # Create demo users
    doctor = User(
        name="Dr. Anand Sharma",
        email="doctor@demo.com",
        password_hash=pwd_context.hash("demo123"),
        role="doctor",
        age=45,
        phone="+91-9876543210",
        conditions="",
        profile_photo_url="",
    )
    db.add(doctor)
    db.flush()

    caregiver = User(
        name="Priya Kumar",
        email="caregiver@demo.com",
        password_hash=pwd_context.hash("demo123"),
        role="caregiver",
        age=32,
        phone="+91-9876543211",
        conditions="",
        profile_photo_url="",
    )
    db.add(caregiver)
    db.flush()

    patient = User(
        name="Rajesh Kumar",
        email="patient@demo.com",
        password_hash=pwd_context.hash("demo123"),
        role="patient",
        age=58,
        phone="+91-9876543212",
        conditions="Type 2 Diabetes, Hypertension",
        profile_photo_url="",
        linked_caregiver_id=caregiver.id,
        linked_doctor_id=doctor.id,
    )
    db.add(patient)
    db.flush()

    # Create medicines for patient
    today = datetime.utcnow().date()
    start_date = (today - timedelta(days=45)).isoformat()

    metformin = Medicine(
        user_id=patient.id,
        name="Metformin",
        dosage="500mg",
        medicine_type="tablet",
        frequency="twice",
        times_of_day=["08:00", "20:00"],
        before_after_food="after",
        start_date=start_date,
        end_date=None,
        total_quantity=90,
        remaining_quantity=22,
        refill_alert_threshold=10,
        is_active=True,
        is_paused=False,
    )
    db.add(metformin)

    amlodipine = Medicine(
        user_id=patient.id,
        name="Amlodipine",
        dosage="5mg",
        medicine_type="tablet",
        frequency="once",
        times_of_day=["08:00"],
        before_after_food="before",
        start_date=start_date,
        end_date=None,
        total_quantity=60,
        remaining_quantity=18,
        refill_alert_threshold=7,
        is_active=True,
        is_paused=False,
    )
    db.add(amlodipine)
    db.flush()

    # Generate 45 days of dose logs
    random.seed(42)
    dose_logs = []
    health_entries = []

    for day_offset in range(45, -1, -1):
        log_date = today - timedelta(days=day_offset)
        day_of_week = log_date.weekday()
        is_weekend = day_of_week >= 5
        is_recent = day_offset < 14  # last 2 weeks show improvement

        # Morning Metformin (08:00) - 85% taken (higher recently)
        morning_rate = 0.92 if is_recent else (0.70 if is_weekend else 0.85)
        taken = random.random() < morning_rate
        skip_reasons = ["forgot", "travelling", "side_effects", "out_of_stock", "other"]
        dose_logs.append(DoseLog(
            medicine_id=metformin.id,
            user_id=patient.id,
            scheduled_time=f"{log_date.isoformat()} 08:00",
            actual_taken_time=f"{log_date.isoformat()} 08:{random.randint(0,15):02d}" if taken else None,
            status="taken" if taken else "missed",
            skip_reason=None if taken else random.choice(skip_reasons),
            logged_by="self",
        ))

        # Evening Metformin (20:00) - 62% taken (lower on weekends)
        evening_rate = 0.78 if is_recent else (0.40 if is_weekend else 0.62)
        taken = random.random() < evening_rate
        dose_logs.append(DoseLog(
            medicine_id=metformin.id,
            user_id=patient.id,
            scheduled_time=f"{log_date.isoformat()} 20:00",
            actual_taken_time=f"{log_date.isoformat()} 20:{random.randint(0,30):02d}" if taken else None,
            status="taken" if taken else "missed",
            skip_reason=None if taken else random.choice(skip_reasons),
            logged_by="self",
        ))

        # Morning Amlodipine (08:00) - 80% taken
        am_rate = 0.90 if is_recent else (0.65 if is_weekend else 0.80)
        taken = random.random() < am_rate
        dose_logs.append(DoseLog(
            medicine_id=amlodipine.id,
            user_id=patient.id,
            scheduled_time=f"{log_date.isoformat()} 08:00",
            actual_taken_time=f"{log_date.isoformat()} 08:{random.randint(0,10):02d}" if taken else None,
            status="taken" if taken else "missed",
            skip_reason=None if taken else random.choice(skip_reasons),
            logged_by="self",
        ))

        # Health metrics every few days
        if day_offset % 2 == 0:
            adherence_today = sum(1 for dl in dose_logs[-3:] if dl.status == "taken") / 3
            bp_sys = random.randint(125, 155) if adherence_today < 0.7 else random.randint(115, 135)
            bp_dia = random.randint(78, 95) if adherence_today < 0.7 else random.randint(72, 85)
            sugar = round(random.uniform(140, 220) if adherence_today < 0.7 else random.uniform(100, 160), 1)

            health_entries.append(HealthMetric(
                user_id=patient.id,
                date=log_date.isoformat(),
                blood_pressure_systolic=bp_sys,
                blood_pressure_diastolic=bp_dia,
                blood_sugar=sugar,
                weight=round(random.uniform(78, 82), 1),
                mood=random.randint(2, 5),
                pain_level=random.randint(1, 3),
                notes="",
            ))

    db.bulk_save_objects(dose_logs)
    db.bulk_save_objects(health_entries)

    # Some achievements
    achievements = [
        Achievement(user_id=patient.id, badge_name="First Step", badge_icon="🎯", description="Logged your first dose!", earned_at=datetime.utcnow() - timedelta(days=44)),
        Achievement(user_id=patient.id, badge_name="Week Warrior", badge_icon="🔥", description="Achieved a 7-day streak!", earned_at=datetime.utcnow() - timedelta(days=30)),
        Achievement(user_id=patient.id, badge_name="Century Club", badge_icon="💊", description="100 doses taken!", earned_at=datetime.utcnow() - timedelta(days=10)),
        Achievement(user_id=patient.id, badge_name="Early Bird", badge_icon="🌅", description="10 morning doses taken on time!", earned_at=datetime.utcnow() - timedelta(days=20)),
        Achievement(user_id=patient.id, badge_name="Caregiver Connected", badge_icon="👨‍👩‍👧", description="Connected with a caregiver!", earned_at=datetime.utcnow() - timedelta(days=40)),
    ]
    db.bulk_save_objects(achievements)

    # Some alerts
    alerts = [
        Alert(user_id=patient.id, triggered_for_user_id=patient.id, alert_type="missed_dose", message="Missed evening Metformin dose", is_read=True, created_at=datetime.utcnow() - timedelta(hours=26)),
        Alert(user_id=caregiver.id, triggered_for_user_id=patient.id, alert_type="missed_dose", message="Rajesh Kumar missed 2 consecutive doses", is_read=False, created_at=datetime.utcnow() - timedelta(hours=18)),
        Alert(user_id=patient.id, triggered_for_user_id=patient.id, alert_type="low_stock", message="Metformin running low — 22 tablets remaining", is_read=False, created_at=datetime.utcnow() - timedelta(hours=5)),
        Alert(user_id=caregiver.id, triggered_for_user_id=patient.id, alert_type="high_risk", message="Rajesh Kumar's adherence dropped below 60% this week", is_read=False, created_at=datetime.utcnow() - timedelta(hours=3)),
        Alert(user_id=doctor.id, triggered_for_user_id=patient.id, alert_type="high_risk", message="Patient Rajesh Kumar flagged as high risk — 3 consecutive missed doses", is_read=False, created_at=datetime.utcnow() - timedelta(hours=2)),
    ]
    db.bulk_save_objects(alerts)

    db.commit()
    db.close()
    print("✅ Demo data seeded successfully!")
