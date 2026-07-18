"""
Gemini LLM integration.
Handles API client initialization and the explain_sql function.
SQL generation is now handled by the GuardrailsPipeline.
"""

from google import genai
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Configure Gemini API
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
client = None

MODEL = "gemini-2.5-flash-lite"

if not API_KEY:
    print("Warning: GEMINI_API_KEY not found in .env or environment variables.")
else:
    client = genai.Client(api_key=API_KEY)


def get_client():
    """Get the Gemini client instance."""
    return client


def get_model():
    """Get the configured model name."""
    return MODEL


def explain_sql(sql: str) -> str:
    """
    Explains a SQL query in plain English using Gemini.
    """
    if not client:
        raise ValueError("Gemini Client not initialized. Check your API key.")
    
    prompt = f"""You are a professional data analyst. Explain the following SQL query in plain English for a business user.
    
    Rules:
    - Use actual table and column names from the query.
    - Be structured and clear (use bullet points if necessary).
    - Explain WHAT the query is doing and WHY (the business goal).
    - Keep it concise but technically accurate (mention JOINs, filters, and aggregations clearly).
    
    Query: {sql}
    
    Explanation:"""
    
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )
    return response.text.strip()
