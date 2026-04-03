import os
import io
import base64
import json
from dotenv import load_dotenv
from gtts import gTTS
import google.generativeai as genai

load_dotenv()

def test_gtts():
    print("Testing gTTS...")
    try:
        text = "Hello, I am testing the audio system."
        tts = gTTS(text=text, lang='en')
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_b64 = base64.b64encode(fp.read()).decode('utf-8')
        print(f"gTTS Success! Audio base64 length: {len(audio_b64)}")
        return True
    except Exception as e:
        print(f"gTTS Error: {e}")
        return False

def test_gemini():
    print("Testing Gemini...")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return False
    
    genai.configure(api_key=api_key)
    
    # Try different model names
    models = ["gemini-1.5-flash", "gemini-pro"]
    for model_name in models:
        print(f"Trying model: {model_name}")
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content("Say 'Hello World' in JSON format: {'msg': 'Hello World'}")
            print(f"Gemini Success with {model_name}!")
            print(f"Response: {response.text}")
            return True
        except Exception as e:
            print(f"Gemini Error with {model_name}: {e}")
    
    return False

if __name__ == "__main__":
    gtts_ok = test_gtts()
    gemini_ok = test_gemini()
    
    if gtts_ok and gemini_ok:
        print("\nAll systems functional!")
    else:
        print("\nSome systems failed. Check errors above.")
