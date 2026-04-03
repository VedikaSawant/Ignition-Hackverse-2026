import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

candidates = [
    "models/deep-research-pro-preview-12-2025",
    "models/gemini-2.0-flash-exp",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro",
    "models/gemini-pro",
    "models/gemini-3.1-flash-live-preview"
]

for model_name in candidates:
    print(f"Testing {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hi", generation_config={"max_output_tokens": 10})
        print(f"  SUCCESS: {response.text}")
    except Exception as e:
        print(f"  FAILED: {e}")
