# 💊 MediTrack — Smart Medicine Adherence System

**MediTrack** is a full-stack web application that helps patients track medication intake, receive smart reminders, and provides caregivers/doctors with adherence insights and predictions powered by AI.

## 🎯 Key Features

- **Patient Dashboard** — Real-time medication tracking with adherence ring, risk intelligence, and streak gamification
- **AI Insights** — Gemini AI-powered behavioral analysis and personalized recommendations
- **Predictive Analytics** — ML-based miss prediction using RandomForestClassifier
- **Caregiver View** — Monitor linked patients, receive alerts, confirm doses remotely
- **Doctor View** — Clinical adherence reports, prescribe medicines, flag non-compliant patients
- **Gamification** — Points, levels, badges, and streak tracking for motivation
- **Health Metrics** — Track BP, blood sugar, weight, mood with correlation analysis

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Tailwind CSS + Recharts |
| Backend | FastAPI (Python) |
| Database | SQLite + SQLAlchemy ORM |
| AI/ML | scikit-learn + Google Gemini API |
| Auth | JWT-based authentication |
| Scheduler | APScheduler (background jobs) |

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm 8+

### Backend Setup

```bash
cd meditrack/backend
pip install -r requirements.txt
# (Optional) Add your Gemini API key to .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd meditrack/frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## 🎯 Demo Accounts

The app automatically seeds demo data on first startup:

| Role | Email | Password |
|------|-------|----------|
| Patient | patient@demo.com | demo123 |
| Caregiver | caregiver@demo.com | demo123 |
| Doctor | doctor@demo.com | demo123 |

**Quick Access:** Visit `/demo` to auto-login as the patient demo account.

## 📁 Project Structure

```
meditrack/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── database.py          # DB connection + seed data
│   ├── auth.py              # JWT auth logic
│   ├── predictions.py       # ML model + Gemini API
│   ├── scheduler.py         # Background scheduler
│   ├── requirements.txt
│   ├── .env.example
│   └── routers/
│       ├── auth.py
│       ├── medicines.py
│       ├── doses.py
│       ├── analytics.py
│       ├── predictions.py
│       ├── alerts.py
│       ├── health.py
│       ├── achievements.py
│       ├── caregiver.py
│       └── doctor.py
├── frontend/
│   ├── src/
│   │   ├── api/             # API client layer
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React Context (Auth)
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Page components
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🔒 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
SECRET_KEY=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com)

## 👥 Team

Built for **Ignition Hackverse 2026** 🏆
