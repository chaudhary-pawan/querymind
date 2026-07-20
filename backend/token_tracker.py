"""
Helper module to track and persist token consumption from the Groq API.
Stores cumulative tokens in token_usage.json to monitor the 10K limit.
"""

import json
import os
import threading
from datetime import datetime

TOKEN_FILE = os.path.join(os.path.dirname(__file__), "token_usage.json")
_lock = threading.Lock()


def get_empty_usage() -> dict:
    """Return empty default token usage statistics."""
    return {
        "total_prompt_tokens": 0,
        "total_completion_tokens": 0,
        "total_tokens": 0,
        "history": []
    }


def load_usage() -> dict:
    """Load token usage from JSON file with a thread safety lock."""
    with _lock:
        if not os.path.exists(TOKEN_FILE):
            return get_empty_usage()
        try:
            with open(TOKEN_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return get_empty_usage()


def save_usage(data: dict):
    """Save token usage to JSON file with a thread safety lock."""
    with _lock:
        try:
            with open(TOKEN_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving token usage: {e}")


def add_tokens(prompt_tokens: int, completion_tokens: int, task: str = "unknown", details: str = "") -> dict:
    """
    Log token usage, update total counts, and append transaction history.
    Keeps last 50 transactions to prevent file bloating.
    """
    data = load_usage()
    
    # Update totals
    data["total_prompt_tokens"] += prompt_tokens
    data["total_completion_tokens"] += completion_tokens
    data["total_tokens"] += (prompt_tokens + completion_tokens)
    
    # Log entry
    history_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "task": task,
        "details": details[:150],
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens
    }
    
    # Add to history and prune if > 50 entries
    history = data.get("history", [])
    history.append(history_entry)
    if len(history) > 50:
        history = history[-50:]
    data["history"] = history
    
    save_usage(data)
    return data


def get_stats() -> dict:
    """Get current token usage statistics."""
    return load_usage()


def reset_stats() -> dict:
    """Reset all token usage statistics to 0."""
    data = get_empty_usage()
    save_usage(data)
    return data
