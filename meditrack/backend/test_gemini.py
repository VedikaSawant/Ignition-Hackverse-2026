from dotenv import load_dotenv
load_dotenv()
import os
import google.generativeai as genai
import json

api_key = os.getenv("GEMINI_API_KEY", "")
print("Key length:", len(api_key) if api_key else 0)

genai.configure(api_key=api_key)
model = genai.GenerativeModel("models/gemini-2.0-flash")

prompt = """
You are Dr. Aria.
Respond ONLY with a valid JSON using strictly this format:
{
  "response": "Your spoken response.",
  "intent": "None",
  "behavior_tag": "unknown"
}
"""

try:
    response = model.generate_content(prompt)
    print("Raw output:")
    print(response.text)
    raw_text = response.text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    print("Parsed JSON:")
    try:
        print(json.loads(raw_text.strip()))
    except json.JSONDecodeError as decode_error:
        print("JSON Decode Error!", decode_error)
        print("Cleaned text was:", raw_text.strip())
except Exception as e:
    print("Error:", e)
