import os
from dotenv import load_dotenv
load_dotenv()
import google.generativeai as genai
import json
import re

def extract_json(res_text):
    """Refined JSON extraction for LLM outputs."""
    # Look for first { and last }
    match = re.search(r'\{.*\}', res_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None

api_key = os.getenv("GEMINI_API_KEY", "")
print(f"Using key starting with: {api_key[:5]}...")

genai.configure(api_key=api_key)
# Switching to gemini-1.5-flash
model = genai.GenerativeModel("gemini-1.5-flash")

prompt = """
Respond ONLY with a JSON object in this exact format:
{
  "response": "Hello, I am Dr. Aria.",
  "intent": "None",
  "behavior_tag": "unknown"
}
"""

try:
    print("Generating content...")
    response = model.generate_content(prompt)
    print("--- RAW TEXT ---")
    print(response.text)
    print("--- PARSED JSON ---")
    data = extract_json(response.text)
    if data:
        print(json.dumps(data, indent=2))
    else:
        print("FAILED TO EXTRACT JSON")
except Exception as e:
    print(f"ERROR: {e}")
    # Try gemini-pro as backup
    print("Retrying with gemini-pro...")
    try:
        model_backup = genai.GenerativeModel("gemini-pro")
        response = model_backup.generate_content(prompt)
        print(response.text)
    except Exception as e2:
        print(f"BACKUP ERROR: {e2}")
