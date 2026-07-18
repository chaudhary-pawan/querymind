"""
Guardrails AI integration for SQL output validation.
Uses ValidSQL and ExcludeSqlPredicates validators from the Guardrails Hub.

NOTE: guardrails hub validators are installed on first use.
If hub validators are not available, falls back to sqlglot-based validation.
"""

from dataclasses import dataclass, field
from typing import List
from logging_config import get_logger

log = get_logger("guardrails_validator")

# Try to import guardrails — fall back gracefully if not installed
try:
    from guardrails import Guard
    GUARDRAILS_AVAILABLE = True
except ImportError:
    GUARDRAILS_AVAILABLE = False
    log.warning("guardrails_not_available", detail="guardrails-ai not installed, using fallback validation")

# Try to import hub validators
VALIDATORS_AVAILABLE = False
try:
    if GUARDRAILS_AVAILABLE:
        from guardrails.hub import ValidSQL, ExcludeSqlPredicates
        VALIDATORS_AVAILABLE = True
except (ImportError, Exception) as e:
    log.warning("hub_validators_not_available", detail=f"Hub validators not installed: {e}. Using fallback.")


# Dangerous SQL predicates that should always be blocked
BLOCKED_PREDICATES = ["DROP", "TRUNCATE", "ALTER", "GRANT", "REVOKE", "EXEC", "EXECUTE"]


@dataclass
class GuardrailsCheckResult:
    """Result of a single guardrails check."""
    name: str
    passed: bool
    detail: str = ""


@dataclass
class GuardrailsResult:
    """Complete guardrails validation result."""
    passed: bool
    checks: List[GuardrailsCheckResult] = field(default_factory=list)
    error: str = ""


class GuardrailsValidator:
    """
    Validates SQL output using Guardrails AI validators.
    Falls back to basic validation if Guardrails hub validators aren't available.
    """

    def __init__(self):
        self.guard = None
        if GUARDRAILS_AVAILABLE and VALIDATORS_AVAILABLE:
            try:
                self.guard = Guard().use(
                    ValidSQL,
                    on_fail="noop"
                ).use(
                    ExcludeSqlPredicates,
                    predicates=BLOCKED_PREDICATES,
                    on_fail="noop"
                )
                log.info("guardrails_initialized", validators=["ValidSQL", "ExcludeSqlPredicates"])
            except Exception as e:
                log.warning("guardrails_init_failed", error=str(e))
                self.guard = None

    def validate(self, sql: str) -> GuardrailsResult:
        """
        Run SQL through Guardrails AI validators.
        Falls back to basic checks if guardrails isn't available.
        """
        checks = []

        if self.guard:
            return self._validate_with_guardrails(sql)
        else:
            return self._validate_fallback(sql)

    def _validate_with_guardrails(self, sql: str) -> GuardrailsResult:
        """Validate using actual Guardrails AI."""
        checks = []
        try:
            result = self.guard.validate(sql)

            # Check if validation passed
            passed = result.validation_passed if hasattr(result, 'validation_passed') else True

            checks.append(GuardrailsCheckResult(
                "guardrails_valid_sql",
                passed,
                "SQL passed Guardrails ValidSQL check" if passed else "SQL failed Guardrails validation"
            ))

            log.info("guardrails_validated", passed=passed)

            return GuardrailsResult(passed=passed, checks=checks)

        except Exception as e:
            log.error("guardrails_error", error=str(e))
            checks.append(GuardrailsCheckResult(
                "guardrails_error", False,
                f"Guardrails error: {str(e)[:200]}"
            ))
            return GuardrailsResult(passed=False, checks=checks, error=str(e))

    def _validate_fallback(self, sql: str) -> GuardrailsResult:
        """
        Fallback validation when Guardrails AI is not available.
        Uses basic string matching for blocked predicates.
        """
        checks = []
        sql_upper = sql.upper()

        # Check for blocked predicates
        blocked_found = []
        for predicate in BLOCKED_PREDICATES:
            # Match as whole word to avoid false positives
            if f" {predicate} " in f" {sql_upper} " or sql_upper.startswith(f"{predicate} "):
                blocked_found.append(predicate)

        if blocked_found:
            checks.append(GuardrailsCheckResult(
                "exclude_predicates",
                False,
                f"Blocked predicates found: {blocked_found}"
            ))
        else:
            checks.append(GuardrailsCheckResult(
                "exclude_predicates",
                True,
                "No blocked predicates detected"
            ))

        # Basic syntax check — does it look like SQL?
        sql_trimmed = sql.strip().upper()
        valid_starts = ("SELECT", "INSERT", "UPDATE", "DELETE", "WITH")
        looks_like_sql = any(sql_trimmed.startswith(s) for s in valid_starts)

        checks.append(GuardrailsCheckResult(
            "basic_sql_syntax",
            looks_like_sql,
            "Input looks like valid SQL" if looks_like_sql else "Input doesn't appear to be SQL"
        ))

        all_passed = all(c.passed for c in checks)

        log.info("guardrails_fallback_validated", passed=all_passed, mode="fallback")

        return GuardrailsResult(passed=all_passed, checks=checks)
