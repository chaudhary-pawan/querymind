"""
Guardrails Pipeline — the core orchestrator.
Chains all 4 steps from the Text-to-SQL with Guardrails architecture:
  1. Schema filtering
  2. Injection scan + SQL generation + sqlglot parsing
  3. Guardrails AI validation + sandboxed execution
  4. Confidence scoring
"""

import time
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Any
from sqlalchemy import text
from sqlalchemy.orm import Session

from logging_config import get_logger, new_correlation_id
from schema_introspector import SchemaIntrospector
from injection_scanner import InjectionScanner, ScanResult
from validator import SQLValidator, ValidationResult
from guardrails_validator import GuardrailsValidator, GuardrailsResult
from confidence_scorer import ConfidenceScorer

log = get_logger("pipeline")


@dataclass
class PipelineStep:
    """Trace of a single pipeline step."""
    step: str
    status: str  # "ok", "blocked", "error", "skipped"
    duration_ms: int = 0
    detail: str = ""


@dataclass
class PipelineResult:
    """Complete result from the guardrails pipeline."""
    # Core output
    sql: Optional[str] = None
    results: List[dict] = field(default_factory=list)
    error: Optional[str] = None

    # Confidence
    confidence: float = 0.0
    confidence_label: str = "MEDIUM"
    confidence_reasoning: str = ""
    potential_issues: List[str] = field(default_factory=list)

    # Guardrails
    guardrails_passed: bool = False
    guardrails_checks: List[dict] = field(default_factory=list)

    # Pipeline trace
    pipeline_steps: List[dict] = field(default_factory=list)

    # Flags
    requires_confirmation: bool = False
    blocked: bool = False
    blocked_reason: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


class GuardrailsPipeline:
    """
    Orchestrates the full Text-to-SQL with Guardrails pipeline.
    """

    def __init__(self, engine, gemini_client, model: str = "gemini-2.5-flash-lite"):
        self.schema_introspector = SchemaIntrospector(engine)
        self.injection_scanner = InjectionScanner()
        self.sql_validator = SQLValidator()
        self.guardrails_validator = GuardrailsValidator()
        self.confidence_scorer = ConfidenceScorer(gemini_client, model)
        self.gemini_client = gemini_client
        self.model = model

    def invalidate_schema_cache(self):
        """Call after DB reset to refresh schema."""
        self.schema_introspector.invalidate_cache()

    async def process(self, question: str, db: Session) -> PipelineResult:
        """
        Run the full 4-step pipeline.
        
        Args:
            question: User's natural language question
            db: SQLAlchemy session for query execution
            
        Returns:
            PipelineResult with SQL, results, confidence, and guardrails data
        """
        correlation_id = new_correlation_id()
        log.info("pipeline_start", question=question[:200], correlation_id=correlation_id)

        result = PipelineResult()
        steps = []

        # ══════════════════════════════════════════
        # STEP 1: Schema Introspection & Filtering
        # ══════════════════════════════════════════
        step_start = time.perf_counter()
        try:
            schema_string = self.schema_introspector.get_schema_string()
            allowed_tables = self.schema_introspector.get_allowed_tables()
            allowed_columns = self.schema_introspector.get_allowed_columns()
            step_ms = int((time.perf_counter() - step_start) * 1000)
            steps.append(PipelineStep("schema_filter", "ok", step_ms,
                                      f"Schema loaded: {len(allowed_tables)} tables"))
        except Exception as e:
            step_ms = int((time.perf_counter() - step_start) * 1000)
            steps.append(PipelineStep("schema_filter", "error", step_ms, str(e)))
            result.error = f"Schema introspection failed: {str(e)}"
            result.pipeline_steps = [asdict(s) for s in steps]
            return result

        # ══════════════════════════════════════════
        # STEP 2a: Injection Scan (on user input)
        # ══════════════════════════════════════════
        step_start = time.perf_counter()
        scan_result: ScanResult = self.injection_scanner.scan(question)
        step_ms = int((time.perf_counter() - step_start) * 1000)

        if not scan_result.is_safe:
            steps.append(PipelineStep("injection_scan", "blocked", step_ms,
                                      f"Injection detected: {scan_result.detected_patterns}"))
            result.blocked = True
            result.blocked_reason = f"Prompt injection detected: {'; '.join(scan_result.detected_patterns)}"
            result.pipeline_steps = [asdict(s) for s in steps]
            result.guardrails_checks = [
                {"name": "injection_scan", "passed": False, "detail": result.blocked_reason}
            ]
            log.warning("pipeline_blocked_injection", patterns=scan_result.detected_patterns)
            return result
        steps.append(PipelineStep("injection_scan", "ok", step_ms, scan_result.details))

        # ══════════════════════════════════════════
        # STEP 2b: SQL Generation via Gemini
        # ══════════════════════════════════════════
        step_start = time.perf_counter()
        try:
            sql = self._generate_sql(question, schema_string)
            step_ms = int((time.perf_counter() - step_start) * 1000)
            steps.append(PipelineStep("sql_generation", "ok", step_ms, f"Generated: {sql[:100]}"))
            result.sql = sql
        except Exception as e:
            step_ms = int((time.perf_counter() - step_start) * 1000)
            steps.append(PipelineStep("sql_generation", "error", step_ms, str(e)))
            result.error = f"SQL generation failed: {str(e)}"
            result.pipeline_steps = [asdict(s) for s in steps]
            return result

        # ══════════════════════════════════════════
        # STEP 2c: SQL Validation with sqlglot
        # ══════════════════════════════════════════
        step_start = time.perf_counter()
        validation: ValidationResult = self.sql_validator.validate(
            sql, allowed_tables, allowed_columns, read_only=True
        )
        step_ms = int((time.perf_counter() - step_start) * 1000)

        guardrails_checks = []
        for check in validation.checks:
            guardrails_checks.append({
                "name": check.name,
                "passed": check.passed,
                "detail": check.detail,
            })

        if not validation.is_valid:
            steps.append(PipelineStep("sql_validation", "blocked", step_ms, validation.error))
            result.blocked = True
            result.blocked_reason = validation.error
            result.guardrails_checks = guardrails_checks
            result.pipeline_steps = [asdict(s) for s in steps]
            log.warning("pipeline_blocked_validation", error=validation.error)
            return result
        steps.append(PipelineStep("sql_validation", "ok", step_ms,
                                  f"All {len(validation.checks)} checks passed"))

        # ══════════════════════════════════════════
        # STEP 3a: Guardrails AI Validation
        # ══════════════════════════════════════════
        step_start = time.perf_counter()
        gr_result: GuardrailsResult = self.guardrails_validator.validate(sql)
        step_ms = int((time.perf_counter() - step_start) * 1000)

        for check in gr_result.checks:
            guardrails_checks.append({
                "name": check.name,
                "passed": check.passed,
                "detail": check.detail,
            })

        if not gr_result.passed:
            steps.append(PipelineStep("guardrails_check", "blocked", step_ms,
                                      gr_result.error or "Guardrails validation failed"))
            result.blocked = True
            result.blocked_reason = gr_result.error or "Blocked by Guardrails AI"
            result.guardrails_checks = guardrails_checks
            result.pipeline_steps = [asdict(s) for s in steps]
            return result
        steps.append(PipelineStep("guardrails_check", "ok", step_ms, "All guardrails passed"))

        result.guardrails_passed = True
        result.guardrails_checks = guardrails_checks

        # ══════════════════════════════════════════
        # STEP 3b: Sandboxed Read-Only Execution
        # ══════════════════════════════════════════
        step_start = time.perf_counter()
        try:
            query_result = db.execute(text(sql))
            if query_result.returns_rows:
                columns = query_result.keys()
                result.results = [dict(zip(columns, row)) for row in query_result.fetchall()]
            step_ms = int((time.perf_counter() - step_start) * 1000)
            steps.append(PipelineStep("execution", "ok", step_ms,
                                      f"Returned {len(result.results)} rows"))
        except Exception as e:
            step_ms = int((time.perf_counter() - step_start) * 1000)
            steps.append(PipelineStep("execution", "error", step_ms, str(e)[:200]))
            result.error = f"Query execution failed: {str(e)}"
            result.pipeline_steps = [asdict(s) for s in steps]
            return result

        # ══════════════════════════════════════════
        # STEP 4: Confidence Scoring
        # ══════════════════════════════════════════
        step_start = time.perf_counter()
        score = self.confidence_scorer.score(question, sql, schema_string)
        step_ms = int((time.perf_counter() - step_start) * 1000)

        result.confidence = score["confidence"]
        result.confidence_label = score["confidence_label"]
        result.confidence_reasoning = score["reasoning"]
        result.potential_issues = score["potential_issues"]

        # Low confidence requires user confirmation before trusting results
        result.requires_confirmation = score["confidence_label"] == "LOW"

        steps.append(PipelineStep("confidence_score", "ok", step_ms,
                                  f"{score['confidence_label']} ({score['confidence']})"))

        # ══════════════════════════════════════════
        # Final assembly
        # ══════════════════════════════════════════
        result.pipeline_steps = [asdict(s) for s in steps]

        total_ms = sum(s.duration_ms for s in steps)
        log.info(
            "pipeline_complete",
            total_ms=total_ms,
            confidence=result.confidence,
            rows=len(result.results),
            checks_total=len(guardrails_checks),
            blocked=result.blocked,
        )

        return result

    def _generate_sql(self, question: str, schema: str) -> str:
        """Generate SQL using Gemini with the dynamic schema."""
        if not self.gemini_client:
            raise ValueError("Gemini client not initialized. Check your API key.")

        prompt = f"""You are an expert SQL generator.
{schema}

Task: Convert the following question into a valid, optimized SQLite SELECT query.
Rules:
- Only output the raw SQL query. No markdown formatting, no backticks, no explanations.
- Use correct table and column names from the schema above.
- Prefer optimized queries using JOIN and GROUP BY.
- Use LIMIT when appropriate.
- Only generate SELECT queries. Do NOT generate UPDATE, DELETE, INSERT, or any DDL.
- For string comparisons, use the LIKE operator for case-insensitive matching.
- Use double quotes for column/table names if they are SQL keywords.

Question: {question}
SQL:"""

        response = self.gemini_client.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        sql = response.text.strip()
        sql = sql.replace("```sql", "").replace("```", "").strip()
        return sql
