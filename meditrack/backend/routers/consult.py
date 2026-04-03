import os
import io
import base64
import json
import time
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import pyttsx3
import re
import google.generativeai as genai

from database import get_db
from models import User, ConsultationLog, DoseLog, Medicine, Prediction
from schemas import ConsultRequest, ConsultResponse, ConsultLogOut
from auth import get_current_user
from predictions import analyze_behavioral_patterns

router = APIRouter(prefix="/api/consult", tags=["consult"])
print("🔍 DEBUG: Loading meditrack/backend/routers/consult.py [v3.0 — robust multi-model fallback]")

# ---------------------------------------------------------------------------
# Gemini Initialization — NO test calls at startup to preserve quota
# ---------------------------------------------------------------------------
# Ordered by preference: best free-tier quota first
MODEL_CANDIDATES = [
    "models/gemini-2.5-flash",          # Latest, best free-tier RPM
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-lite",
    "models/gemini-2.5-flash-lite",
    "models/gemini-flash-latest",
    "models/gemini-3-flash-preview",
]

gemini_models = []   # list of GenerativeModel objects to try at runtime
_api_configured = False

try:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key and api_key != "your_gemini_api_key_here":
        genai.configure(api_key=api_key)
        _api_configured = True
        # Pre-build model objects (cheap — no network call)
        for model_name in MODEL_CANDIDATES:
            try:
                gemini_models.append(genai.GenerativeModel(model_name))
            except Exception:
                pass
        print(f"✅ Aria: Initialized {len(gemini_models)} candidate models (no test calls — quota preserved)")
    else:
        print("❌ Aria: No valid GEMINI_API_KEY found in .env")
except Exception as e:
    print(f"❌ Aria: Error during Gemini initialization: {e}")


def _call_gemini(prompt: str, max_retries: int = 2) -> str | None:
    """Try each candidate model in order. On 429, move to the next model.
    Returns the raw response text or None if all models fail."""
    for model in gemini_models:
        for attempt in range(max_retries):
            try:
                response = model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                err = str(e)
                if "429" in err:
                    # Rate-limited on this model — try next model immediately
                    print(f"⚠️ Aria: 429 on {model.model_name} (attempt {attempt+1}), trying next model...")
                    if attempt < max_retries - 1:
                        time.sleep(1)  # brief pause before retry on same model
                    break  # move to next model
                elif "404" in err:
                    print(f"⚠️ Aria: {model.model_name} not found (404), skipping")
                    break  # move to next model
                else:
                    print(f"❌ Aria: Error on {model.model_name}: {err}")
                    break  # move to next model
    return None


def extract_json(text: str) -> dict:
    """Robustly extract JSON from a string that may contain markdown or other text."""
    if not text:
        return None
    
    # Remove markdown code blocks if present
    clean_text = text.strip()
    if clean_text.startswith("```"):
        # Look for the first newline to skip ```json or ```
        first_newline = clean_text.find('\n')
        if first_newline != -1:
            clean_text = clean_text[first_newline:].strip()
        # Remove trailing ```
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3].strip()

    try:
        # First try direct parse in case it's clean
        return json.loads(clean_text)
    except:
        # Fallback: look for the first { and last }
        try:
            match = re.search(r'(\{.*\})', clean_text, re.DOTALL)
            if match:
                return json.loads(match.group(1))
        except:
            pass
    return None

def generate_audio(text: str) -> str:
    temp_file = f"response_{int(time.time())}.mp3"
    try:
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        
        # Robustly find a female voice (Zira is default on Windows)
        chosen_voice = None
        for v in voices:
            if "zira" in v.name.lower() or "female" in v.name.lower():
                chosen_voice = v.id
                break
        
        if chosen_voice:
            engine.setProperty('voice', chosen_voice)
        elif len(voices) > 1:
            # Fallback to second voice if Zira not found by name
            engine.setProperty('voice', voices[1].id)
            
        # Set clinical speed (slower for clarity)
        engine.setProperty('rate', 150)
        
        # Save to file
        engine.save_to_file(text, temp_file)
        engine.runAndWait()
        
        # Give OS a moment to finish file writing
        time.sleep(0.2)
        
        if os.path.exists(temp_file):
            with open(temp_file, "rb") as audio_file:
                encoded = base64.b64encode(audio_file.read()).decode('utf-8')
            
            # Cleanup
            try:
                os.remove(temp_file)
            except:
                pass
            return encoded
        return ""
    except Exception as e:
        print(f"PyTTSx3 Error: {e}")
        # Final cleanup attempt
        if os.path.exists(temp_file):
            try: os.remove(temp_file)
            except: pass
        return ""

@router.get("/trigger")
def check_trigger(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(DoseLog).filter(DoseLog.user_id == current_user.id).order_by(DoseLog.id.desc()).limit(3).all()
    consecutive_missed = sum(1 for l in logs if l.status == "missed") >= 3
    latest_high_risk = db.query(Prediction).filter(
        Prediction.user_id == current_user.id,
        Prediction.risk_level == "high"
    ).first()
    return {"should_trigger": consecutive_missed or (latest_high_risk is not None)}

@router.post("/generate", response_model=ConsultResponse)
def generate_response(data: ConsultRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_log = ConsultationLog(user_id=current_user.id, role="user", content=data.message)
    db.add(user_log)
    db.commit()

    medicines = db.query(Medicine).filter(Medicine.user_id == current_user.id, Medicine.is_active == True).all()
    med_names = [m.name for m in medicines]

    # Fetch recent conversation history for context (last 10 messages)
    recent_logs = db.query(ConsultationLog).filter(
        ConsultationLog.user_id == current_user.id
    ).order_by(ConsultationLog.timestamp.desc()).limit(10).all()
    recent_logs.reverse()  # Order chronologically for the prompt
    
    history_context = ""
    for log in recent_logs:
        role_label = "Aria" if log.role == "ai" else "Patient"
        history_context += f"{role_label}: {log.content}\n"

    # Fetch behavioral patterns for proactive advice
    patterns = analyze_behavioral_patterns(db, current_user.id)
    behavioral_context = ""
    if patterns:
        behavioral_context = "DETECTED BEHAVIORAL PATTERNS TO ADDRESS:\n"
        for p in patterns:
            behavioral_context += f"- {p['title']}: {p['description']} (Severity: {p['severity']})\n"

    prompt = f"""You are Aria, a caring, empathetic, and professional personalized AI Health Consultant.
Your patient's name is {current_user.name}. They are taking: {', '.join(med_names) if med_names else 'No medications'}.
Your goal is to LEAD the consultation and help manage their dashboard. Act like a behavioral health investigator and advisor.

{behavioral_context}

YOU CAN PERFORM THESE ACTIONS:
1. Log a dose (taken/missed).
2. Add a new medicine.
3. Pause/Resume a medication.
4. Delete a medication.

If the user wants to add a medicine but hasn't provided all info (dosage, frequency, times_of_day), ASK them for it.
Default for medicine_type is 'tablet'. Default for before_after_food is 'after'.

CONVERSATION HISTORY:
{history_context}

Latest Patient Message: "{data.message}"

Respond ONLY with a valid JSON in this format:
{{
  "response": "Your spoken response.",
  "intent": "None" | "LogTaken" | "LogMissed" | "AddMedicine" | "PauseMedicine" | "ResumeMedicine" | "DeleteMedicine",
  "medicine_name": "Name of med for log/pause/delete" | null,
  "new_med_details": {{ 
      "name": "string",
      "dosage": "string",
      "medicine_type": "tablet" | "capsule" | "syrup" | "injection",
      "frequency": "once" | "twice" | "thrice" | "every_4_hours",
      "times_of_day": ["HH:MM"],
      "before_after_food": "before" | "after"
  }} | null,
  "behavior_tag": "unknown" | "forgetfulness" | "side_effects" | "busy" | "intentional_skip"
}}
Set 'new_med_details' ONLY if you have enough info to add it. Otherwise ask in 'response'.
"""

    print(f"🤖 Aria: Processing message from {current_user.name}: '{data.message}'")
    text_response = "I'm here to support you. Let's stay on track today and work together for your health."
    intent = "None"
    behavior_tag = "unknown"
    extracted_med = None
    new_med_details = None

    if gemini_models:
        raw_text = _call_gemini(prompt)
        if raw_text:
            print(f"📡 AI RAW RESPONSE: {raw_text[:500]}")
            parsed = extract_json(raw_text)
            if parsed:
                text_response = parsed.get("response", text_response)
                intent = parsed.get("intent", "None")
                behavior_tag = parsed.get("behavior_tag", "unknown")
                extracted_med = parsed.get("medicine_name")
                new_med_details = parsed.get("new_med_details")
                print(f"✅ AI Parsed Successfully: Intent={intent}, Med={extracted_med}, Tag={behavior_tag}")
            else:
                print(f"⚠️ AI Parsing Failed. Using raw text. Raw: {raw_text[:300]}")
                text_response = raw_text
        else:
            print("❌ All Gemini models failed (quota/network). Using safe fallback.")
            text_response = "I'm here to support you. Let's stay on track today and work together for your health."
    else:
        print("⚠️ Aria is in safe mode (No API key or no models configured)")
        text_response = "I'm here to support you. Let's stay on track today and work together for your health."

    logged_medicine_name = None
    action_taken = None
    new_med_data_out = None

    if intent in ["LogTaken", "LogMissed"]:
        status_to_set = "taken" if intent == "LogTaken" else "missed"
        today_str = datetime.utcnow().date().isoformat()
        
        pending_dose = None
        if extracted_med:
            pending_dose = db.query(DoseLog).join(Medicine).filter(
                DoseLog.user_id == current_user.id,
                Medicine.name.ilike(f"%{extracted_med}%"),
                DoseLog.scheduled_time.like(f"{today_str}%"),
                DoseLog.status == "pending"
            ).first()

        if not pending_dose:
            pending_dose = db.query(DoseLog).filter(
                DoseLog.user_id == current_user.id,
                DoseLog.scheduled_time.like(f"{today_str}%"),
                DoseLog.status == "pending"
            ).order_by(DoseLog.scheduled_time.asc()).first()
        
        if pending_dose:
            pending_dose.status = status_to_set
            pending_dose.logged_by = "ai_consultant"
            pending_dose.behavior_tag = behavior_tag
            
            med = db.query(Medicine).filter(Medicine.id == pending_dose.medicine_id).first()
            logged_medicine_name = med.name if med else None
            
            if status_to_set == "taken":
                pending_dose.actual_taken_time = datetime.utcnow().strftime("%H:%M")
                if logged_medicine_name and logged_medicine_name.lower() not in text_response.lower():
                    text_response += f" I've noted that you've taken your {logged_medicine_name}."
            action_taken = "DoseLogged"

    elif intent == "AddMedicine" and new_med_details:
        try:
            med = Medicine(
                user_id=current_user.id,
                name=new_med_details['name'],
                dosage=new_med_details.get('dosage', '1 dose'),
                medicine_type=new_med_details.get('medicine_type', 'tablet'),
                frequency=new_med_details.get('frequency', 'once'),
                times_of_day=new_med_details.get('times_of_day', ["08:00"]),
                before_after_food=new_med_details.get('before_after_food', 'after'),
                start_date=datetime.utcnow().date().isoformat()
            )
            db.add(med)
            db.commit()
            db.refresh(med)
            
            today_str = datetime.utcnow().date().isoformat()
            for time_str in med.times_of_day:
                dose = DoseLog(
                    user_id=current_user.id,
                    medicine_id=med.id,
                    scheduled_time=f"{today_str}T{time_str}:00",
                    status="pending",
                    logged_by="ai_consultant"
                )
                db.add(dose)
            db.commit()
            
            action_taken = "MedicineAdded"
            new_med_data_out = {"name": med.name}
            print(f"🚀 Aria added new medicine: {med.name}")
        except Exception as e:
            print(f"Error adding medicine via AI: {e}")

    elif intent in ["PauseMedicine", "ResumeMedicine", "DeleteMedicine"] and extracted_med:
        med = db.query(Medicine).filter(
            Medicine.user_id == current_user.id,
            Medicine.name.ilike(f"%{extracted_med}%")
        ).first()
        if med:
            if intent == "PauseMedicine":
                med.is_paused = True
                action_taken = "MedicinePaused"
            elif intent == "ResumeMedicine":
                med.is_paused = False
                action_taken = "MedicineResumed"
            elif intent == "DeleteMedicine":
                med.is_active = False
                action_taken = "MedicineDeleted"
            new_med_data_out = {"name": med.name}
            db.commit()

    audio_b64 = generate_audio(text_response)
    ai_log = ConsultationLog(user_id=current_user.id, role="ai", content=text_response)
    db.add(ai_log)
    db.commit()

    return ConsultResponse(
        text_response=text_response, 
        audio_b64=audio_b64, 
        intent=intent,
        logged_medicine=logged_medicine_name,
        action_taken=action_taken,
        new_medicine_data=new_med_data_out
    )

@router.get("/history", response_model=list[ConsultLogOut])
def get_consult_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ConsultationLog).filter(ConsultationLog.user_id == current_user.id).order_by(ConsultationLog.timestamp.asc()).all()
