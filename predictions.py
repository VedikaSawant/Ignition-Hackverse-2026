import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import DoseLog, Medicine, Prediction
import re
import google.generativeai as genai

# Models
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
try:
    import xgboost as xgb
except ImportError:
    xgb = None

gemini_model = None
try:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key and api_key != "your_gemini_api_key_here":
        genai.configure(api_key=api_key)
        # Using gemini-3-flash-preview
        gemini_model = genai.GenerativeModel("gemini-3-flash-preview")
except Exception:
    gemini_model = None

def extract_json(text: str) -> dict:
    """Robustly extract JSON from a string."""
    try:
        return json.loads(text.strip())
    except:
        try:
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                return json.loads(match.group())
        except:
            pass
    return None

ml_models = {}
ml_metrics = {}
feature_importances = []


def train_ml_model(db: Session):
    """Train XGBoost, RF, Logic Regression on behavioral DoseLogs."""
    global ml_models, ml_metrics, feature_importances

    logs = db.query(DoseLog).filter(DoseLog.status.in_(["taken", "missed"])).all()
    if len(logs) < 20: # Require at least 20 records to fit
        return False

    features = []
    labels = []

    for log in logs:
        try:
            # Reconstruct Datetime properly to handle varying formats
            try:
                dt = datetime.fromisoformat(log.scheduled_time)
            except ValueError:
                dt = datetime.strptime(log.scheduled_time, "%Y-%m-%d %H:%M")
            
            hour = dt.hour
            day_of_week = dt.weekday()
            is_weekend = 1 if day_of_week >= 5 else 0

            medicine = db.query(Medicine).filter(Medicine.id == log.medicine_id).first()
            if not medicine: continue

            start = datetime.fromisoformat(medicine.start_date) if medicine.start_date else dt
            medicine_age = max((dt - start).days, 0)

            times = medicine.times_of_day or ["08:00"]
            dose_position = 1
            for i, t in enumerate(times):
                if t.split(":")[0] == str(hour).zfill(2):
                    dose_position = i + 1
                    break

            recent_logs = db.query(DoseLog).filter(
                DoseLog.user_id == log.user_id,
                DoseLog.id < log.id,
            ).order_by(DoseLog.id.desc()).limit(3).all()

            last_3 = [1 if rl.status == "taken" else 0 for rl in recent_logs]
            while len(last_3) < 3: last_3.append(1)
            
            consecutive_missed = sum(1 for rl in recent_logs if rl.status == "missed")

            # Extract Behavioral Features
            delay_mins = log.delay_minutes or 0
            is_behavior_busy = 1 if log.behavior_tag == "busy" else 0
            is_behavior_forget = 1 if log.behavior_tag == "forgetfulness" else 0
            is_behavior_sideFX = 1 if log.behavior_tag == "side_effects" else 0

            features.append([
                day_of_week, hour, consecutive_missed, is_weekend, dose_position, 
                medicine_age, last_3[0], last_3[1], last_3[2], 
                delay_mins, is_behavior_busy, is_behavior_forget, is_behavior_sideFX
            ])
            labels.append(1 if log.status == "taken" else 0)
        except Exception as e:
            # Fallback for parsing errors in synthetic dataset
            continue

    if len(features) < 20:
        return False

    X = np.array(features)
    y = np.array(labels)

    feature_names = [
        "DayOfWeek", "Hour", "ConsecutiveMissed", "IsWeekend", "DosePosition",
        "MedicineAge", "LastLog1", "LastLog2", "LastLog3",
        "DelayMins", "IsBusy", "IsForget", "IsSideFX"
    ]

    # Initialize Models
    rf = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=8)
    lr = LogisticRegression(max_iter=1000, random_state=42)

    # Train Models
    rf.fit(X, y)
    lr.fit(X, y)

    ml_models = {"rf": rf, "lr": lr}

    # Evaluate (In-sample for dashboard metrics, real app uses test split)
    y_pred_rf = rf.predict(X)
    y_pred_lr = lr.predict(X)

    def calc_metrics(y_true, y_pred):
        return {
            "accuracy": accuracy_score(y_true, y_pred),
            "precision": precision_score(y_true, y_pred, zero_division=0),
            "recall": recall_score(y_true, y_pred, zero_division=0),
            "f1": f1_score(y_true, y_pred, zero_division=0),
            "matrix": confusion_matrix(y_true, y_pred).tolist()
        }

    ml_metrics = {
        "Random Forest": calc_metrics(y, y_pred_rf),
        "Logistic Regression": calc_metrics(y, y_pred_lr)
    }

    feature_importances = []
    
    if xgb:
        xgb_model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42, max_depth=6)
        xgb_model.fit(X, y)
        ml_models["xgb"] = xgb_model
        y_pred_xgb = xgb_model.predict(X)
        ml_metrics["XGBoost"] = calc_metrics(y, y_pred_xgb)
        
        # Calculate Feature Importances from XGBoost
        importances = xgb_model.feature_importances_
        sorted_idx = np.argsort(importances)[::-1]
        
        for i in sorted_idx:
            feature_importances.append({
                "feature": feature_names[i],
                "importance": float(importances[i])
            })
    else:
        # Fallback feature importances using RF
        importances = rf.feature_importances_
        sorted_idx = np.argsort(importances)[::-1]
        
        for i in sorted_idx:
            feature_importances.append({
                "feature": feature_names[i],
                "importance": float(importances[i])
            })

    return True


def predict_miss_probability(features_list: list) -> float:
    """Predicts using the primary XGBoost model, fallback to RF."""
    global ml_models

    features = np.array([features_list])
    
    try:
        if "xgb" in ml_models:
            proba = ml_models["xgb"].predict_proba(features)[0]
            miss_idx = 0 if len(ml_models["xgb"].classes_) > 1 and ml_models["xgb"].classes_[0] == 0 else 0
            return float(proba[miss_idx])
            
        elif "rf" in ml_models:
            proba = ml_models["rf"].predict_proba(features)[0]
            miss_idx = list(ml_models["rf"].classes_).index(0) if 0 in ml_models["rf"].classes_ else 0
            return float(proba[miss_idx])
    except Exception:
        pass

    # Rule-Based Score Fallback
    day_of_week, hour, consecutive_missed, is_weekend, dose_position, med_age, l1, l2, l3, d_mins, i_b, i_f, i_s = features_list
    
    score = 30.0
    if is_weekend: score += 15
    if hour >= 19: score += 12
    if consecutive_missed >= 2: score += 20
    elif consecutive_missed >= 1: score += 10
    if sum([l1, l2, l3]) == 0: score += 15
    if i_s: score += 20 # Side effects strongly predict non-adherence
    if i_f or i_b: score += 10

    score = max(0, min(100, score))
    return score / 100.0


def compute_risk_score(db: Session, user_id: int) -> dict:
    # Retaining lightweight check for baseline usage
    logs = db.query(DoseLog).filter(DoseLog.user_id == user_id).order_by(DoseLog.id.desc()).limit(21).all()
    if not logs:
        return {"risk_score": 25, "risk_level": "low"}
    
    taken = sum(1 for l in logs if l.status == "taken")
    weekly_rate = taken / len(logs) if logs else 0.75
    
    consecutive_missed = 0
    for l in logs:
        if l.status == "missed": consecutive_missed += 1
        else: break
        
    today = datetime.utcnow().date()
    is_weekend = 1 if today.weekday() >= 5 else 0

    base_score = predict_miss_probability([
        today.weekday(), 12, consecutive_missed, is_weekend, 1, 30,
        1 if len(logs)>0 and logs[0].status == "taken" else 0,
        1 if len(logs)>1 and logs[1].status == "taken" else 0,
        1 if len(logs)>2 and logs[2].status == "taken" else 0,
        0, 0, 0, 0 # Default behavior inputs
    ]) * 100

    if consecutive_missed >= 2: base_score += 20
    if weekly_rate < 0.6: base_score += 15

    risk_score = int(max(0, min(100, base_score)))
    risk_level = "low" if risk_score <= 35 else "medium" if risk_score <= 65 else "high"

    return {"risk_score": risk_score, "risk_level": risk_level}


def generate_predictions_for_user(db: Session, user_id: int):
    medicines = db.query(Medicine).filter(Medicine.user_id == user_id, Medicine.is_active == True).all()
    today_iso = datetime.utcnow().date().isoformat()
    db.query(Prediction).filter(Prediction.user_id == user_id, Prediction.predicted_date <= today_iso).delete()

    logs = db.query(DoseLog).filter(DoseLog.user_id == user_id).order_by(DoseLog.id.desc()).limit(3).all()
    l1 = 1 if len(logs)>0 and logs[0].status == "taken" else 0
    l2 = 1 if len(logs)>1 and logs[1].status == "taken" else 0
    l3 = 1 if len(logs)>2 and logs[2].status == "taken" else 0
    
    consecutive_missed = sum(1 for l in logs if l.status == "missed")

    # Fetch last known behavior for baseline padding
    last_log = logs[0] if logs else None
    d_mins = last_log.delay_minutes if last_log else 0
    i_b = 1 if last_log and last_log.behavior_tag == "busy" else 0
    i_f = 1 if last_log and last_log.behavior_tag == "forgetfulness" else 0
    i_s = 1 if last_log and last_log.behavior_tag == "side_effects" else 0

    today = datetime.utcnow().date()
    tomorrow = today + timedelta(days=1)

    for med in medicines:
        times = med.times_of_day or ["08:00"]
        start = datetime.fromisoformat(med.start_date) if med.start_date else datetime.utcnow()
        medicine_age = max((datetime.utcnow() - start).days, 0)

        for i, time_str in enumerate(times):
            hour = int(time_str.split(":")[0])

            for target_date in [today, tomorrow]:
                is_weekend = 1 if target_date.weekday() >= 5 else 0

                miss_prob = predict_miss_probability([
                    target_date.weekday(), hour, consecutive_missed, is_weekend, i + 1,
                    medicine_age, l1, l2, l3, d_mins, i_b, i_f, i_s
                ])

                risk = "low" if miss_prob <= 0.35 else "medium" if miss_prob <= 0.65 else "high"
                
                pred = Prediction(
                    user_id=user_id, medicine_id=med.id, predicted_date=target_date.isoformat(),
                    predicted_time=time_str, miss_probability=round(miss_prob, 3), risk_level=risk
                )
                db.add(pred)

    db.commit()


# Analytics Reporting Wrappers
def generate_adherence_insight(patient_data: dict) -> dict:
    prompt = f"""You are a healthcare AI analyzing medication data. Plain text only. No markdown.
Patient Age: {patient_data.get('age', 'N/A')}. Cond: {patient_data.get('conditions', 'N/A')}. Weekly rate: {patient_data.get('weekly_rate', 75)}%.
Respond ONLY in this JSON format:
{{
  "encouragement": "One sentence",
  "pattern": "One specific pattern",
  "recommendation": "One suggestion",
  "risk_level": "Low/Medium/High",
  "risk_reason": "Explanation"
}}
"""
    if gemini_model:
        try:
            response = gemini_model.generate_content(prompt)
            data = extract_json(response.text)
            if data:
                return data
        except Exception: pass
    return {"encouragement": "Keep going!", "pattern": "Stable", "recommendation": "Use alarm", "risk_level": "Medium", "risk_reason": "Baseline data used."}


def generate_weekly_summary(patient_data: dict) -> str:
    prompt = f"Write a 3-sentence weekly medication adherence summary. Be encouraging. Data: Weekly adherence {patient_data.get('weekly_rate', 75)}%, Best day: {patient_data.get('best_day', 'Monday')}."
    if gemini_model:
        try: return gemini_model.generate_content(prompt).text.strip()
        except Exception: pass
    return f"Patient achieved {patient_data.get('weekly_rate', 75)}% compliance. Keep focusing on consistency!"
