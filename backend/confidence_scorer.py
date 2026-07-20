"""
Confidence scoring via Groq self-evaluation.
Asks Llama 2 to rate its own SQL generation confidence
using structured JSON output.
"""

import json
import token_tracker
from logging_config import get_logger

log = get_logger("confidence_scorer")


class ConfidenceScorer:
    """
    Uses Groq to self-evaluate the quality of a generated SQL query.
    Returns a confidence score (0.0-1.0) with reasoning.
    """

    # Confidence thresholds
    LOW_THRESHOLD = 0.5
    HIGH_THRESHOLD = 0.8

    def __init__(self, groq_client, model: str = "llama2-7b-chat"):
        self.client = groq_client
        self.model = model

    def score(self, question: str, sql: str, schema: str) -> dict:
        """
        Ask Groq/Llama 2 to evaluate the generated SQL.
        
        Returns:
            {
                "confidence": 0.85,
                "confidence_label": "HIGH",
                "reasoning": "The query correctly joins...",
                "potential_issues": []
            }
        """
        if not self.client:
            return self._default_score("Groq client not available")

        prompt = f"""You are a SQL quality evaluator. Rate how confident you are that the following SQL query correctly answers the user's question.

Schema:
{schema}

User Question: {question}

Generated SQL: {sql}

Evaluate the SQL and respond with ONLY a JSON object. Do not output markdown, backticks, or any conversational text.
Your response MUST be parseable JSON:
{{
    "confidence": <float between 0.0 and 1.0>,
    "reasoning": "<brief explanation of your rating>",
    "potential_issues": ["<issue1>", "<issue2>"] or []
}}"""

        raw = ""
        try:
            actual_model = "llama-3.1-8b-instant" if self.model == "llama2-7b-chat" else self.model
            response = self.client.chat.completions.create(
                model=actual_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=256,
                temperature=0.9,
            )

            raw = response.choices[0].message.content.strip()
            
            # Track usage
            usage = getattr(response, "usage", None)
            if usage:
                token_tracker.add_tokens(
                    prompt_tokens=usage.prompt_tokens,
                    completion_tokens=usage.completion_tokens,
                    task="Confidence Scorer",
                    details=f"Q: {question[:50]} | SQL: {sql[:50]}"
                )

            # Clean up markdown formatting if present
            raw_clean = raw.replace("```json", "").replace("```", "").strip()

            # Attempt to locate JSON block if LLM added conversational text
            start_idx = raw_clean.find("{")
            end_idx = raw_clean.rfind("}")
            if start_idx != -1 and end_idx != -1:
                raw_json = raw_clean[start_idx:end_idx + 1]
            else:
                raw_json = raw_clean

            result = json.loads(raw_json)
            confidence = float(result.get("confidence", 0.5))
            confidence = max(0.0, min(1.0, confidence))  # Clamp to [0, 1]

            label = self._get_label(confidence)

            scored = {
                "confidence": round(confidence, 2),
                "confidence_label": label,
                "reasoning": result.get("reasoning", ""),
                "potential_issues": result.get("potential_issues", []),
            }

            log.info(
                "confidence_scored",
                confidence=scored["confidence"],
                label=label,
                issues_count=len(scored["potential_issues"]),
            )

            return scored

        except json.JSONDecodeError as e:
            log.warning("confidence_json_parse_error", error=str(e), raw_response=raw[:200])
            return self._default_score(f"Failed to parse confidence response: {str(e)[:100]}")
        except Exception as e:
            log.error("confidence_scoring_error", error=str(e))
            return self._default_score(f"Scoring error: {str(e)[:100]}")

    def _get_label(self, confidence: float) -> str:
        """Map confidence float to a human-readable label."""
        if confidence >= self.HIGH_THRESHOLD:
            return "HIGH"
        elif confidence >= self.LOW_THRESHOLD:
            return "MEDIUM"
        else:
            return "LOW"

    def _default_score(self, reason: str) -> dict:
        """Return a default medium-confidence score when scoring fails."""
        return {
            "confidence": 0.5,
            "confidence_label": "MEDIUM",
            "reasoning": reason,
            "potential_issues": ["Confidence scoring unavailable"],
        }
