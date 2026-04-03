import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import DoseLog, Medicine, Prediction, HealthMetric
import re
import google.generativeai as genai

# ML Models
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier
)
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score,
    recall_score, f1_score,
    confusion_matrix, roc_auc_score
)

try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

# ═══════════════════════════════════════════
# GEMINI SETUP (unchanged from your version)
# ═══════════════════════════════════════════

gemini_model = None
try:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key and api_key != "your_gemini_api_key_here":
        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel("gemini-1.5-flash")
except Exception:
    gemini_model = None

# ═══════════════════════════════════════════
# GLOBAL STATE
# ═══════════════════════════════════════════

ml_models = {}
ml_metrics = {}
model_auc_scores = {}      # For weighted ensemble
feature_importances = []
last_trained_at = None
MIN_LOGS_REQUIRED = 20

FEATURE_NAMES = [
    "day_of_week", "is_weekend", "month", "hour",
    "is_morning", "is_evening", "days_since_start", "total_doses_so_far", "doses_per_day",
    "mood_enc", "activity_enc", "gender_enc", "med_enc", "disease_enc",
    "age", "disease_adherence_avg",
    "recent_adherence", "long_adherence", "consec_missed", "streak_taken",
    "miss_rate_same_weekday", "miss_rate_same_hour"
]

# DETERMINISTIC MAPPINGS FOR INFERENCE PARITY
GENDER_MAP = {"male": 0, "female": 1, "other": 2, "unknown": 2}
DISEASE_MAP = {
    "hypertension": 0, "diabetes": 1, "asthma": 2, 
    "heart disease": 3, "general": 4, "unknown": 4
}
MOOD_MAP = {"low": 1, "stressed": 2, "tired": 2, "normal": 3, "good": 4}
ACTIVITY_MAP = {"home": 0, "work": 1, "travel": 2}

# ═══════════════════════════════════════════
# UTILITY
# ═══════════════════════════════════════════

def extract_json(text: str) -> dict:
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

def parse_dt(value) -> datetime:
    """Safely parse datetime from string or datetime object."""
    if isinstance(value, datetime):
        return value
    for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%d"]:
        try:
            return datetime.strptime(str(value), fmt)
        except:
            continue
    return datetime.utcnow()

# ═══════════════════════════════════════════
# FEATURE EXTRACTION (CORE UPGRADE)
# ═══════════════════════════════════════════

def extract_features(db: Session, user_id: int = None) -> pd.DataFrame:
    """
    Extract rich behavioral features matching the model_comparison pipeline.
    Uses deterministic global mappings for consistent encoding.
    """
    from models import User
    query = db.query(DoseLog).filter(
        DoseLog.status.in_(["taken", "missed", "skipped"])
    )
    if user_id:
        query = query.filter(DoseLog.user_id == user_id)

    logs = query.order_by(DoseLog.user_id, DoseLog.scheduled_time).all()
    if not logs:
        return pd.DataFrame()

    users = {u.id: u for u in db.query(User).all()}
    medicines = {m.id: m for m in db.query(Medicine).all()}

    raw_data = []
    for l in logs:
        u = users.get(l.user_id)
        m = medicines.get(l.medicine_id)
        if not u or not m: continue
        
        dt = parse_dt(l.scheduled_time)
        raw_data.append({
            "patient_id": l.user_id,
            "date_parsed": dt,
            "hour": dt.hour,
            "day_of_week": dt.weekday(),
            "month": dt.month,
            "label": 1 if l.status != "taken" else 0,
            "disease": m.disease.lower() if hasattr(m, 'disease') and m.disease else "general",
            "medication": m.name.lower(),
            "gender": u.gender.lower() if hasattr(u, 'gender') and u.gender else "unknown",
            "age": u.age or 45,
            "mood": "normal"
        })

    df = pd.DataFrame(raw_data)
    if df.empty: return df

    # Feature Engineering
    df = df.sort_values(["patient_id", "date_parsed"]).reset_index(drop=True)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_morning"] = ((df["hour"] >= 5) & (df["hour"] <= 11)).astype(int)
    df["is_evening"] = ((df["hour"] >= 17) & (df["hour"] <= 23)).astype(int)

    # Static mappings
    df["gender_enc"] = df["gender"].map(GENDER_MAP).fillna(2)
    df["disease_enc"] = df["disease"].map(DISEASE_MAP).fillna(4)
    df["med_enc"] = df["medication"].apply(lambda x: hash(x) % 100) # Stable hash
    
    df["mood_enc"] = 3
    df["activity_enc"] = 0

    df["days_since_start"] = (df["date_parsed"] - df.groupby("patient_id")["date_parsed"].transform("min")).dt.days
    df["total_doses_so_far"] = df.groupby("patient_id").cumcount() + 1
    df["doses_per_day"] = df.groupby(["patient_id", df["date_parsed"].dt.date])["patient_id"].transform("count")

    def calc_rolling(s, window):
        return 1 - s.rolling(window, min_periods=1).mean().shift(1)

    df["recent_adherence"] = df.groupby("patient_id")["label"].transform(lambda s: calc_rolling(s, 7)).fillna(0.75)
    df["long_adherence"] = df.groupby("patient_id")["label"].transform(lambda s: calc_rolling(s, 30)).fillna(0.75)

    def get_streak(series, target):
        res = []
        c = 0
        for v in series:
            res.append(c)
            c = c + 1 if v == target else 0
        return res

    df["consec_missed"] = df.groupby("patient_id")["label"].transform(lambda s: get_streak(s, 1))
    df["streak_taken"] = df.groupby("patient_id")["label"].transform(lambda s: get_streak(s, 0))

    df["miss_rate_same_weekday"] = df.groupby(["patient_id", "day_of_week"])["label"].transform(lambda s: s.expanding().mean().shift(1)).fillna(0.2)
    df["miss_rate_same_hour"] = df.groupby(["patient_id", "hour"])["label"].transform(lambda s: s.expanding().mean().shift(1)).fillna(0.2)
    df["disease_adherence_avg"] = 1 - df.groupby("disease_enc")["label"].transform(lambda s: s.expanding().mean().shift(1)).fillna(0.8)

    return df

# ═══════════════════════════════════════════
# MODEL TRAINING (UPGRADED ENSEMBLE)
# ═══════════════════════════════════════════

def train_ml_model(db: Session) -> bool:
    """
    Train single optimized Gradient Boosting model with sample weighting.
    Uses TimeSeriesSplit to simulate real-world sequential training.
    """
    global ml_models, ml_metrics, last_trained_at, feature_importances

    df = extract_features(db)
    if df.empty or len(df) < MIN_LOGS_REQUIRED:
        return False

    # Temporal Sort
    df = df.sort_values("date_parsed").reset_index(drop=True)
    X = df[FEATURE_NAMES].values
    y = df["label"].values

    # Strict Temporal Split (80/20)
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    try:
        # Optimization: Missed doses (label=1) are 3.5x more important
        weights = np.where(y_train == 1, 3.5, 1.0)
        
        model = GradientBoostingClassifier(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        model.fit(X_train, y_train, sample_weight=weights)
        
        # Test Evaluation (0.40 Threshold)
        proba = model.predict_proba(X_test)[:, 1]
        preds = (proba >= 0.40).astype(int)
        
        auc = roc_auc_score(y_test, proba)
        
        ml_models = {"GradientBoosting": model}
        ml_metrics = {"GradientBoosting": _calc_metrics(y_test, preds, proba)}
        last_trained_at = datetime.utcnow()

        # Update importances
        importance_vals = model.feature_importances_
        sorted_idx = np.argsort(importance_vals)[::-1]
        feature_importances = [
            {
                "feature": FEATURE_NAMES[i],
                "importance": round(float(importance_vals[i]), 4),
                "readable": _readable_feature(FEATURE_NAMES[i])
            }
            for i in sorted_idx
        ]

        print(f"✅ Optimized Gradient Boosting Trained. AUC: {auc:.4f}")
        return True

    except Exception as e:
        print(f"Model training failed: {e}")
        return False


def _calc_metrics(y_true, y_pred, y_proba=None) -> dict:
    result = {
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y_true, y_pred, zero_division=0), 4),
        "matrix": confusion_matrix(y_true, y_pred).tolist()
    }
    if y_proba is not None:
        try:
            result["auc"] = round(roc_auc_score(y_true, y_proba), 4)
        except:
            pass
    return result


def _readable_feature(name: str) -> str:
    mapping = {
        "SlotMissRate":         "Historical miss rate at this time slot",
        "ConsecutiveMissed":    "Recent consecutive missed doses",
        "RecentAdherenceRate":  "Last 7 days adherence rate",
        "LongAdherenceRate":    "Overall 30-day adherence",
        "IsWeekend":            "Weekend behavior pattern",
        "Hour":                 "Time of day",
        "IsSideEffects":        "Side effect complaints",
        "IsIntentional":        "Intentional skip pattern",
        "MoodScore":            "Patient mood score",
        "IsBusy":               "Busyness pattern",
        "IsForgetful":          "Forgetfulness pattern",
        "ConsecutiveTaken":     "Current compliance streak",
        "MedicineAge":          "Days since medicine started",
        "DayOfWeek":            "Day of week pattern",
        "PainLevel":            "Reported pain level",
        "BPSystolic":           "Blood pressure reading",
        "AvgDelayMins":         "Average dose delay in minutes",
    }
    return mapping.get(name, name)

# ═══════════════════════════════════════════
# WEIGHTED ENSEMBLE PREDICTION
# ═══════════════════════════════════════════

def predict_miss_probability(features_list: list) -> float:
    """
    Inference for a single dose event. 
    Uses Gradient Boosting with optimized 0.40 detection threshold.
    """
    global ml_models

    if not ml_models or "GradientBoosting" not in ml_models:
        return _rules_based_score(features_list)

    X = np.array([features_list])
    model = ml_models["GradientBoosting"]
    
    try:
        proba = model.predict_proba(X)[0]
        # Index of class "1" (missed)
        classes = list(model.classes_) if hasattr(model, 'classes_') else [0, 1]
        miss_idx = classes.index(1) if 1 in classes else 1
        return round(float(proba[miss_idx]), 3)
    except Exception:
        return _rules_based_score(features_list)


def _rules_based_score(features_list: list) -> float:
    """Fallback when ML models aren't trained yet. Aligned with new 22 features."""
    try:
        # Unpack first few known features
        (dw, is_wk, mth, hr, is_morn, is_eve, days_start, total_doses, d_per_day,
         mood, act, gen, med_enc, dis_enc, age, dis_avg,
         rec_adh, long_adh, c_miss, s_take, m_wk, m_hr) = features_list

        score = 0.2
        score += c_miss * 0.15
        score += (1 - rec_adh) * 0.2
        score += m_hr * 0.25
        score += is_wk * 0.05
        return round(max(0.0, min(1.0, score)), 3)
    except:
        return 0.25

# ═══════════════════════════════════════════
# BEHAVIORAL PATTERN ANALYSIS (NEW)
# Uses your 5 months of data
# ═══════════════════════════════════════════

def analyze_behavioral_patterns(db: Session, user_id: int) -> list:
    """
    Surface human-readable behavioral patterns from 5 months of data.
    This is what makes your system genuinely intelligent.
    """
    df = extract_features(db, user_id)
    if df.empty:
        return []

    patterns = []

    # ── Weekend vs Weekday ────────────────────────────────────
    weekend_miss = df[df["IsWeekend"] == 1]["label"].mean()
    weekday_miss = df[df["IsWeekend"] == 0]["label"].mean()
    if weekend_miss > weekday_miss * 1.25 and len(df[df["IsWeekend"]==1]) > 5:
        diff = round((weekend_miss - weekday_miss) * 100)
        patterns.append({
            "icon": "📅",
            "title": "Weekend Non-Compliance",
            "description": f"Miss rate is {diff}% higher on weekends vs weekdays",
            "severity": "high" if diff > 30 else "medium",
            "data": {
                "weekend_miss_rate": round(weekend_miss * 100, 1),
                "weekday_miss_rate": round(weekday_miss * 100, 1)
            }
        })

    # ── Worst Time Slot ───────────────────────────────────────
    slot_miss = df.groupby("Hour")["label"].agg(["mean", "count"])
    slot_miss = slot_miss[slot_miss["count"] >= 3]
    if not slot_miss.empty:
        worst_hour = slot_miss["mean"].idxmax()
        worst_rate = slot_miss.loc[worst_hour, "mean"]
        if worst_rate > 0.35:
            time_label = (
                "Morning" if worst_hour < 12 else
                "Afternoon" if worst_hour < 17 else
                "Evening" if worst_hour < 20 else "Night"
            )
            patterns.append({
                "icon": "🕐",
                "title": f"{time_label} Dose Struggles",
                "description": f"{worst_hour}:00 doses are missed {round(worst_rate*100)}% of the time",
                "severity": "high" if worst_rate > 0.5 else "medium",
                "data": {"worst_hour": worst_hour, "miss_rate": round(worst_rate*100, 1)}
            })

    # ── Side Effects Driving Skips ────────────────────────────
    if df["IsSideEffects"].sum() >= 3:
        side_fx_miss = df[df["IsSideEffects"] == 1]["label"].mean()
        normal_miss = df[df["IsSideEffects"] == 0]["label"].mean()
        if side_fx_miss > normal_miss * 1.3:
            patterns.append({
                "icon": "💊",
                "title": "Side Effects Driving Skips",
                "description": f"Patient skips {round(side_fx_miss*100)}% of doses when reporting side effects",
                "severity": "high",
                "data": {
                    "side_effect_miss_rate": round(side_fx_miss * 100, 1),
                    "normal_miss_rate": round(normal_miss * 100, 1)
                }
            })

    # ── Mood Correlation ──────────────────────────────────────
    if df["MoodScore"].std() > 0.1:
        mood_corr = df["MoodScore"].corr(df["label"])
        if abs(mood_corr) > 0.2:
            direction = "lower" if mood_corr < 0 else "higher"
            patterns.append({
                "icon": "😔",
                "title": "Mood-Adherence Correlation",
                "description": f"{direction.capitalize()} mood days strongly predict missed doses (r={round(mood_corr, 2)})",
                "severity": "medium",
                "data": {"correlation": round(mood_corr, 3)}
            })

    # ── Intentional Skip Pattern ──────────────────────────────
    if df["IsIntentional"].sum() >= 2:
        intent_rate = df["IsIntentional"].mean()
        if intent_rate > 0.1:
            patterns.append({
                "icon": "⚠️",
                "title": "Intentional Non-Compliance Detected",
                "description": f"{round(intent_rate*100)}% of skips are intentional — patient may need counseling",
                "severity": "high",
                "data": {"intentional_skip_rate": round(intent_rate*100, 1)}
            })

    # ── Compliance Drift Over Time ────────────────────────────
    if len(df) >= 30:
        first_half = df.iloc[:len(df)//2]["label"].mean()
        second_half = df.iloc[len(df)//2:]["label"].mean()
        drift = second_half - first_half
        if drift > 0.15:
            patterns.append({
                "icon": "📉",
                "title": "Worsening Compliance Trend",
                "description": f"Miss rate increased by {round(drift*100)}% compared to earlier months",
                "severity": "high",
                "data": {
                    "early_miss_rate": round(first_half*100, 1),
                    "recent_miss_rate": round(second_half*100, 1)
                }
            })
        elif drift < -0.15:
            patterns.append({
                "icon": "📈",
                "title": "Improving Compliance Trend",
                "description": f"Miss rate improved by {round(abs(drift)*100)}% — great progress!",
                "severity": "positive",
                "data": {
                    "early_miss_rate": round(first_half*100, 1),
                    "recent_miss_rate": round(second_half*100, 1)
                }
            })

    # ── Routine Drift (NEW) ────────────────────────────────────
    recent_delays = df.iloc[-7:]["AvgDelayMins"].mean() if len(df) >= 7 else 0
    overall_delays = df["AvgDelayMins"].mean()
    if recent_delays > overall_delays + 15 and recent_delays > 30:
        patterns.append({
            "icon": "🌊",
            "title": "Routine Drift Detected",
            "description": f"Dozes are being taken {round(recent_delays - overall_delays)} minutes later than your usual average this week.",
            "severity": "medium",
            "data": {"recent_delay": round(recent_delays), "overall_avg": round(overall_delays)}
        })

    return patterns


def generate_behavioral_narrative(db: Session, user_id: int) -> str:
    """
    Smarter Gemini-powered narrative that explains the 'Why' behind the patterns.
    """
    patterns = analyze_behavioral_patterns(db, user_id)
    if not patterns:
        return "Your adherence is currently stable with no major behavioral anomalies detected. Keep maintaining your current routine for optimal results."

    pattern_text = "\n".join([f"- {p['title']}: {p['description']}" for p in patterns])
    
    prompt = f"""You are a clinical behavioral analyst. 
Based on these detected medication adherence patterns for a patient, write a 3-sentence sophisticated report.
Explain the LIFESTYLE reason for these patterns and give a proactive suggestion.
Do NOT use markdown. Plain text only.

DETECTED PATTERNS:
{pattern_text}

Professional Narrative:"""

    if gemini_model:
        try:
            response = gemini_model.generate_content(prompt)
            return response.text.strip()
        except:
            pass

    return f"Detected {len(patterns)} behavioral nuances including {patterns[0]['title']}. Focus on consistency during high-risk periods to stabilize your clinical outlook."


def get_miss_reasons(feature_row: dict, miss_prob: float) -> list:
    """Human-readable reasons for a predicted miss."""
    reasons = []

    if feature_row.get("ConsecutiveMissed", 0) >= 2:
        reasons.append(f"Missed last {int(feature_row['ConsecutiveMissed'])} doses consecutively")
    if feature_row.get("IsWeekend", 0):
        reasons.append("Weekend — historically lower adherence")
    if feature_row.get("SlotMissRate", 0) > 0.5:
        reasons.append(f"Misses this time slot {round(feature_row['SlotMissRate']*100)}% of the time")
    if feature_row.get("IsSideEffects", 0):
        reasons.append("Side effects reported recently")
    if feature_row.get("MoodScore", 3) <= 2:
        reasons.append("Low mood reported today")
    if feature_row.get("RecentAdherenceRate", 1) < 0.6:
        reasons.append(f"Only {round(feature_row['RecentAdherenceRate']*100)}% adherence in last 7 doses")
    if feature_row.get("IsIntentional", 0):
        reasons.append("Pattern of intentional skips detected")
    if feature_row.get("Hour", 12) >= 20:
        reasons.append("Late night doses are harder to maintain")
    if feature_row.get("AvgDelayMins", 0) > 45:
        reasons.append("Consistently delayed dose-taking behavior")

    return reasons[:3]

# ═══════════════════════════════════════════
# RISK SCORE (UPGRADED)
# ═══════════════════════════════════════════

def compute_risk_score(db: Session, user_id: int) -> dict:
    logs = db.query(DoseLog).filter(
        DoseLog.user_id == user_id
    ).order_by(DoseLog.id.desc()).limit(30).all()

    if not logs:
        return {"risk_score": 25, "risk_level": "low", "reasons": []}

    taken = sum(1 for l in logs if l.status == "taken")
    weekly_logs = logs[:7]
    weekly_rate = sum(1 for l in weekly_logs if l.status == "taken") / len(weekly_logs)
    long_rate = taken / len(logs)

    consecutive_missed = 0
    for l in logs:
        if l.status == "missed":
            consecutive_missed += 1
        else:
            break

    consecutive_taken = 0
    for l in logs:
        if l.status == "taken":
            consecutive_taken += 1
        else:
            break

    today = datetime.utcnow()
    is_weekend = int(today.weekday() >= 5)

    last_log = logs[0] if logs else None
    behavior_tag = getattr(last_log, 'behavior_tag', '') or ''

    feature_row = {
        "DayOfWeek": today.weekday(),
        "Hour": today.hour,
        "IsWeekend": is_weekend,
        "Month": today.month,
        "DosePosition": 1,
        "MedicineAge": 30,
        "IsChronicMed": 1,
        "ConsecutiveMissed": consecutive_missed,
        "ConsecutiveTaken": consecutive_taken,
        "Last1Taken": int(len(logs) > 0 and logs[0].status == "taken"),
        "Last2Taken": int(len(logs) > 1 and logs[1].status == "taken"),
        "Last3Taken": int(len(logs) > 2 and logs[2].status == "taken"),
        "RecentAdherenceRate": round(weekly_rate, 3),
        "LongAdherenceRate": round(long_rate, 3),
        "SlotMissRate": 0.3,
        "AvgDelayMins": getattr(last_log, 'delay_minutes', 0) or 0,
        "IsBusy": int(behavior_tag == "busy"),
        "IsForgetful": int(behavior_tag == "forgetfulness"),
        "IsSideEffects": int(behavior_tag == "side_effects"),
        "IsIntentional": int(behavior_tag == "intentional_skip"),
        "MoodScore": 3.0,
        "PainLevel": 0.0,
        "BPSystolic": 120.0,
        "BloodSugar": 100.0
    }

    features_list = [feature_row[f] for f in FEATURE_NAMES]
    base_prob = predict_miss_probability(features_list)
    risk_score = int(base_prob * 100)

    # Modifier adjustments
    if consecutive_missed >= 2:
        risk_score = min(100, risk_score + 20)
    if weekly_rate < 0.6:
        risk_score = min(100, risk_score + 15)
    if consecutive_taken >= 7:
        risk_score = max(0, risk_score - 10)
    if long_rate > 0.9:
        risk_score = max(0, risk_score - 15)

    risk_level = (
        "high" if risk_score >= 66 else
        "medium" if risk_score >= 36 else
        "low"
    )

    reasons = get_miss_reasons(feature_row, base_prob)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "miss_probability": round(base_prob, 3),
        "weekly_adherence_pct": round(weekly_rate * 100, 1),
        "reasons": reasons,
        "model_used": "ensemble" if ml_models else "rules_based",
        "models_in_ensemble": list(ml_models.keys())
    }

# ═══════════════════════════════════════════
# GENERATE PREDICTIONS (UPGRADED)
# ═══════════════════════════════════════════

def generate_predictions_for_user(db: Session, user_id: int):
    medicines = db.query(Medicine).filter(
        Medicine.user_id == user_id,
        Medicine.is_active == True
    ).all()

    today_iso = datetime.utcnow().date().isoformat()
    db.query(Prediction).filter(
        Prediction.user_id == user_id,
        Prediction.predicted_date <= today_iso
    ).delete()

    logs = db.query(DoseLog).filter(
        DoseLog.user_id == user_id
    ).order_by(DoseLog.id.desc()).limit(30).all()

    taken = sum(1 for l in logs if l.status == "taken")
    weekly_logs = logs[:7]
def compute_risk_score(db: Session, user_id: int) -> dict:
    """Calculate current risk score using the optimized 22-feature GB model."""
    from models import User
    user = db.query(User).filter(User.id == user_id).first()
    logs = db.query(DoseLog).filter(DoseLog.user_id == user_id).order_by(DoseLog.scheduled_time.desc()).limit(30).all()
    if not logs: return {"risk_score": 25, "risk_level": "low", "reasons": []}

    # Context variables
    total_logs = db.query(DoseLog).filter(DoseLog.user_id == user_id).count()
    first_log_dt = parse_dt(db.query(DoseLog).filter(DoseLog.user_id == user_id).order_by(DoseLog.scheduled_time).first().scheduled_time)
    days_start = (datetime.utcnow() - first_log_dt).days
    
    taken = sum(1 for l in logs if l.status == "taken")
    weekly_logs = logs[:7]
    weekly_rate = sum(1 for l in weekly_logs if l.status == "taken") / len(weekly_logs)
    long_rate = taken / len(logs)

    consecutive_missed = 0
    for l in logs:
        if l.status == "missed": consecutive_missed += 1
        else: break
    
    consecutive_taken = 0
    for l in logs:
        if l.status == "taken": consecutive_taken += 1
        else: break

    # Feature Row for "Right Now"
    now = datetime.utcnow()
    feature_row = [
        now.weekday(), int(now.weekday() >= 5), now.month, now.hour,
        int(5 <= now.hour <= 11), int(17 <= now.hour <= 23),
        days_start, total_logs, 2, # d_per_day
        3, 0, GENDER_MAP.get(user.gender.lower() if user.gender else "", 2),
        0, 4, # generic med/disease for user-level risk
        user.age or 45, 0.8,
        weekly_rate, long_rate, consecutive_missed, consecutive_taken,
        0.2, 0.2
    ]

    prob = predict_miss_probability(feature_row)
    risk_score = int(prob * 100)
    risk_level = "high" if prob >= 0.65 else "medium" if prob >= 0.40 else "low"
    
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "miss_probability": prob,
        "weekly_adherence_pct": round(weekly_rate * 100, 1),
        "reasons": get_miss_reasons({"ConsecutiveMissed": consecutive_missed, "IsWeekend": int(now.weekday() >= 5), "SlotMissRate": 0.2, "RecentAdherenceRate": weekly_rate}, prob),
        "model_used": "GradientBoosting" if ml_models else "rules",
        "models_in_ensemble": ["GradientBoosting"] if ml_models else []
    }


def generate_predictions_for_user(db: Session, user_id: int):
    """Forecasting future missed doses for the next 3 days."""
    from models import User
    user = db.query(User).filter(User.id == user_id).first()
    medicines = db.query(Medicine).filter(Medicine.user_id == user_id, Medicine.is_active == True).all()

    today_iso = datetime.utcnow().date().isoformat()
    db.query(Prediction).filter(Prediction.user_id == user_id, Prediction.predicted_date <= today_iso).delete()

    logs = db.query(DoseLog).filter(DoseLog.user_id == user_id).order_by(DoseLog.scheduled_time.desc()).limit(30).all()
    if not logs: return

    total_doses_so_far = db.query(DoseLog).filter(DoseLog.user_id == user_id).count()
    first_log_dt = parse_dt(db.query(DoseLog).filter(DoseLog.user_id == user_id).order_by(DoseLog.scheduled_time).first().scheduled_time)
    
    taken = sum(1 for l in logs if l.status == "taken")
    weekly_rate = sum(1 for l in logs[:7] if l.status == "taken") / 7 if logs else 0.75
    long_rate = taken / len(logs) if logs else 0.75

    consecutive_missed = 0
    for l in logs:
        if l.status == "missed": consecutive_missed += 1
        else: break
    
    consecutive_taken = 0
    for l in logs:
        if l.status == "taken": consecutive_taken += 1
        else: break

    today = datetime.utcnow().date()

    for med in medicines:
        times = med.times_of_day or ["08:00"]
        medicine_age = (datetime.utcnow() - parse_dt(med.start_date or datetime.utcnow())).days
        disease_enc = DISEASE_MAP.get(med.disease.lower() if hasattr(med, 'disease') and med.disease else "general", 4)
        med_enc = hash(med.name.lower()) % 100

        for i, time_str in enumerate(times):
            hour = int(time_str.split(":")[0]) if ":" in time_str else 8
            for days_ahead in range(3):
                target_date = today + timedelta(days=days_ahead)
                is_weekend = int(target_date.weekday() >= 5)

                # Feature row for forecast
                feature_row = [
                    target_date.weekday(), is_weekend, target_date.month, hour,
                    int(5 <= hour <= 11), int(17 <= hour <= 23),
                    medicine_age + days_ahead, total_doses_so_far + i, 1,
                    3, 0, GENDER_MAP.get(user.gender.lower() if user.gender else "", 2),
                    med_enc, disease_enc, user.age or 45, 0.8,
                    weekly_rate, long_rate, consecutive_missed, consecutive_taken,
                    0.2, 0.2
                ]

                miss_prob = predict_miss_probability(feature_row)
                risk = "high" if miss_prob >= 0.65 else "medium" if miss_prob >= 0.40 else "low"

                pred = Prediction(
                    user_id=user_id, medicine_id=med.id,
                    predicted_date=target_date.isoformat(),
                    predicted_time=time_str,
                    miss_probability=round(miss_prob, 3),
                    risk_level=risk
                )
                db.add(pred)

    db.commit()

# ═══════════════════════════════════════════
# GEMINI INSIGHTS (unchanged logic, cleaner)
# ═══════════════════════════════════════════

def generate_adherence_insight(patient_data: dict) -> dict:
    prompt = f"""You are a healthcare AI analyzing medication adherence. Plain text only. No markdown.
Patient: Age {patient_data.get('age','N/A')}, Conditions: {patient_data.get('conditions','N/A')}
Weekly adherence: {patient_data.get('weekly_rate', 75)}%
Most missed: {patient_data.get('most_missed_medicine','N/A')} at {patient_data.get('most_missed_time','N/A')}
Streak: {patient_data.get('current_streak', 0)} days
Missed reasons: {patient_data.get('miss_reasons','N/A')}

Respond ONLY in this exact JSON with no extra text:
{{
  "encouragement": "One encouraging sentence",
  "pattern": "One specific behavioral pattern noticed",
  "recommendation": "One actionable suggestion",
  "risk_level": "Low/Medium/High",
  "risk_reason": "One line explanation"
}}"""

    if gemini_model:
        try:
            response = gemini_model.generate_content(prompt)
            data = extract_json(response.text)
            if data:
                return data
        except Exception:
            pass

    weekly_rate = patient_data.get('weekly_rate', 75)
    return {
        "encouragement": "Every dose taken is a step toward better health — keep going!",
        "pattern": f"Current weekly adherence is at {weekly_rate}%.",
        "recommendation": "Try setting a physical alarm as a backup to app reminders.",
        "risk_level": "High" if weekly_rate < 60 else "Medium" if weekly_rate < 80 else "Low",
        "risk_reason": "Based on recent adherence patterns from your history."
    }


def generate_weekly_summary(patient_data: dict) -> str:
    prompt = f"""Write a 3-sentence weekly medication adherence summary.
Be encouraging and clinically useful. Plain text only.
Data: {patient_data.get('weekly_rate',75)}% adherence, 
streak {patient_data.get('current_streak',0)} days,
{patient_data.get('missed_count',0)} missed doses this week."""

    if gemini_model:
        try:
            return gemini_model.generate_content(prompt).text.strip()
        except Exception:
            pass

    return (
        f"Patient achieved {patient_data.get('weekly_rate', 75)}% adherence this week. "
        f"Current streak stands at {patient_data.get('current_streak', 0)} days. "
        f"Focus on consistency for evening doses to improve overall compliance."
    )


# ═══════════════════════════════════════════
# MODEL STATUS (for dashboard display)
# ═══════════════════════════════════════════

def get_model_status() -> dict:
    return {
        "models_trained": list(ml_models.keys()),
        "model_count": len(ml_models),
        "last_trained_at": last_trained_at.isoformat() if last_trained_at else None,
        "auc_scores": {k: round(v, 4) for k, v in model_auc_scores.items()},
        "feature_importances": feature_importances[:10],
        "metrics": ml_metrics,
        "ensemble_active": len(ml_models) > 1,
        "fallback_active": len(ml_models) == 0
    }
