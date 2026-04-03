from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Medicine, User
from schemas import PrescriptionScanOut, PrescriptionMedicine, MedicineCreate
from auth import get_current_user
import os
import io
import json
import base64
from datetime import datetime

# --- NEW OCR DEPENDECIES ---
import cv2
import numpy as np
import pytesseract
from PIL import Image

# IMPORTANT: Path to tesseract executable.
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

router = APIRouter(prefix="/api/prescription", tags=["prescription"])


def map_frequency_to_times(frequency_str: str) -> list[str]:
    """
    Map common medical frequency abbreviations to standard times.
    """
    freq = frequency_str.lower()
    if "once" in freq or "od" in freq or "morning" in freq:
        return ["08:00"]
    if "twice" in freq or "bd" in freq or "1-0-1" in freq:
        return ["08:00", "21:00"]
    if "three" in freq or "tds" in freq or "1-1-1" in freq:
        return ["08:00", "14:00", "21:00"]
    if "four" in freq or "qid" in freq:
        return ["08:00", "12:00", "16:00", "21:00"]
    if "night" in freq or "hs" in freq:
        return ["21:00"]
    return ["08:00"] # Default


# --- STEP 2: PREPROCESSING ---
def preprocess(image_bytes):
    # Convert bytes to numpy array for cv2
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5,5), 0)
    thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    return thresh

# --- STEP 3: TEXT EXTRACTION ---
def extract_text(image):
    # Relies purely on the local computer's Tesseract installation!
    text = pytesseract.image_to_string(image)
    return text

# --- STEP 4: CLEANING ---
def clean_text(text):
    text = text.lower()
    # Don't completely destroy newlines, as they separate medicines efficiently
    # However, sometimes OCR produces weird linebreaks, we'll keep it mostly intact
    return text

# --- STEP 5: PARSING ---
import re

def parse_medicines(text):
    medicines = []
    
    # Common frequency mappings
    freq_patterns = {
        r"twice\s+daily|bd|b\.i\.d|1-0-1": "twice daily",
        r"once\s+daily|od|1-0-0|0-0-1|at\s+night|hs": "once daily",
        r"three\s+times|tds|t\.i\.d|1-1-1": "three times daily",
        r"four\s+times|qid|1-1-1-1": "four times daily"
    }

    # Extract lines
    lines = text.lower().split("\n")
    
    for line in lines:
        if not line.strip():
            continue
            
        # Look for dosage patterns like "500mg", "5 mg", "100 ml"
        match = re.search(r"(?:tab|cap|syr)?\.?\s*([a-zA-Z\s]+?)\s+(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|iu|%))", line)
        if match:
            # We matched something with a dosage!
            raw_name = match.group(1).strip()
            # Clean up the name (remove leading words like 'tab', 'cap', 'rx', '1.', etc.)
            raw_name = re.sub(r'^(tab|cap|capsule|tablet|rx|\d+\.)\s+', '', raw_name).strip()
            name = raw_name.title()
            
            dosage = match.group(2).replace(" ", "")
            
            # Find frequency
            freq = "once daily" # default
            for pat, val in freq_patterns.items():
                if re.search(pat, line):
                    freq = val
                    break
                    
            # Find timing (use word boundaries to avoid matching "acid" for "ac")
            timing = "not mentioned"
            if re.search(r"\b(after food|pc|post meal)\b", line):
                timing = "after food"
            elif re.search(r"\b(before food|ac|pre meal)\b", line):
                timing = "before food"
            elif "night" in line:
                timing = "after food" # Assumed
                
            if len(name) > 2:
                medicines.append({
                    "name": name,
                    "dosage": dosage,
                    "frequency": freq,
                    "duration": "30 days", # Default
                    "timing": timing
                })
            
    return medicines


@router.post("/scan")
async def scan_prescription(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """
    Offline implementation using PyTesseract and OpenCV.
    """
    try:
        contents = await file.read()
        
        # 1. Preprocess using OpenCV
        processed_img = preprocess(contents)
        
        # 2. Extract Text via PyTesseract
        raw_text = extract_text(processed_img)
        
        # 3. Clean Text
        cleaned = clean_text(raw_text)
        
        # 4. Parse Medicines
        meds = parse_medicines(cleaned)
        
        # 5. Keyword Intelligence
        special_instructions = []
        if "after food" in cleaned:
            special_instructions.append("Take medicines after meal.")
            
        if "metformin" in cleaned:
            special_instructions.append("Keyword Intelligence [disease=diabetes] -> Monitor blood sugar levels.")
            
        if "atorvastatin" in cleaned or "amlodipine" in cleaned:
            special_instructions.append("Keyword Intelligence [disease=cardio] -> Daily 30 min walks prescribed.")

        return {
            "patient_name": "Not Supported in Offline OCR",
            "doctor_name": "Not Supported in Offline OCR",
            "medicines": meds,
            "special_instructions": " ".join(special_instructions) if special_instructions else "None"
        }
    
    except Exception as e:
        print(f"OCR Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan prescription offline: {str(e)}")


@router.post("/confirm")
def confirm_prescription(
    medicines: list[PrescriptionMedicine], 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Saves the manually confirmed medicines to the user's schedule.
    """
    added_meds = []
    for m in medicines:
        times = map_frequency_to_times(m.frequency)
        
        duration_days = 30 # Default
        try:
            if "day" in m.duration.lower():
                duration_days = int("".join(filter(str.isdigit, m.duration)) or 30)
            elif "month" in m.duration.lower():
                duration_days = int("".join(filter(str.isdigit, m.duration)) or 1) * 30
        except:
            pass
            
        new_med = Medicine(
            user_id=current_user.id,
            name=m.name,
            dosage=m.dosage,
            medicine_type="tablet",
            frequency=m.frequency,
            times_of_day=times,
            before_after_food="after" if "after" in m.timing.lower() else "before" if "before" in m.timing.lower() else "after",
            start_date=datetime.utcnow().date().isoformat(),
            total_quantity=len(times) * duration_days,
            remaining_quantity=len(times) * duration_days,
            refill_alert_threshold=5,
            is_active=True
        )
        db.add(new_med)
        added_meds.append(new_med)
    
    db.commit()
    return {"message": f"{len(added_meds)} medicines added successfully"}

@router.post("/scan-and-save")
async def scan_and_save_prescription(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Offline zero-touch pipeline that scans AND saves directly inline.
    """
    try:
        contents = await file.read()
        
        processed_img = preprocess(contents)
        raw_text = extract_text(processed_img)
        cleaned = clean_text(raw_text)
        meds = parse_medicines(cleaned)

        added_meds = []
        for m in meds:
            times = map_frequency_to_times(m["frequency"])
            new_med = Medicine(
                user_id=current_user.id,
                name=m["name"],
                dosage=m["dosage"],
                medicine_type="tablet",
                frequency=m["frequency"],
                times_of_day=times,
                before_after_food="after" if "after" in m["timing"].lower() else "before" if "before" in m["timing"].lower() else "after",
                start_date=datetime.utcnow().date().isoformat(),
                total_quantity=len(times) * 30,
                remaining_quantity=len(times) * 30,
                refill_alert_threshold=5,
                is_active=True
            )
            db.add(new_med)
            added_meds.append(new_med)
        
        db.commit()

        return {
            "medicines_added": len(added_meds),
            "patient_name": current_user.name,
            "medicines": meds
        }

    except Exception as e:
        print(f"OCR Error during scan-and-save: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan prescription offline: {str(e)}")