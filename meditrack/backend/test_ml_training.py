from database import SessionLocal
import predictions
import json

def test():
    db = SessionLocal()
    print("Testing ML Model Training...")
    success = predictions.train_ml_model(db)
    if success:
        print("Training completed successfully!")
        status = predictions.get_model_status()
        print("\n=== Model Status ===")
        print(f"Models Trained: {status['models_trained']}")
        print("AUC Scores:", json.dumps(status['auc_scores'], indent=2))
        
        # Test a prediction
        print("\n=== Sample Risk Score for Vedika ===")
        # Assuming Vedika is User ID 1 based on fresh DB
        risk = predictions.compute_risk_score(db, 1)
        print(json.dumps(risk, indent=2))

        print("\n=== Behavioral Patterns ===")
        patterns = predictions.analyze_behavioral_patterns(db, 1)
        print(json.dumps(patterns, indent=2))
        
    else:
        print("Training failed - insufficient data or error.")

if __name__ == "__main__":
    test()
