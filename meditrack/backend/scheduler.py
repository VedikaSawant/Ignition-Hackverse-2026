from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
from models import DoseLog, Medicine, User, Alert, Achievement
from predictions import train_ml_model, generate_predictions_for_user, predict_miss_probability, FEATURE_NAMES, GENDER_MAP, DISEASE_MAP
from reports import process_and_send_patient_report, send_patient_reminder_email

scheduler = BackgroundScheduler()


def check_missed_doses():
    """Check for missed doses and generate alerts."""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        today = now.date().isoformat()

        # Find pending doses that are past their scheduled time by more than 15 min
        pending = db.query(DoseLog).filter(
            DoseLog.status == "pending",
            DoseLog.scheduled_time.like(f"{today}%"),
        ).all()

        for dose in pending:
            try:
                parts = dose.scheduled_time.split(" ")
                if len(parts) == 2:
                    time_parts = parts[1].split(":")
                    scheduled_dt = datetime(
                        now.year, now.month, now.day,
                        int(time_parts[0]), int(time_parts[1])
                    )
                    if now > scheduled_dt + timedelta(minutes=15):
                        dose.status = "missed"

                        # Create alert for patient
                        med = db.query(Medicine).filter(Medicine.id == dose.medicine_id).first()
                        med_name = med.name if med else "Unknown"
                        alert = Alert(
                            user_id=dose.user_id,
                            triggered_for_user_id=dose.user_id,
                            alert_type="missed_dose",
                            message=f"Missed {med_name} dose scheduled for {parts[1]}",
                        )
                        db.add(alert)

                        # Check consecutive misses
                        recent_misses = db.query(DoseLog).filter(
                            DoseLog.user_id == dose.user_id,
                            DoseLog.status == "missed",
                        ).order_by(DoseLog.id.desc()).limit(3).all()

                        consecutive = 0
                        for rm in recent_misses:
                            if rm.status == "missed":
                                consecutive += 1
                            else:
                                break

                        user = db.query(User).filter(User.id == dose.user_id).first()

                        if consecutive >= 2 and user and user.linked_caregiver_id:
                            cg_alert = Alert(
                                user_id=user.linked_caregiver_id,
                                triggered_for_user_id=dose.user_id,
                                alert_type="missed_dose",
                                message=f"{user.name} has missed {consecutive} consecutive doses",
                            )
                            db.add(cg_alert)

                        if consecutive >= 3 and user and user.linked_doctor_id:
                            doc_alert = Alert(
                                user_id=user.linked_doctor_id,
                                triggered_for_user_id=dose.user_id,
                                alert_type="high_risk",
                                message=f"Patient {user.name} flagged as high risk — {consecutive} consecutive missed doses",
                            )
                            db.add(doc_alert)
            except Exception:
                continue

        db.commit()
    except Exception as e:
        print(f"Scheduler error (missed doses): {e}")
    finally:
        db.close()


def check_low_stock():
    """Check for low medicine stock and generate alerts."""
    db = SessionLocal()
    try:
        medicines = db.query(Medicine).filter(
            Medicine.is_active == True,
            Medicine.remaining_quantity <= Medicine.refill_alert_threshold,
        ).all()

        for med in medicines:
            existing = db.query(Alert).filter(
                Alert.user_id == med.user_id,
                Alert.alert_type == "low_stock",
                Alert.message.like(f"%{med.name}%"),
                Alert.is_read == False,
            ).first()

            if not existing:
                alert = Alert(
                    user_id=med.user_id,
                    triggered_for_user_id=med.user_id,
                    alert_type="low_stock",
                    message=f"{med.name} running low — {med.remaining_quantity} remaining",
                )
                db.add(alert)

        db.commit()
    except Exception as e:
        print(f"Scheduler error (low stock): {e}")
    finally:
        db.close()


def check_achievements():
    """Check if any new achievements should be awarded."""
    db = SessionLocal()
    try:
        patients = db.query(User).filter(User.role == "patient").all()

        badge_definitions = [
            {"name": "First Step", "icon": "🎯", "desc": "Logged your first dose!", "check": lambda taken, streak, _: taken >= 1},
            {"name": "Week Warrior", "icon": "🔥", "desc": "Achieved a 7-day streak!", "check": lambda _, streak, __: streak >= 7},
            {"name": "Month Master", "icon": "🏆", "desc": "Achieved a 30-day streak!", "check": lambda _, streak, __: streak >= 30},
            {"name": "Century Club", "icon": "💊", "desc": "100 doses taken!", "check": lambda taken, _, __: taken >= 100},
            {"name": "Early Bird", "icon": "🌅", "desc": "10 morning doses taken on time!", "check": lambda _, __, morning: morning >= 10},
        ]

        for p in patients:
            total_taken = db.query(DoseLog).filter(
                DoseLog.user_id == p.id,
                DoseLog.status == "taken",
            ).count()

            # Calculate streak
            streak = 0
            today = datetime.utcnow().date()
            for i in range(365):
                d = (today - timedelta(days=i)).isoformat()
                day_logs = db.query(DoseLog).filter(
                    DoseLog.user_id == p.id,
                    DoseLog.scheduled_time.like(f"{d}%"),
                ).all()
                if not day_logs:
                    break
                day_taken = sum(1 for dl in day_logs if dl.status == "taken")
                if day_logs and (day_taken / len(day_logs)) >= 0.8:
                    streak += 1
                else:
                    break

            morning_taken = db.query(DoseLog).filter(
                DoseLog.user_id == p.id,
                DoseLog.status == "taken",
                DoseLog.scheduled_time.like("% 08:%"),
            ).count()

            for badge in badge_definitions:
                existing = db.query(Achievement).filter(
                    Achievement.user_id == p.id,
                    Achievement.badge_name == badge["name"],
                ).first()

                if not existing and badge["check"](total_taken, streak, morning_taken):
                    ach = Achievement(
                        user_id=p.id,
                        badge_name=badge["name"],
                        badge_icon=badge["icon"],
                        description=badge["desc"],
                    )
                    db.add(ach)

        db.commit()
    except Exception as e:
        print(f"Scheduler error (achievements): {e}")
    finally:
        db.close()


def run_predictions():
    """Run ML predictions for all patients."""
    db = SessionLocal()
    try:
        train_ml_model(db)
        patients = db.query(User).filter(User.role == "patient").all()
        for p in patients:
            generate_predictions_for_user(db, p.id)
    except Exception as e:
        print(f"Scheduler error (predictions): {e}")
    finally:
        db.close()


def send_weekly_reports_job():
    """Weekly job to send reports to doctors."""
    db = SessionLocal()
    try:
        # Find all patients with linked doctors
        patients = db.query(User).filter(
            User.role == "patient",
            User.linked_doctor_id != None
        ).all()
        
        for p in patients:
            success = process_and_send_patient_report(db, p.id)
            if success:
                print(f"✅ Automated report sent for {p.name}")
            else:
                print(f"❌ Failed automated report for {p.name}")
    except Exception as e:
        print(f"Scheduler error (weekly reports): {e}")
    finally:
        db.close()


def proactive_dose_reminder():
    """
    15-minute proactive job:
    1. Scan upcoming doses in the next hour.
    2. Predict risk using ML.
    3. Send 'Smart Reminder' or 'Behavioral Warning' via Email & Dashboard.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        one_hour_later = now + timedelta(hours=1)
        
        # Upcoming doses in next 60 mins
        upcoming = db.query(DoseLog).filter(
            DoseLog.status == "pending",
            DoseLog.scheduled_time >= now.isoformat(),
            DoseLog.scheduled_time <= one_hour_later.isoformat()
        ).all()

        for dose in upcoming:
            # Check if already reminded
            existing_alert = db.query(Alert).filter(
                Alert.triggered_for_user_id == dose.user_id,
                Alert.alert_type.in_(["reminder", "behavioral_warning"]),
                Alert.message.like(f"%{dose.id}%") # Simple trick to link alert to dose
            ).first()
            if existing_alert: continue

            user = db.query(User).filter(User.id == dose.user_id).first()
            med = db.query(Medicine).filter(Medicine.id == dose.medicine_id).first()
            if not user or not med: continue

            # Extract features for this specific upcoming dose
            # (Simplifying for rules/ML fallback matching predictions.py)
            scheduled_dt = datetime.fromisoformat(dose.scheduled_time.replace("Z", ""))
            
            # Context stats
            logs_count = db.query(DoseLog).filter(DoseLog.user_id == user.id).count()
            consecutive_missed = 0
            recent_logs = db.query(DoseLog).filter(DoseLog.user_id == user.id, DoseLog.status != "pending").order_by(DoseLog.scheduled_time.desc()).limit(10).all()
            for l in recent_logs:
                if l.status == "missed": consecutive_missed += 1
                else: break

            feature_row = [
                scheduled_dt.weekday(), int(scheduled_dt.weekday() >= 5), scheduled_dt.month, scheduled_dt.hour,
                int(5 <= scheduled_dt.hour <= 11), int(17 <= scheduled_dt.hour <= 23),
                30, logs_count, 2, # days_start, total_logs, d_per_day
                3, 0, GENDER_MAP.get(user.gender.lower() if user.gender else "", 2),
                hash(med.name.lower()) % 100, DISEASE_MAP.get(med.disease.lower() if hasattr(med, 'disease') and med.disease else "general", 4),
                user.age or 45, 0.8,
                0.8, 0.8, consecutive_missed, 0, # recent_adh, long_adh, c_miss, streak
                0.2, 0.2
            ]

            miss_prob = predict_miss_probability(feature_row)
            is_high_risk = miss_prob >= 0.45

            # 1. Create Dashboard Alert
            alert_type = "behavioral_warning" if is_high_risk else "reminder"
            msg = f"Upcoming {med.name} dose at {scheduled_dt.strftime('%H:%M')}. "
            if is_high_risk:
                msg += f"⚠️ Action Required: Patterns suggest high risk of non-compliance ({round(miss_prob*100)}% sensitivity)."
            else:
                msg += "Time to stay consistent!"
            
            # Append dose ID for tracking
            msg += f" [Ref:{dose.id}]"

            alert = Alert(
                user_id=user.id,
                triggered_for_user_id=user.id,
                alert_type=alert_type,
                message=msg
            )
            db.add(alert)
            
            # 2. Send Smart Email
            send_patient_reminder_email(
                patient_email=user.email,
                patient_name=user.name,
                medicine_name=med.name,
                scheduled_time=scheduled_dt.strftime('%H:%M'),
                miss_prob=miss_prob
            )

        db.commit()
    except Exception as e:
        print(f"Scheduler error (proactive reminders): {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler."""
    scheduler.add_job(check_missed_doses, "interval", seconds=60, id="check_missed", replace_existing=True)
    scheduler.add_job(check_low_stock, "interval", minutes=5, id="check_stock", replace_existing=True)
    scheduler.add_job(check_achievements, "interval", minutes=10, id="check_achievements", replace_existing=True)
    scheduler.add_job(run_predictions, "interval", minutes=30, id="run_predictions", replace_existing=True)
    scheduler.add_job(proactive_dose_reminder, "interval", minutes=15, id="proactive_reminders", replace_existing=True)
    
    # Automated weekly reports: Monday at 8:00 AM
    scheduler.add_job(send_weekly_reports_job, 'cron', day_of_week='mon', hour=8, id="weekly_reports", replace_existing=True)
    
    scheduler.start()
    print("✅ Background scheduler started")
