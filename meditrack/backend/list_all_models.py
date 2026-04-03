import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

def list_all_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return
    
    genai.configure(api_key=api_key)
    
    print(f"Listing ALL models...")
    try:
        models = genai.list_models()
        # Convert iterator to list to make sure we print everything
        model_list = list(models)
        for m in model_list:
            print(f"Name: {m.name}, Methods: {m.supported_generation_methods}")
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_all_models()
