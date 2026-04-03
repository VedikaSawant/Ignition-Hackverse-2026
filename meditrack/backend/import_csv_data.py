import pandas as pd
from datetime import datetime
from database import SessionLocal, engine
import models

# Path to the CSV file
CSV_FILE_PATH = r"C:\Users\91981\Downloads\Ignition Hackverse 2026\medication_adherence_multi_disease_5_months.csv"

def init_db():
    models.Base.metadata.create_all(bind=engine)

def get_or_create_user(db, name, age, conditions):
    user = db.query(models.User).filter(models.User.email == "vedika_demo@meditrack.com").first()
    if not user:
        user = models.User(
            name=name,
            email="vedika_demo@meditrack.com",
            password_hash="fake_hash",
            role="patient",
            age=age,
            conditions=conditions
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def map_mood(mood_str):
    mood_str = str(mood_str).lower().strip()
    mapping = {
        "good": 4,
        "normal": 3,
        "tired": 2,
        "low": 1,
        "stressed": 2
    }
    return mapping.get(mood_str, 3)

def map_behavior(reason_str):
    reason_str = str(reason_str).lower().strip()
    mapping = {
        "busy": "busy",
        "forgot": "forgetfulness",
        "side effects": "side_effects",
        "travel": "travel",
        "late": "late",
        "none": "none"
    }
    return mapping.get(reason_str, "unknown")

def main():
    print(f"Loading data from {CSV_FILE_PATH}...")
    df = pd.read_csv(CSV_FILE_PATH)

    init_db()
    db = SessionLocal()

    try:
        grouped = df.groupby(["patient_id", "name", "age"])
        
        for (patient_id, name, age), group in grouped:
            conditions = ", ".join(list(group["disease"].unique()))
            print(f"-- Processing Data for Patient [{patient_id}] {name} --")
            
            user = get_or_create_user(db, name=name, age=int(age), conditions=conditions)
            
            # Remove previous data for this user to avoid duplicates if re-run
            db.query(models.DoseLog).filter(models.DoseLog.user_id == user.id).delete()
            db.query(models.HealthMetric).filter(models.HealthMetric.user_id == user.id).delete()
            db.query(models.Medicine).filter(models.Medicine.user_id == user.id).delete()
            db.commit()

            # Process Medicines
            meds_info = group.groupby(["medication", "dosage", "disease"])
            med_map = {}
            for (med_name, dosage, disease), med_group in meds_info:
                # Find times of day typically taken
                times = list(med_group["scheduled_time"].unique())
                medicine = models.Medicine(
                    user_id=user.id,
                    name=med_name,
                    dosage=dosage,
                    medicine_type="tablet",  # Taking a guess based on names
                    frequency="daily",
                    times_of_day=times,
                    start_date="2026-01-01",
                    before_after_food="after"
                )
                db.add(medicine)
                db.commit()
                db.refresh(medicine)
                med_map[(med_name, dosage)] = medicine.id

            dose_logs = []
            health_metrics_added = set()

            for idx, row in group.iterrows():
                # Process DoseLog
                med_id = med_map.get((row["medication"], row["dosage"]))
                if not med_id:
                    continue
                
                dt_str = f"{row['date']}T{row['scheduled_time']}:00"
                
                status = "taken" if str(row["taken"]).lower() == "yes" else "missed"
                delay = int(row["delay_minutes"]) if pd.notna(row["delay_minutes"]) else 0
                behavior = map_behavior(row["reason"])

                log = models.DoseLog(
                    medicine_id=med_id,
                    user_id=user.id,
                    scheduled_time=dt_str,
                    actual_taken_time=dt_str if status == "taken" else None,
                    status=status,
                    delay_minutes=delay,
                    behavior_tag=behavior,
                    skip_reason=row["reason"] if status == "missed" else None
                )
                dose_logs.append(log)

                # Process HealthMetric (One per day is usually enough)
                if row["date"] not in health_metrics_added:
                    health_metrics_added.add(row["date"])
                    hm = models.HealthMetric(
                        user_id=user.id,
                        date=row["date"],
                        mood=map_mood(row["mood"])
                    )
                    db.add(hm)
                    
            print(f"Loaded {len(dose_logs)} dose logs for {name}.")
            db.add_all(dose_logs)
            db.commit()

            print("✅ Data Feed Complete.")
            
    except Exception as e:
        print(f"❌ Error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
