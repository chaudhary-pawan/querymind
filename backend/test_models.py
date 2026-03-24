import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

test_models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-pro"
]

for model_name in test_models:
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("test")
        print(f"SUCCESS: {model_name}")
        break
    except Exception as e:
        print(f"FAILED: {model_name} - {e}")
