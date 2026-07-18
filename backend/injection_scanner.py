"""
Prompt injection scanner.
Scans user's natural language input BEFORE sending to the LLM.
Detects common SQL injection patterns and prompt manipulation attempts.
"""

import re
from dataclasses import dataclass, field
from typing import List
from logging_config import get_logger

log = get_logger("injection_scanner")


@dataclass
class ScanResult:
    """Result of an injection scan."""
    is_safe: bool
    risk_score: float  # 0.0 = safe, 1.0 = definitely malicious
    detected_patterns: List[str] = field(default_factory=list)
    details: str = ""


# Patterns that indicate SQL injection attempts in natural language input
INJECTION_PATTERNS = [
    # Direct SQL injection attempts
    (r";\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b", "Direct SQL injection: statement chaining"),
    (r"'\s*(OR|AND)\s+['\d]", "SQL injection: boolean-based tautology"),
    (r"UNION\s+(ALL\s+)?SELECT", "SQL injection: UNION-based extraction"),
    (r"--\s*$", "SQL injection: comment-based truncation"),
    (r"/\*.*\*/", "SQL injection: block comment injection"),

    # Prompt manipulation attempts
    (r"ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|rules|prompts)", "Prompt injection: instruction override"),
    (r"(system\s*prompt|new\s*instructions?|override\s*rules?)", "Prompt injection: system prompt manipulation"),
    (r"forget\s+(everything|all|your)\s+(you|instructions|rules)", "Prompt injection: memory wipe attempt"),
    (r"you\s+are\s+now\s+a", "Prompt injection: role reassignment"),
    (r"pretend\s+(you|to)\s+(are|be)\s+a", "Prompt injection: role reassignment"),
    (r"(act|behave)\s+as\s+(if|though|a)", "Prompt injection: behavioral override"),

    # Schema extraction attempts
    (r"(sqlite_master|information_schema|pg_catalog|sys\.tables)", "Schema extraction: system table access"),
    (r"(SHOW\s+TABLES|DESCRIBE\s+|\.schema|\.tables)", "Schema extraction: metadata enumeration"),
]


class InjectionScanner:
    """
    Scans user input for prompt injection and SQL injection patterns.
    This runs BEFORE the input reaches the LLM.
    """

    def scan(self, user_input: str) -> ScanResult:
        """
        Scan user input for injection patterns.
        Returns a ScanResult with risk assessment.
        """
        detected = []

        for pattern, description in INJECTION_PATTERNS:
            if re.search(pattern, user_input, re.IGNORECASE):
                detected.append(description)

        risk_score = min(len(detected) / 3.0, 1.0)  # Cap at 1.0
        is_safe = len(detected) == 0

        if detected:
            log.warning(
                "injection_patterns_detected",
                input_preview=user_input[:100],
                patterns=detected,
                risk_score=risk_score,
            )

        return ScanResult(
            is_safe=is_safe,
            risk_score=risk_score,
            detected_patterns=detected,
            details=f"Detected {len(detected)} suspicious pattern(s)" if detected else "Input appears clean",
        )
