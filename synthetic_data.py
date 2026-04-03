import os
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Medicine, DoseLog

DATABASE_URL = "sqlite:///./meditrack.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def generate_synthetic_data(num_records=3000):
    db = SessionLocal()
    
    # Check if we have users and medicines
    users = db.query(User).filter(User.role == "patient").all()
    if not users:
        print("No patient users found. Please create a user first.")
        db.close()
        return

    # Grab medicines
    medicines = db.query(Medicine).all()
    if not medicines:
        print("No medicines found. Creating a dummy medicine.")
        dummy_med = Medicine(
            user_id=users[0].id,
            name="Synthetic Aspirin",
            dosage="100mg",
            frequency="twice",
            times_of_day=["08:00", "20:00"]
        )
        db.add(dummy_med)
        db.commit()
        db.refresh(dummy_med)
        medicines = [dummy_med]

    print(f"Generating {num_records} synthetic DoseLog records...")
    
    start_date = datetime.utcnow() - timedelta(days=90) # Track over last 3 months
    
    records = []
    for i in range(num_records):
        user = random.choice(users)
        user_meds = [m for m in medicines if m.user_id == user.id]
        med = random.choice(user_meds) if user_meds else random.choice(medicines)
        
        # Pick a random day in the last 90 days
        day_offset = random.randint(0, 90)
        target_date = start_date + timedelta(days=day_offset)
        
        # Feature Engineering rules
        is_weekend = target_date.weekday() >= 5
        time_str = random.choice(med.times_of_day if med.times_of_day else ["08:00", "14:00", "20:00"])
        hour = int(time_str.split(":")[0])
        
        base_miss_prob = 0.15 # 15% miss rate baseline
        if is_weekend:
            base_miss_prob += 0.10
        if hour >= 20: # Evening doses missed more
            base_miss_prob += 0.15
        
        is_missed = random.random() < base_miss_prob
        is_delayed = not is_missed and random.random() < 0.25 # 25% chance of being delayed if taken
        
        status = "missed" if is_missed else "taken"
        delay_minutes = 0
        behavior_tag = "unknown"
        actual_time = None
        
        scheduled_datetime = target_date.replace(hour=hour, minute=0, second=0)
        
        if status == "taken":
            if is_delayed:
                delay_minutes = random.randint(15, 120)
                behavior_tag = random.choice(["busy", "forgetfulness"])
            else:
                delay_minutes = random.randint(0, 5)
                behavior_tag = "on_time"
            
            taken_dt = scheduled_datetime + timedelta(minutes=delay_minutes)
            actual_time = taken_dt.strftime("%H:%M")
        else:
            delay_minutes = 0
            if hour >= 20:
                behavior_tag = random.choice(["forgetfulness", "side_effects", "tired"])
            elif is_weekend:
                behavior_tag = random.choice(["busy", "intentional_skip"])
            else:
                behavior_tag = random.choice(["forgetfulness", "busy"])
                
        log = DoseLog(
            medicine_id=med.id,
            user_id=user.id,
            scheduled_time=scheduled_datetime.strftime("%Y-%m-%d %H:%M"),
            actual_taken_time=actual_time,
            status=status,
            skip_reason=behavior_tag if status == "missed" else None,
            logged_by="self",
            delay_minutes=delay_minutes,
            behavior_tag=behavior_tag,
            created_at=scheduled_datetime + timedelta(minutes=delay_minutes)
        )
        records.append(log)
        
        if len(records) >= 500:
            db.bulk_save_objects(records)
            db.commit()
            records = []
            print(f"Inserted batch... ({i}/{num_records})")
            
    if records:
        db.bulk_save_objects(records)
        db.commit()
        
    print("Synthetic dataset generation complete.")
    db.close()

if __name__ == "__main__":
    generate_synthetic_data(4000)
