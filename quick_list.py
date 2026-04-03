import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

def quick_list():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return
    genai.configure(api_key=api_key)
    print("--- Models ---")
    try:
        # Get iterator
        models = genai.list_models()
        # Print only the part after models/
        for m in models:
            print(m.name.replace("models/", ""))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    quick_list()
