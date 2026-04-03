import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def test_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY is not set!")
        return

    print(f"Testing with API Key: {api_key[:5]}...{api_key[-5:]}")
    genai.configure(api_key=api_key)
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Hello, are you working?")
        print(f"✅ Response from Gemini: {response.text}")
    except Exception as e:
        print(f"❌ Error from Gemini: {str(e)}")

if __name__ == "__main__":
    test_gemini()
