from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
from models import DoseLog, Medicine, User, Alert, Achievement
from predictions import train_ml_model, generate_predictions_for_user
import pandas as pd

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

def send_all_reports():
    """Generate and send weekly reports to doctors for their patients."""
    from reports import generate_clinical_summary, create_pdf_report, send_report_email
    import os
    db = SessionLocal()
    try:
        doctors = db.query(User).filter(User.role == "doctor").all()
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        start_date_str = seven_days_ago.strftime("%Y-%m-%d")
        
        for doctor in doctors:
            patients = db.query(User).filter(User.linked_doctor_id == doctor.id).all()
            for p in patients:
                logs = db.query(DoseLog).filter(
                    DoseLog.user_id == p.id,
                    DoseLog.scheduled_time >= start_date_str
                ).all()
                
                total = len(logs)
                if total == 0:
                    continue
                    
                taken = sum(1 for log in logs if log.status == "taken")
                missed = total - taken
                adherence = (taken / total) * 100
                
                risk_level = "High"
                if adherence >= 80:
                    risk_level = "Low"
                elif adherence >= 50:
                    risk_level = "Moderate"
                
                # Calculate medicine breakdown
                meds = db.query(Medicine).filter(Medicine.user_id == p.id, Medicine.is_active == True).all()
                med_breakdown = []
                for med in meds:
                    med_logs = [l for l in logs if l.medicine_id == med.id]
                    m_total = len(med_logs)
                    m_taken = sum(1 for l in med_logs if l.status == "taken")
                    med_breakdown.append({
                        "name": med.name,
                        "adherence": round((m_taken / m_total * 100), 1) if m_total > 0 else 0,
                        "taken": m_taken,
                        "total": m_total
                    })

                # Calculate daily trend (last 7 days)
                daily_trend = []
                for i in range(6, -1, -1):
                    d_str = (now.date() - timedelta(days=i)).isoformat()
                    d_logs = [l for l in logs if l.scheduled_time.startswith(d_str)]
                    d_total = len(d_logs)
                    d_taken = sum(1 for l in d_logs if l.status == "taken")
                    daily_trend.append({
                        "date": d_str,
                        "adherence": round((d_taken / d_total * 100), 1) if d_total > 0 else 0
                    })

                patient_data = {
                    "id": p.id,
                    "name": p.name,
                    "conditions": p.conditions,
                    "total": total,
                    "taken": taken,
                    "missed": missed,
                    "adherence_percent": round(adherence, 1),
                    "risk_level": risk_level,
                    "med_breakdown": med_breakdown,
                    "daily_trend": daily_trend
                }
                
                ai_summary = generate_clinical_summary(patient_data)
                pdf_path = create_pdf_report(patient_data, ai_summary)
                
                send_report_email(doctor.email, p.name, risk_level, pdf_path)
                
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                    
    except Exception as e:
        print(f"Scheduler error (reports): {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler."""
    scheduler.add_job(check_missed_doses, "interval", seconds=60, id="check_missed", replace_existing=True)
    scheduler.add_job(check_low_stock, "interval", minutes=5, id="check_stock", replace_existing=True)
    scheduler.add_job(check_achievements, "interval", minutes=10, id="check_achievements", replace_existing=True)
    scheduler.add_job(run_predictions, "interval", minutes=30, id="run_predictions", replace_existing=True)
    scheduler.add_job(send_all_reports, 'cron', day_of_week='mon', hour=8, id="send_all_reports", replace_existing=True)
    scheduler.start()
    print("✅ Background scheduler started")
