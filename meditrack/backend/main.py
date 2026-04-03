from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import sys

# Crucial fix for Windows terminals crashing when printing 🚀 and 🔍
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

from database import init_db, seed_demo_data
from scheduler import start_scheduler
from predictions import train_ml_model
from database import SessionLocal

from routers import auth, medicines, doses, analytics, predictions, alerts, health, achievements, caregiver, doctor, consult, intelligence, prescription


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting MediTrack server...")
    init_db()
    seed_demo_data()

    # Train ML model with existing data
    db = SessionLocal()
    try:
        train_ml_model(db)
        print("✅ ML model trained")
    except Exception as e:
        print(f"⚠️ ML model training skipped: {e}")
    finally:
        db.close()

    # Start background scheduler
    start_scheduler()

    yield

    # Shutdown
    print("👋 Shutting down MediTrack server...")


app = FastAPI(
    title="MediTrack API",
    description="Smart Medicine Adherence System with Predictive Analytics",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(medicines.router)
app.include_router(doses.router)
app.include_router(analytics.router)
app.include_router(predictions.router)
app.include_router(alerts.router)
app.include_router(health.router)
app.include_router(achievements.router)
app.include_router(caregiver.router)
app.include_router(doctor.router)
app.include_router(consult.router)
app.include_router(intelligence.router)
app.include_router(prescription.router)


@app.get("/")
def root():
    return {
        "app": "MediTrack",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "demo_accounts": {
            "patient": {"email": "patient@demo.com", "password": "demo123"},
            "caregiver": {"email": "caregiver@demo.com", "password": "demo123"},
            "doctor": {"email": "doctor@demo.com", "password": "demo123"},
        },
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
