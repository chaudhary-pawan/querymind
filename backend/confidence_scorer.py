"""
Confidence scoring via Gemini self-evaluation.
Asks Gemini to rate its own SQL generation confidence
using structured JSON output.
"""

import json
from logging_config import get_logger

log = get_logger("confidence_scorer")


class ConfidenceScorer:
    """
    Uses Gemini to self-evaluate the quality of a generated SQL query.
    Returns a confidence score (0.0-1.0) with reasoning.
    """

    # Confidence thresholds
    LOW_THRESHOLD = 0.5
    HIGH_THRESHOLD = 0.8

    def __init__(self, gemini_client, model: str = "gemini-2.5-flash-lite"):
        self.client = gemini_client
        self.model = model

    def score(self, question: str, sql: str, schema: str) -> dict:
        """
        Ask Gemini to evaluate the generated SQL.
        
        Returns:
            {
                "confidence": 0.85,
                "confidence_label": "HIGH",
                "reasoning": "The query correctly joins...",
                "potential_issues": []
            }
        """
        if not self.client:
            return self._default_score("Gemini client not available")

        prompt = f"""You are a SQL quality evaluator. Rate how confident you are that the following SQL query correctly answers the user's question.

Schema:
{schema}

User Question: {question}

Generated SQL: {sql}

Evaluate the SQL and respond with ONLY a JSON object (no markdown, no backticks):
{{
    "confidence": <float between 0.0 and 1.0>,
    "reasoning": "<brief explanation of your rating>",
    "potential_issues": ["<issue1>", "<issue2>"] or []
}}

Rating guidelines:
- 0.9-1.0: Perfect match, simple query, no ambiguity
- 0.7-0.9: Good match, minor ambiguity possible
- 0.5-0.7: Moderate confidence, question is ambiguous or complex
- 0.0-0.5: Low confidence, question is unclear or SQL may be wrong"""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )

            raw = response.text.strip()
            # Clean up markdown formatting if present
            raw = raw.replace("```json", "").replace("```", "").strip()

            result = json.loads(raw)
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
