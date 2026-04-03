import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

MODEL_CANDIDATES = ["models/deep-research-pro-preview-12-2025", "models/gemini-2.0-flash-exp", "models/gemini-1.5-flash", "models/gemini-pro"]

for model_name in MODEL_CANDIDATES:
    print(f"Testing {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("test", generation_config={"max_output_tokens": 1})
        print(f"OK: SUCCESS with {model_name}")
        # Stop at the first working one
        break
    except Exception as e:
        print(f"ERR: FAILED with {model_name}: {e}")
