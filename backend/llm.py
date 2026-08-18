"""
Groq LLM integration.
Handles API client initialization and the explain_sql function.
"""

import os
from dotenv import load_dotenv
from groq import Groq
import token_tracker
from logging_config import get_logger

log = get_logger("llm")

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Configure Groq API
API_KEY = os.getenv("GROQ_API_KEY")
client = None

# Model requested by the user
# Active Groq production model
MODEL = "llama-3.3-70b-versatile"

if not API_KEY:
    print("Warning: GROQ_API_KEY not found in .env or environment variables.")
else:
    client = Groq(api_key=API_KEY)


def get_client() -> Groq:
    """Get the Groq client instance."""
    return client


def get_model() -> str:
    """Get the configured model name (mapped to a supported version)."""
    return MODEL


def explain_sql(sql: str) -> str:
    """
    Explains a SQL query in plain English using Groq (mapped model).
    Tracks and records the token usage for the call.
    """
    if not client:
        raise ValueError("Groq Client not initialized. Check your GROQ_API_KEY in .env.")
    
    prompt = f"""You are a professional data analyst. Explain the following SQL query in plain English for a business user.
    
    Rules:
    - Use actual table and column names from the query.
    - Be structured and clear (use bullet points if necessary).
    - Explain WHAT the query is doing and WHY (the business goal).
    - Keep it concise but technically accurate (mention JOINs, filters, and aggregations clearly).
    
    Query: {sql}
    
    Explanation:"""
    
    response = client.chat.completions.create(
        model=get_model(),
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,
        temperature=0.9,
    )
    
    explanation = response.choices[0].message.content.strip()
    
    # Track Groq token usage
    usage = getattr(response, "usage", None)
    if usage:
        token_tracker.add_tokens(
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            task="Explain Query",
            details=sql
        )
        log.info("explain_query_tokens", prompt_tokens=usage.prompt_tokens, completion_tokens=usage.completion_tokens)
        
    return explanation
