"""
╔══════════════════════════════════════════════════════════════╗
║    MediTrack — Model Comparison & Selection Script          ║
║    Compares: Logistic Regression, Random Forest, XGBoost,   ║
║             Gradient Boosting, and LSTM (PyTorch)           ║
║    Input:    medication_adherence_multi_disease_5_months.csv ║
║    Output:   model_comparison_results.txt                   ║
╚══════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import time
import warnings
import numpy as np
import pandas as pd
from datetime import datetime

warnings.filterwarnings("ignore")

# === ML (sklearn & XGBoost) ===
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix, make_scorer
)
import xgboost as xgb

# === Deep Learning (PyTorch LSTM) ===
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset


# ══════════════════════════════════════════════
# DATA LOADING & FEATURE ENGINEERING
# ══════════════════════════════════════════════

CSV_PATH = r"C:\Users\91981\Downloads\Ignition Hackverse 2026\medication_adherence_multi_disease_5_months.csv"
OUTPUT_PATH = r"C:\Users\91981\Downloads\Ignition Hackverse 2026\meditrack\backend\model_comparison_results.txt"

MOOD_MAP = {"good": 4, "normal": 3, "tired": 2, "low": 1, "stressed": 2}
REASON_MAP = {"none": 0, "busy": 1, "forgot": 2, "side effects": 3, "travel": 4, "late": 5}
ACTIVITY_MAP = {"home": 0, "work": 1, "travel": 2}


def load_and_engineer(csv_path: str) -> pd.DataFrame:
    """Load the CSV and create all features needed for model training."""
    df = pd.read_csv(csv_path)
    print(f"  Loaded {len(df)} rows from CSV.")

    # ── Target ──
    df["label"] = (df["taken"].str.lower() != "yes").astype(int)  # 1 = missed

    # ── Time features ──
    df["date_parsed"] = pd.to_datetime(df["date"])
    df["day_of_week"] = df["date_parsed"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["month"] = df["date_parsed"].dt.month
    df["hour"] = df["scheduled_time"].apply(lambda t: int(str(t).split(":")[0]))
    
    # NEW Time features
    df["is_morning"] = ((df["hour"] >= 5) & (df["hour"] <= 11)).astype(int)
    df["is_evening"] = ((df["hour"] >= 17) & (df["hour"] <= 23)).astype(int)

    # ── Encode categoricals ──
    df["mood_enc"] = df["mood"].str.lower().map(MOOD_MAP).fillna(3).astype(int)
    df["reason_enc"] = df["reason"].str.lower().map(REASON_MAP).fillna(0).astype(int)
    df["activity_enc"] = df["activity"].str.lower().map(ACTIVITY_MAP).fillna(0).astype(int)
    df["gender_enc"] = LabelEncoder().fit_transform(df["gender"])
    df["disease_enc"] = LabelEncoder().fit_transform(df["disease"])

    # ── Per-medication encoding ──
    df["med_enc"] = LabelEncoder().fit_transform(df["medication"])

    # ── Rolling behavioural features (per patient, sorted by date) ──
    df = df.sort_values(["patient_id", "date_parsed", "scheduled_time"]).reset_index(drop=True)

    # NEW: Days since start & Total doses so far
    df["days_since_start"] = (df["date_parsed"] - df.groupby("patient_id")["date_parsed"].transform("min")).dt.days
    df["total_doses_so_far"] = df.groupby("patient_id").cumcount() + 1
    
    # NEW: Doses per day
    df["doses_per_day"] = df.groupby(["patient_id", "date_parsed"])["patient_id"].transform("count")

    # Rolling adherence rate over last 7 rows per patient
    df["recent_adherence"] = (
        df.groupby("patient_id")["label"]
        .transform(lambda s: 1 - s.rolling(7, min_periods=1).mean().shift(1))
    ).fillna(0.75)

    # Rolling adherence rate over last 30 rows per patient
    df["long_adherence"] = (
        df.groupby("patient_id")["label"]
        .transform(lambda s: 1 - s.rolling(30, min_periods=1).mean().shift(1))
    ).fillna(0.75)

    # Consecutive missed/taken streaks (looking backwards)
    def consec_track(series, target_val):
        result = []
        streak = 0
        for val in series:
            result.append(streak)
            if val == target_val:
                streak += 1
            else:
                streak = 0
        return result

    df["consec_missed"] = df.groupby("patient_id")["label"].transform(lambda s: consec_track(s, 1))
    df["streak_taken"] = df.groupby("patient_id")["label"].transform(lambda s: consec_track(s, 0))

    # NEW: Historical Miss Rates for the specific slots
    # We use expanding mean shifted by 1 to prevent data leaks (predicting using PAST data only)
    df["miss_rate_same_weekday"] = (
        df.groupby(["patient_id", "day_of_week"])["label"]
        .transform(lambda s: s.expanding().mean().shift(1))
    ).fillna(0.2)

    df["miss_rate_same_hour"] = (
        df.groupby(["patient_id", "hour"])["label"]
        .transform(lambda s: s.expanding().mean().shift(1))
    ).fillna(0.2)

    # NEW: Disease-level adherence average (calculated across all patients)
    # Using expanding mean to avoid data leaks
    df = df.sort_values(by=["date_parsed", "scheduled_time"])
    df["disease_adherence_avg"] = (
        df.groupby("disease_enc")["label"]
        .transform(lambda s: 1 - s.expanding().mean().shift(1))
    ).fillna(0.75)
    
    # Restore original sort just in case
    df = df.sort_values(["patient_id", "date_parsed", "scheduled_time"]).reset_index(drop=True)

    # ── Delay as numeric ──
    df["delay_minutes"] = pd.to_numeric(df["delay_minutes"], errors="coerce").fillna(0)

    return df


# ══════════════════════════════════════════════
# FEATURE COLUMNS
# ══════════════════════════════════════════════

FEATURE_COLS = [
    "day_of_week", "is_weekend", "month", "hour",
    "is_morning", "is_evening", "days_since_start", "total_doses_so_far", "doses_per_day",
    "mood_enc", "activity_enc", "gender_enc", "med_enc", "disease_enc",
    "age", "disease_adherence_avg",
    "recent_adherence", "long_adherence", "consec_missed", "streak_taken",
    "miss_rate_same_weekday", "miss_rate_same_hour"
]
# NOTE: Excluded leak features:
#   - reason_enc:    only known AFTER the dose event (forgot/busy = missed)
#   - risk_score:    pre-computed label proxy from CSV
#   - delay_minutes: always 0 for missed doses, leaks the label


# ══════════════════════════════════════════════
# LSTM MODEL DEFINITION (PyTorch)
# ══════════════════════════════════════════════

class LSTMClassifier(nn.Module):
    """
    LSTM-based binary classifier for sequential adherence prediction.
    Processes a window of past dose records to predict the next miss.
    """
    def __init__(self, input_size, hidden_size=64, num_layers=2, dropout=0.3):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        # x shape: (batch, seq_len, features)
        lstm_out, _ = self.lstm(x)
        last_hidden = lstm_out[:, -1, :]     # Take the last time step
        return self.classifier(last_hidden).squeeze(-1)


def create_sequences(X_data: np.ndarray, y_data: np.ndarray, seq_len: int = 7):
    """
    Convert flat feature rows into overlapping sequences of length `seq_len`
    for the LSTM. Each sequence predicts the label of its LAST row.
    """
    X_seq, y_seq = [], []
    for i in range(seq_len, len(X_data)):
        X_seq.append(X_data[i - seq_len:i])
        y_seq.append(y_data[i])
    return np.array(X_seq), np.array(y_seq)


def train_lstm(X_train_seq, y_train_seq, X_test_seq, y_test_seq,
               input_size, epochs=30, lr=0.001, batch_size=32):
    """Train the LSTM model and return predictions + metrics."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"    LSTM device: {device}")

    model = LSTMClassifier(input_size=input_size).to(device)
    criterion = nn.BCELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

    # DataLoader
    train_ds = TensorDataset(
        torch.FloatTensor(X_train_seq),
        torch.FloatTensor(y_train_seq)
    )
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

    # Training loop
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            preds = model(xb)
            loss = criterion(preds, yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += loss.item()
        avg_loss = total_loss / len(train_loader)
        scheduler.step(avg_loss)
        if (epoch + 1) % 10 == 0:
            print(f"      Epoch {epoch+1}/{epochs} — Loss: {avg_loss:.4f}")

    # Evaluation
    model.eval()
    with torch.no_grad():
        X_test_t = torch.FloatTensor(X_test_seq).to(device)
        proba = model(X_test_t).cpu().numpy()
        preds = (proba >= 0.5).astype(int)

    return preds, proba


# ══════════════════════════════════════════════
# METRICS HELPER
# ══════════════════════════════════════════════

def compute_metrics(y_true, y_pred, y_proba=None) -> dict:
    metrics = {
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y_true, y_pred, zero_division=0), 4),
    }
    if y_proba is not None:
        try:
            metrics["auc_roc"] = round(roc_auc_score(y_true, y_proba), 4)
        except ValueError:
            metrics["auc_roc"] = "N/A"
    cm = confusion_matrix(y_true, y_pred)
    metrics["confusion_matrix"] = cm.tolist()
    return metrics


# ══════════════════════════════════════════════
# MAIN COMPARISON PIPELINE
# ══════════════════════════════════════════════

def run_comparison():
    print("=" * 60)
    print("  MediTrack — Model Comparison Pipeline")
    print("=" * 60)

    # ── 1. Load & Engineer ──
    print("\n[1/4] Loading and engineering features...")
    df = load_and_engineer(CSV_PATH)

    # STRICT TEMPORAL SORT for global splitting
    df = df.sort_values(["date_parsed", "scheduled_time"]).reset_index(drop=True)

    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df["label"].values.astype(np.float32)

    print(f"  Feature matrix: {X.shape}")
    print(f"  Class distribution:  Taken={int((y==0).sum())}, Missed={int((y==1).sum())}")
    print(f"  Miss rate: {y.mean()*100:.1f}%")

    # ── 2. Temporal Holdout Split (80/20) ──
    print("\n[2/4] Splitting data (Strict Temporal Split: 80% Train, 20% Test)...")
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print(f"  Split Date: {df.iloc[split_idx]['date']}")
    print(f"  Train: {len(X_train)} | Test: {len(X_test)}")

    # TimeSeriesSplit for CV
    tscv = TimeSeriesSplit(n_splits=5)

    # Scale for models that need it
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    results = {}

    # ── 3. Classical Models with Time-Series CV ──
    print("\n[3/4] Training classical ML models with 5-Fold TimeSeries CV...")

    # Calculate scale_pos_weight based on TRAIN set
    neg_count = int((y_train == 0).sum())
    pos_count = int((y_train == 1).sum())
    scale_pos = neg_count / pos_count if pos_count > 0 else 1.0

    classical_models = {
        "Logistic Regression": LogisticRegression(C=1.0, max_iter=1000, random_state=42, class_weight='balanced'),
        "Random Forest":       RandomForestClassifier(n_estimators=200, max_depth=10, min_samples_leaf=3, random_state=42, class_weight='balanced'),
        "XGBoost":             xgb.XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.05, subsample=0.8,
                                                  colsample_bytree=0.8, eval_metric='logloss', random_state=42, verbosity=0,
                                                  scale_pos_weight=scale_pos),
        "Gradient Boosting":   GradientBoostingClassifier(n_estimators=150, learning_rate=0.1, max_depth=5, random_state=42),
    }

    for name, model in classical_models.items():
        print(f"\n  Evaluating {name}...")
        t0 = time.time()
        Xtr = X_train_scaled if name == "Logistic Regression" else X_train
        Xte = X_test_scaled if name == "Logistic Regression" else X_test

        # Cross Validation score (Time Series Split)
        print(f"    Running 5-Fold TimeSeries CV...")
        cv_scores = cross_val_score(model, Xtr, y_train, cv=tscv, scoring='roc_auc')
        cv_auc = round(cv_scores.mean(), 4)
        
        # Fit on whole train with sample weighting for Gradient Boosting
        if name == "Gradient Boosting":
            # Missed doses (label=1) are 3.5x more important
            weights = np.where(y_train == 1, 3.5, 1.0)
            model.fit(Xtr, y_train, sample_weight=weights)
        else:
            model.fit(Xtr, y_train)
            
        elapsed = time.time() - t0

        proba = model.predict_proba(Xte)[:, 1]
        
        # Optimized Threshold Tuning (0.40 instead of 0.50)
        # We use 0.40 to prioritize Recall (catching missed doses)
        preds = (proba >= 0.40).astype(int)
        
        metrics = compute_metrics(y_test, preds, proba)
        metrics["cv_auc_avg"] = cv_auc
        metrics["training_time_sec"] = round(elapsed, 3)
        results[name] = metrics
        print(f"    ✓ {name} — CV AUC: {cv_auc} | Test AUC: {metrics['auc_roc']} ({elapsed:.2f}s)")

    # ── 4. LSTM ──
    print(f"\n[4/4] Training LSTM (sequence length=7)...")
    SEQ_LEN = 7

    # Create sequences from SCALED data (LSTM benefits from scaling)
    X_train_seq, y_train_seq = create_sequences(X_train_scaled, y_train, seq_len=SEQ_LEN)
    X_test_seq, y_test_seq = create_sequences(X_test_scaled, y_test, seq_len=SEQ_LEN)

    print(f"  Train sequences: {X_train_seq.shape} | Test sequences: {X_test_seq.shape}")

    t0 = time.time()
    lstm_preds, lstm_proba = train_lstm(
        X_train_seq, y_train_seq,
        X_test_seq, y_test_seq,
        input_size=X.shape[1],
        epochs=30, lr=0.001, batch_size=32
    )
    elapsed = time.time() - t0

    lstm_metrics = compute_metrics(y_test_seq, lstm_preds, lstm_proba)
    lstm_metrics["training_time_sec"] = round(elapsed, 3)
    results["LSTM (PyTorch)"] = lstm_metrics
    print(f"    ✓ LSTM — AUC: {lstm_metrics['auc_roc']}  F1: {lstm_metrics['f1']}  ({elapsed:.2f}s)")

    # ══════════════════════════════════════════════
    # WRITE RESULTS
    # ══════════════════════════════════════════════

    print("\n" + "=" * 60)
    print("  Writing results to output file...")

    lines = []
    lines.append("=" * 70)
    lines.append("  MediTrack — Model Comparison Report")
    lines.append(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"  Dataset: {os.path.basename(CSV_PATH)}")
    lines.append(f"  Total samples: {len(df)}  (Train: {len(X_train)}, Test: {len(X_test)})")
    lines.append(f"  Class distribution:  Taken={int((y==0).sum())}  Missed={int((y==1).sum())}")
    lines.append(f"  Miss rate: {y.mean()*100:.1f}%")
    lines.append(f"  Features used ({len(FEATURE_COLS)}): {', '.join(FEATURE_COLS)}")
    lines.append("=" * 70)

    # Rank by AUC
    ranked = sorted(results.items(),
                    key=lambda kv: kv[1].get("auc_roc", 0) if isinstance(kv[1].get("auc_roc"), float) else 0,
                    reverse=True)

    lines.append("")
    lines.append("┌────────────────────────────────────────────────────────────────────────────┐")
    lines.append("│                         RESULTS (Ranked by Test AUC)                       │")
    lines.append("├────────────────────────────────────────────────────────────────────────────┤")
    lines.append(f"│ {'Model':<22} {'CV AUC':>8} {'Test AUC':>8} {'F1':>8} {'Recall':>8} {'Acc':>8} │")
    lines.append("├────────────────────────────────────────────────────────────────────────────┤")

    for i, (name, m) in enumerate(ranked):
        cv_auc_str = f"{m.get('cv_auc_avg', 'N/A'):.4f}" if isinstance(m.get('cv_auc_avg'), float) else "  N/A   "
        test_auc_str = f"{m['auc_roc']:.4f}" if isinstance(m['auc_roc'], float) else m['auc_roc']
        medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else "  "
        lines.append(
            f"│{medal}{name:<20} {cv_auc_str:>8} {test_auc_str:>8} {m['f1']:>8.4f} "
            f"{m['recall']:>8.4f} {m['accuracy']:>8.4f} │"
        )

    lines.append("└────────────────────────────────────────────────────────────────────────────┘")

    # Best model
    best_name, best_m = ranked[0]
    lines.append("")
    lines.append(f"★ BEST MODEL: {best_name}")
    lines.append(f"  AUC-ROC: {best_m['auc_roc']}")
    lines.append(f"  F1 Score: {best_m['f1']}")
    lines.append(f"  Training Time: {best_m['training_time_sec']}s")

    # Detailed per-model section
    for name, m in ranked:
        lines.append("")
        lines.append(f"── {name} {'─' * (50 - len(name))}")
        lines.append(f"  Accuracy:    {m['accuracy']}")
        lines.append(f"  Precision:   {m['precision']}")
        lines.append(f"  Recall:      {m['recall']}")
        lines.append(f"  F1 Score:    {m['f1']}")
        lines.append(f"  CV AUC (Rolling):  {m.get('cv_auc_avg', 'N/A')}")
        lines.append(f"  Test AUC (Latest): {m['auc_roc']}")
        lines.append(f"  Train Time:  {m['training_time_sec']}s")
        cm = m["confusion_matrix"]
        lines.append(f"  Confusion Matrix (Holdout):")
        lines.append(f"    Predicted:    Taken   Missed")
        if len(cm) == 2:
            lines.append(f"    Actual Taken:  {cm[0][0]:>5}   {cm[0][1]:>5}")
            lines.append(f"    Actual Missed: {cm[1][0]:>5}   {cm[1][1]:>5}")
        else:
            lines.append(f"    {cm}")

    # Recommendation section
    lines.append("")
    lines.append("=" * 70)
    lines.append("  RECOMMENDATION")
    lines.append("=" * 70)
    lines.append(f"")
    lines.append(f"  Based on AUC-ROC (the gold standard for imbalanced classification),")
    lines.append(f"  the recommended model for production use is: ** {best_name} **")
    lines.append(f"")
    lines.append(f"  This model achieves {best_m['auc_roc']} AUC-ROC on held-out test data,")
    lines.append(f"  capturing the best trade-off between sensitivity and specificity")
    lines.append(f"  for predicting medication non-compliance.")
    lines.append("")

    output = "\n".join(lines)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(output)

    print(output)
    print(f"\n✅ Results saved to: {OUTPUT_PATH}")

    return results, best_name


if __name__ == "__main__":
    run_comparison()
