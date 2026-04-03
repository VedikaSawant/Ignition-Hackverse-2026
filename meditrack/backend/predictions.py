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
    "DayOfWeek", "Hour", "IsWeekend", "Month",
    "DosePosition", "MedicineAge", "IsChronicMed",
    "ConsecutiveMissed", "ConsecutiveTaken",
    "Last1Taken", "Last2Taken", "Last3Taken",
    "RecentAdherenceRate",    # Last 7 doses
    "LongAdherenceRate",      # Last 30 doses
    "SlotMissRate",           # Historical miss rate at this hour+weekday
    "AvgDelayMins",
    "IsBusy", "IsForgetful", "IsSideEffects", "IsIntentional",
    "MoodScore", "PainLevel", "BPSystolic", "BloodSugar"
]

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
    Extract rich behavioral features from 5 months of dose logs.
    Works for a single user or all users (for global model training).
    """
    query = db.query(DoseLog).filter(
        DoseLog.status.in_(["taken", "missed", "skipped"])
    )
    if user_id:
        query = query.filter(DoseLog.user_id == user_id)

    logs = query.order_by(DoseLog.user_id, DoseLog.scheduled_time).all()

    if len(logs) < MIN_LOGS_REQUIRED:
        return pd.DataFrame()

    # Pre-fetch all medicines and health metrics to avoid N+1 queries
    medicines = {m.id: m for m in db.query(Medicine).all()}
    health_metrics = {}
    for hm in db.query(HealthMetric).all():
        key = (hm.user_id, str(hm.date)[:10])
        health_metrics[key] = hm

    rows = []

    # Group logs by user for per-user historical calculations
    from itertools import groupby
    logs_by_user = {}
    for log in logs:
        logs_by_user.setdefault(log.user_id, []).append(log)

    for uid, user_logs in logs_by_user.items():
        user_logs = sorted(user_logs, key=lambda l: str(l.scheduled_time))

        for i, log in enumerate(user_logs):
            try:
                dt = parse_dt(log.scheduled_time)
                hour = dt.hour
                day_of_week = dt.weekday()
                is_weekend = int(day_of_week >= 5)
                month = dt.month
                date_str = dt.strftime("%Y-%m-%d")

                med = medicines.get(log.medicine_id)
                if not med:
                    continue

                # Medicine features
                start_dt = parse_dt(med.start_date) if med.start_date else dt
                medicine_age = max((dt - start_dt).days, 0)
                is_chronic = int(med.end_date is None)

                times = med.times_of_day or ["08:00"]
                dose_position = 1
                for idx, t in enumerate(times):
                    try:
                        if int(t.split(":")[0]) == hour:
                            dose_position = idx + 1
                            break
                    except:
                        pass

                # ── SHORT TERM: last 7 logs ──────────────────────
                past_7 = user_logs[max(0, i-7):i]
                recent_taken = sum(1 for l in past_7 if l.status == "taken")
                recent_adherence = recent_taken / len(past_7) if past_7 else 0.5

                # ── LONG TERM: last 30 logs ──────────────────────
                past_30 = user_logs[max(0, i-30):i]
                long_taken = sum(1 for l in past_30 if l.status == "taken")
                long_adherence = long_taken / len(past_30) if past_30 else 0.5

                # ── CONSECUTIVE STREAKS ──────────────────────────
                consecutive_missed = 0
                for l in reversed(past_7):
                    if l.status == "missed":
                        consecutive_missed += 1
                    else:
                        break

                consecutive_taken = 0
                for l in reversed(past_7):
                    if l.status == "taken":
                        consecutive_taken += 1
                    else:
                        break

                # ── LAST 3 DOSES ─────────────────────────────────
                last_3 = [user_logs[i-k].status == "taken"
                          if i-k >= 0 else True
                          for k in [1, 2, 3]]

                # ── SLOT MISS RATE ───────────────────────────────
                # Historical miss rate at this exact hour + weekday
                # This is your most powerful feature with 5 months data
                same_slot = [
                    l for l in user_logs[:i]
                    if parse_dt(l.scheduled_time).hour == hour
                    and parse_dt(l.scheduled_time).weekday() == day_of_week
                ]
                slot_miss_rate = (
                    sum(1 for l in same_slot if l.status != "taken")
                    / len(same_slot)
                ) if same_slot else 0.3

                # ── DELAY PATTERNS ───────────────────────────────
                delays = [
                    l.delay_minutes for l in past_7
                    if l.delay_minutes and l.status == "taken"
                ]
                avg_delay = float(np.mean(delays)) if delays else 0.0

                # ── BEHAVIOR TAGS ────────────────────────────────
                is_busy = int(getattr(log, 'behavior_tag', '') == "busy")
                is_forget = int(getattr(log, 'behavior_tag', '') == "forgetfulness")
                is_side_fx = int(getattr(log, 'behavior_tag', '') == "side_effects")
                is_intent = int(getattr(log, 'behavior_tag', '') == "intentional_skip")

                # ── HEALTH METRICS ───────────────────────────────
                hm = health_metrics.get((uid, date_str))
                mood = float(hm.mood) if hm and hm.mood else 3.0
                pain = float(hm.pain_level) if hm and hm.pain_level else 0.0
                bp = float(hm.blood_pressure_systolic) if hm and hm.blood_pressure_systolic else 120.0
                sugar = float(hm.blood_sugar) if hm and hm.blood_sugar else 100.0

                # ── TARGET ───────────────────────────────────────
                label = 0 if log.status == "taken" else 1  # 1 = missed

                rows.append({
                    "DayOfWeek": day_of_week,
                    "Hour": hour,
                    "IsWeekend": is_weekend,
                    "Month": month,
                    "DosePosition": dose_position,
                    "MedicineAge": medicine_age,
                    "IsChronicMed": is_chronic,
                    "ConsecutiveMissed": consecutive_missed,
                    "ConsecutiveTaken": consecutive_taken,
                    "Last1Taken": int(last_3[0]),
                    "Last2Taken": int(last_3[1]),
                    "Last3Taken": int(last_3[2]),
                    "RecentAdherenceRate": round(recent_adherence, 3),
                    "LongAdherenceRate": round(long_adherence, 3),
                    "SlotMissRate": round(slot_miss_rate, 3),
                    "AvgDelayMins": round(avg_delay, 1),
                    "IsBusy": is_busy,
                    "IsForgetful": is_forget,
                    "IsSideEffects": is_side_fx,
                    "IsIntentional": is_intent,
                    "MoodScore": mood,
                    "PainLevel": pain,
                    "BPSystolic": bp,
                    "BloodSugar": sugar,
                    "label": label
                })

            except Exception as e:
                continue

    return pd.DataFrame(rows)

# ═══════════════════════════════════════════
# MODEL TRAINING (UPGRADED ENSEMBLE)
# ═══════════════════════════════════════════

def train_ml_model(db: Session) -> bool:
    """
    Train full weighted ensemble on all available behavioral data.
    Uses train/test split for real AUC-based weighting.
    """
    global ml_models, ml_metrics, model_auc_scores
    global feature_importances, last_trained_at

    df = extract_features(db)
    if df.empty or len(df) < MIN_LOGS_REQUIRED:
        return False

    X = df[FEATURE_NAMES].values
    y = df["label"].values

    # Real train/test split — fixes your in-sample evaluation issue
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    trained = {}
    metrics = {}
    auc_scores = {}

    # ── MODEL 1: XGBoost ─────────────────────────────────────
    if XGB_AVAILABLE:
        try:
            xgb_model = xgb.XGBClassifier(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                eval_metric='logloss',
                random_state=42,
                verbosity=0
            )
            xgb_model.fit(X_train, y_train)
            trained["XGBoost"] = xgb_model

            proba = xgb_model.predict_proba(X_test)[:, 1]
            pred = xgb_model.predict(X_test)
            auc = roc_auc_score(y_test, proba)
            auc_scores["XGBoost"] = auc
            metrics["XGBoost"] = _calc_metrics(y_test, pred, proba)

            # Feature importances from XGBoost
            importances = xgb_model.feature_importances_
            sorted_idx = np.argsort(importances)[::-1]
            feature_importances = [
                {
                    "feature": FEATURE_NAMES[i],
                    "importance": round(float(importances[i]), 4),
                    "readable": _readable_feature(FEATURE_NAMES[i])
                }
                for i in sorted_idx
            ]
        except Exception as e:
            print(f"XGBoost training failed: {e}")

    # ── MODEL 2: Random Forest ────────────────────────────────
    try:
        rf = RandomForestClassifier(
            n_estimators=150,
            max_depth=8,
            min_samples_leaf=5,
            random_state=42
        )
        rf.fit(X_train, y_train)
        trained["RandomForest"] = rf

        proba = rf.predict_proba(X_test)[:, 1]
        pred = rf.predict(X_test)
        auc = roc_auc_score(y_test, proba)
        auc_scores["RandomForest"] = auc
        metrics["RandomForest"] = _calc_metrics(y_test, pred, proba)

        # Use RF importances as fallback if XGB not available
        if not feature_importances:
            importances = rf.feature_importances_
            sorted_idx = np.argsort(importances)[::-1]
            feature_importances = [
                {
                    "feature": FEATURE_NAMES[i],
                    "importance": round(float(importances[i]), 4),
                    "readable": _readable_feature(FEATURE_NAMES[i])
                }
                for i in sorted_idx
            ]
    except Exception as e:
        print(f"Random Forest training failed: {e}")

    # ── MODEL 3: Gradient Boosting ────────────────────────────
    try:
        gb = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        gb.fit(X_train, y_train)
        trained["GradientBoosting"] = gb

        proba = gb.predict_proba(X_test)[:, 1]
        pred = gb.predict(X_test)
        auc = roc_auc_score(y_test, proba)
        auc_scores["GradientBoosting"] = auc
        metrics["GradientBoosting"] = _calc_metrics(y_test, pred, proba)
    except Exception as e:
        print(f"Gradient Boosting training failed: {e}")

    # ── MODEL 4: Logistic Regression ─────────────────────────
    try:
        lr_pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('lr', LogisticRegression(
                C=1.0, max_iter=1000, random_state=42
            ))
        ])
        lr_pipeline.fit(X_train, y_train)
        trained["LogisticRegression"] = lr_pipeline

        proba = lr_pipeline.predict_proba(X_test)[:, 1]
        pred = lr_pipeline.predict(X_test)
        auc = roc_auc_score(y_test, proba)
        auc_scores["LogisticRegression"] = auc
        metrics["LogisticRegression"] = _calc_metrics(y_test, pred, proba)
    except Exception as e:
        print(f"Logistic Regression training failed: {e}")

    if not trained:
        return False

    ml_models = trained
    ml_metrics = metrics
    model_auc_scores = auc_scores
    last_trained_at = datetime.utcnow()

    print(f"✅ Trained {len(trained)} models")
    for name, auc in auc_scores.items():
        print(f"   {name}: AUC={auc:.4f}")

    return True


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
    Weighted ensemble prediction.
    Better AUC score = higher vote weight.
    Falls back to rules if no models trained.
    """
    global ml_models, model_auc_scores

    if not ml_models:
        return _rules_based_score(features_list)

    X = np.array([features_list])
    total_weight = sum(model_auc_scores.values()) or 1.0
    weighted_proba = 0.0

    for name, model in ml_models.items():
        try:
            proba = model.predict_proba(X)[0]
            # Index of class "1" (missed)
            classes = list(model.classes_) if hasattr(model, 'classes_') else [0, 1]
            miss_idx = classes.index(1) if 1 in classes else 1
            miss_prob = float(proba[miss_idx])
            weight = model_auc_scores.get(name, 0.5) / total_weight
            weighted_proba += weight * miss_prob
        except Exception:
            continue

    return round(float(weighted_proba), 3) if weighted_proba > 0 else _rules_based_score(features_list)


def _rules_based_score(features_list: list) -> float:
    """Fallback when ML models aren't trained yet."""
    try:
        (day_of_week, hour, is_weekend, month, dose_position,
         med_age, is_chronic, consec_missed, consec_taken,
         l1, l2, l3, recent_rate, long_rate, slot_miss_rate,
         avg_delay, is_busy, is_forget, is_side_fx, is_intent,
         mood, pain, bp, sugar) = features_list

        score = 30.0
        score += is_weekend * 15
        score += (12 if hour >= 19 else 5 if hour >= 13 else 0)
        score += consec_missed * 12
        score -= consec_taken * 5
        score += (1 - recent_rate) * 20
        score += slot_miss_rate * 25   # Most powerful rule
        score += is_side_fx * 20
        score += is_intent * 15
        score += (is_busy + is_forget) * 8
        score -= (mood - 3) * 3        # Low mood = higher risk
        score += pain * 2

        return round(max(0.0, min(1.0, score / 100.0)), 3)
    except:
        return 0.4

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

    # ── Delay Pattern ─────────────────────────────────────────
    avg_delay = df["AvgDelayMins"].mean()
    if avg_delay > 30:
        patterns.append({
            "icon": "⏰",
            "title": "Chronic Lateness Pattern",
            "description": f"Doses taken on average {round(avg_delay)} minutes late — risk of timing-sensitive medicine issues",
            "severity": "medium",
            "data": {"avg_delay_minutes": round(avg_delay, 1)}
        })

    return patterns


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
    weekly_rate = sum(1 for l in weekly_logs if l.status=="taken") / len(weekly_logs) if weekly_logs else 0.75
    long_rate = taken / len(logs) if logs else 0.75

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

    l1 = int(len(logs) > 0 and logs[0].status == "taken")
    l2 = int(len(logs) > 1 and logs[1].status == "taken")
    l3 = int(len(logs) > 2 and logs[2].status == "taken")

    last_log = logs[0] if logs else None
    behavior_tag = getattr(last_log, 'behavior_tag', '') or ''
    d_mins = getattr(last_log, 'delay_minutes', 0) or 0

    today = datetime.utcnow().date()

    for med in medicines:
        times = med.times_of_day or ["08:00"]
        start = parse_dt(med.start_date) if med.start_date else datetime.utcnow()
        medicine_age = max((datetime.utcnow() - start).days, 0)
        is_chronic = int(med.end_date is None)

        for i, time_str in enumerate(times):
            try:
                hour = int(time_str.split(":")[0])
            except:
                hour = 8

            for days_ahead in range(3):  # Today + next 2 days
                target_date = today + timedelta(days=days_ahead)
                is_weekend = int(target_date.weekday() >= 5)

                # Calculate slot miss rate from history
                slot_logs = [
                    l for l in logs
                    if parse_dt(l.scheduled_time).hour == hour
                    and parse_dt(l.scheduled_time).weekday() == target_date.weekday()
                ]
                slot_miss_rate = (
                    sum(1 for l in slot_logs if l.status != "taken")
                    / len(slot_logs)
                ) if slot_logs else 0.3

                feature_row = [
                    target_date.weekday(), hour, is_weekend,
                    target_date.month, i + 1, medicine_age, is_chronic,
                    consecutive_missed, consecutive_taken,
                    l1, l2, l3,
                    round(weekly_rate, 3), round(long_rate, 3),
                    round(slot_miss_rate, 3), float(d_mins),
                    int(behavior_tag == "busy"),
                    int(behavior_tag == "forgetfulness"),
                    int(behavior_tag == "side_effects"),
                    int(behavior_tag == "intentional_skip"),
                    3.0, 0.0, 120.0, 100.0
                ]

                miss_prob = predict_miss_probability(feature_row)
                risk = (
                    "high" if miss_prob > 0.65 else
                    "medium" if miss_prob > 0.35 else
                    "low"
                )

                pred = Prediction(
                    user_id=user_id,
                    medicine_id=med.id,
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
