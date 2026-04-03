import os
import io
import base64
import json
import time
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from gtts import gTTS
import re
import google.generativeai as genai

from database import get_db
from models import User, ConsultationLog, DoseLog, Medicine, Prediction
from schemas import ConsultRequest, ConsultResponse, ConsultLogOut
from auth import get_current_user

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
        print(f"✅ Dr. Aria: Initialized {len(gemini_models)} candidate models (no test calls — quota preserved)")
    else:
        print("❌ Dr. Aria: No valid GEMINI_API_KEY found in .env")
except Exception as e:
    print(f"❌ Dr. Aria: Error during Gemini initialization: {e}")


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
                    print(f"⚠️ Dr. Aria: 429 on {model.model_name} (attempt {attempt+1}), trying next model...")
                    if attempt < max_retries - 1:
                        time.sleep(1)  # brief pause before retry on same model
                    break  # move to next model
                elif "404" in err:
                    print(f"⚠️ Dr. Aria: {model.model_name} not found (404), skipping")
                    break  # move to next model
                else:
                    print(f"❌ Dr. Aria: Error on {model.model_name}: {err}")
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
    try:
        tts = gTTS(text=text, lang='en', tld='us', slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return base64.b64encode(fp.read()).decode('utf-8')
    except Exception as e:
        print(f"TTS Error: {e}")
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
    
    prompt = f"""You are Dr. Aria, a highly experienced, caring, empathetic, and professional AI Medical Assistant.
Your patient's name is {current_user.name}. They are taking: {', '.join(med_names) if med_names else 'No medications'}.
Your goal is to LEAD the conversation. Act like a behavioral investigator. 
If this is the start of the call (User say: "INIT_CALL"), give a warm, professional proactive greeting like "Hello {current_user.name}, I'm Dr. Aria. I've been reviewing your adherence data. How are you feeling today?" or similar.
If they missed a dose, ask specific investigative questions (e.g., "Was it a busy day, or did you experience any side effects?").
Support them, encourage them, and ensure they feel heard. 

Patient says: "{data.message}"

Respond ONLY with a valid JSON using strictly this format:
{{
  "response": "Your spoken response.",
  "intent": "None" | "LogTaken" | "LogMissed",
  "behavior_tag": "unknown" | "forgetfulness" | "side_effects" | "busy" | "intentional_skip"
}}
Set intent to 'LogTaken' if they took it safely. Set intent to 'LogMissed' if they explicitly haven't or won't.
Set behavior_tag to the closest reason they provided. Default to 'unknown'.
"""

    print(f"🤖 Dr. Aria: Processing message from {current_user.name}: '{data.message}'")
    text_response = "I'm here to support you. Let's stay on track today and work together for your health."
    intent = "None"
    behavior_tag = "unknown"

    if gemini_models:
        raw_text = _call_gemini(prompt)
        if raw_text:
            print(f"📡 AI RAW RESPONSE: {raw_text[:500]}")
            parsed = extract_json(raw_text)
            if parsed:
                text_response = parsed.get("response", text_response)
                intent = parsed.get("intent", "None")
                behavior_tag = parsed.get("behavior_tag", "unknown")
                print(f"✅ AI Parsed Successfully: Intent={intent}, Tag={behavior_tag}")
            else:
                # Model responded but JSON parsing failed — use raw text as response
                print(f"⚠️ AI Parsing Failed. Using raw text. Raw: {raw_text[:300]}")
                text_response = raw_text
        else:
            print("❌ All Gemini models failed (quota/network). Using safe fallback.")
            text_response = "I'm here to support you. Let's stay on track today and work together for your health."
    else:
        print("⚠️ Dr. Aria is in safe mode (No API key or no models configured)")
        text_response = "I'm here to support you. Let's stay on track today and work together for your health."

    
    if intent in ["LogTaken", "LogMissed"]:
        status_to_set = "taken" if intent == "LogTaken" else "missed"
        today_str = datetime.utcnow().date().isoformat()
        pending_dose = db.query(DoseLog).filter(
            DoseLog.user_id == current_user.id,
            DoseLog.scheduled_time.like(f"{today_str}%"),
            DoseLog.status == "pending"
        ).order_by(DoseLog.scheduled_time.asc()).first()
        
        if pending_dose:
            pending_dose.status = status_to_set
            pending_dose.logged_by = "ai_consultant"
            pending_dose.behavior_tag = behavior_tag
            if status_to_set == "taken":
                pending_dose.actual_taken_time = datetime.utcnow().strftime("%H:%M")

    audio_b64 = generate_audio(text_response)
    ai_log = ConsultationLog(user_id=current_user.id, role="ai", content=text_response)
    db.add(ai_log)
    db.commit()

    return ConsultResponse(text_response=text_response, audio_b64=audio_b64, intent=intent)

@router.get("/history", response_model=list[ConsultLogOut])
def get_consult_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ConsultationLog).filter(ConsultationLog.user_id == current_user.id).order_by(ConsultationLog.timestamp.asc()).all()
