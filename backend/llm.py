"""
Gemini LLM integration (via the OpenAI-compatible endpoint).
Handles API client initialization and the explain_sql function.
"""

import os
from dotenv import load_dotenv
from openai import OpenAI
import token_tracker
from logging_config import get_logger

log = get_logger("llm")

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Configure Gemini via its OpenAI-compatible endpoint
API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
client = None

# Active Gemini model (free tier). flash-lite = fast + low cost.
MODEL = "gemini-2.5-flash-lite"

# Passed on every request so thinking tokens don't eat the output budget.
NO_THINKING = {"reasoning_effort": "none"}

if not API_KEY:
    print("Warning: GEMINI_API_KEY not found in .env or environment variables.")
else:
    client = OpenAI(api_key=API_KEY, base_url=GEMINI_BASE_URL)


def get_client() -> OpenAI:
    """Get the Gemini (OpenAI-compatible) client instance."""
    return client


def get_model() -> str:
    """Get the configured model name."""
    return MODEL


def explain_sql(sql: str) -> str:
    """
    Explains a SQL query in plain English using Gemini.
    Tracks and records the token usage for the call.
    """
    if not client:
        raise ValueError("Gemini client not initialized. Check your GEMINI_API_KEY in .env.")

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
        extra_body=NO_THINKING,
    )

    explanation = response.choices[0].message.content.strip()

    # Track Gemini token usage
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
