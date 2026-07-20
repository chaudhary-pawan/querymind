"""
SQL validation using sqlglot AST parsing.
Parses generated SQL and enforces structural guardrails:
- Block DDL (CREATE, ALTER, DROP, TRUNCATE)
- Block DML writes (INSERT, UPDATE, DELETE) in read-only mode
- Validate table/column names against actual schema
- Detect system table access
"""

import sqlglot
from sqlglot import exp, errors
from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional
from logging_config import get_logger

log = get_logger("sql_validator")

# SQL statement types that are DDL (always blocked)
DDL_TYPES = (
    exp.Create, exp.Drop, exp.Alter, 
)

# SQL statement types that are DML writes (blocked in read-only mode)
DML_WRITE_TYPES = (
    exp.Insert, exp.Update, exp.Delete,
)

# System tables that should never be queried
SYSTEM_TABLES = {
    "sqlite_master", "sqlite_temp_master", "sqlite_sequence",
    "information_schema", "pg_catalog", "sys",
}


@dataclass
class ValidationCheck:
    """A single validation check result."""
    name: str
    passed: bool
    detail: str = ""


@dataclass
class ValidationResult:
    """Complete validation result with individual check details."""
    is_valid: bool
    checks: List[ValidationCheck] = field(default_factory=list)
    parsed_tables: Set[str] = field(default_factory=set)
    parsed_columns: Set[str] = field(default_factory=set)
    statement_type: str = ""
    error: str = ""

    @property
    def failed_checks(self) -> List[ValidationCheck]:
        return [c for c in self.checks if not c.passed]


class SQLValidator:
    """
    Validates generated SQL using sqlglot AST parsing.
    Enforces structural safety guardrails.
    """

    def validate(
        self,
        sql: str,
        allowed_tables: Set[str],
        allowed_columns: Dict[str, Set[str]],
        read_only: bool = True,
    ) -> ValidationResult:
        """
        Parse and validate SQL against the schema and safety rules.
        
        Args:
            sql: The SQL string to validate
            allowed_tables: Set of valid table names
            allowed_columns: Dict mapping table_name -> set of column names
            read_only: If True, block INSERT/UPDATE/DELETE
        """
        checks = []
        parsed_tables = set()
        parsed_columns = set()
        statement_type = ""

        # --- Check 1: Syntax parsing ---
        try:
            parsed = sqlglot.parse_one(sql, read="sqlite")
            checks.append(ValidationCheck("sql_syntax", True, "SQL parsed successfully"))
        except errors.ParseError as e:
            checks.append(ValidationCheck("sql_syntax", False, f"Parse error: {str(e)[:200]}"))
            return ValidationResult(
                is_valid=False, checks=checks, error=f"SQL syntax error: {str(e)[:200]}"
            )

        # Determine statement type
        statement_type = type(parsed).__name__

        # --- Check 2: Block DDL ---
        is_ddl = isinstance(parsed, DDL_TYPES)
        # Also check for TRUNCATE by keyword since sqlglot may parse it differently
        has_truncate = "TRUNCATE" in sql.upper().split()
        if is_ddl or has_truncate:
            checks.append(ValidationCheck(
                "no_ddl", False,
                f"DDL statement blocked: {statement_type}"
            ))
            return ValidationResult(
                is_valid=False, checks=checks, statement_type=statement_type,
                error=f"DDL operations are not allowed: {statement_type}"
            )
        checks.append(ValidationCheck("no_ddl", True, "No DDL detected"))

        # --- Check 3: Block DML writes in read-only mode ---
        is_write = isinstance(parsed, DML_WRITE_TYPES)
        if read_only and is_write:
            checks.append(ValidationCheck(
                "read_only", False,
                f"Write operation blocked in read-only mode: {statement_type}"
            ))
            return ValidationResult(
                is_valid=False, checks=checks, statement_type=statement_type,
                error=f"Write operations are blocked. Generated: {statement_type}"
            )
        if read_only:
            checks.append(ValidationCheck("read_only", True, "Query is read-only (SELECT)"))
        else:
            checks.append(ValidationCheck("read_only", True, f"Write mode enabled, {statement_type} allowed"))

        # --- Check 4: Extract and validate table names ---
        for table in parsed.find_all(exp.Table):
            table_name = table.name.lower() if table.name else ""
            if table_name:
                parsed_tables.add(table_name)

        # Check for system table access
        system_access = parsed_tables & SYSTEM_TABLES
        if system_access:
            checks.append(ValidationCheck(
                "no_system_tables", False,
                f"System table access blocked: {system_access}"
            ))
            return ValidationResult(
                is_valid=False, checks=checks, parsed_tables=parsed_tables,
                statement_type=statement_type,
                error=f"Access to system tables is not allowed: {system_access}"
            )
        checks.append(ValidationCheck("no_system_tables", True, "No system table access"))

        # Validate tables exist in schema
        allowed_tables_lower = {t.lower() for t in allowed_tables}
        unknown_tables = parsed_tables - allowed_tables_lower
        if unknown_tables:
            checks.append(ValidationCheck(
                "valid_tables", False,
                f"Unknown tables: {unknown_tables}. Known: {allowed_tables_lower}"
            ))
        else:
            checks.append(ValidationCheck(
                "valid_tables", True,
                f"All tables exist: {parsed_tables}"
            ))

        # --- Check 5: Extract and validate column names ---
        for column in parsed.find_all(exp.Column):
            col_name = column.name.lower() if column.name else ""
            if col_name:
                parsed_columns.add(col_name)

        # Validate columns (best-effort — some columns may come from aliases/expressions)
        all_known_columns = set()
        for cols in allowed_columns.values():
            all_known_columns.update(c.lower() for c in cols)

        # Only flag if we have columns and none of them match known columns
        # (loose check because of aliases, *, expressions)
        if parsed_columns:
            matching = parsed_columns & all_known_columns
            if len(matching) == 0 and len(parsed_columns) > 0:
                checks.append(ValidationCheck(
                    "valid_columns", False,
                    f"No recognized columns: {parsed_columns}"
                ))
            else:
                checks.append(ValidationCheck(
                    "valid_columns", True,
                    f"Columns validated: {matching}"
                ))
        else:
            checks.append(ValidationCheck(
                "valid_columns", True,
                "No explicit columns to validate (using * or expressions)"
            ))

        # --- Final result ---
        all_passed = all(c.passed for c in checks)
        error = "; ".join(c.detail for c in checks if not c.passed) if not all_passed else ""

        result = ValidationResult(
            is_valid=all_passed,
            checks=checks,
            parsed_tables=parsed_tables,
            parsed_columns=parsed_columns,
            statement_type=statement_type,
            error=error,
        )

        log.info(
            "sql_validated",
            is_valid=result.is_valid,
            statement_type=statement_type,
            tables=list(parsed_tables),
            checks_passed=sum(1 for c in checks if c.passed),
            checks_total=len(checks),
        )

        return result


# Keep backward compatibility — simple function used by main.py
def is_safe_sql(sql: str) -> bool:
    """
    Legacy compatibility wrapper. For the full pipeline, use SQLValidator.validate() directly.
    """
    try:
        parsed = sqlglot.parse_one(sql, read="sqlite")
        if isinstance(parsed, DDL_TYPES):
            return False
        if "TRUNCATE" in sql.upper().split():
            return False
        return True
    except Exception:
        return False
