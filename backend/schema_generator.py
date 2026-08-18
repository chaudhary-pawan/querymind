"""
DDL Schema parsing, validation, and LLM-assisted synthetic mock data generation.
Allows users to upload custom schemas and generate relational mock data using Groq.
"""

import re
import sqlglot
from sqlglot import exp, errors
import token_tracker
from logging_config import get_logger

log = get_logger("schema_generator")


def validate_ddl(ddl_text: str) -> tuple[bool, str]:
    """
    Validate that the uploaded DDL text consists strictly of table creation queries.
    Blocks unsafe operations (like DROP, INSERT, or SELECT) to avoid DDL injection.
    """
    if not ddl_text.strip():
        return False, "Empty DDL script."

    try:
        # Parse statements using sqlglot
        parsed_statements = sqlglot.parse(ddl_text, read="sqlite")
        table_count = 0

        for statement in parsed_statements:
            if not statement:
                continue

            # Ensure it is a CREATE statement
            if not isinstance(statement, exp.Create):
                return False, (
                    f"Blocked statement: {type(statement).__name__}. "
                    "Only 'CREATE TABLE' statements are allowed in the schema script."
                )

            # Ensure it's a CREATE TABLE (not CREATE INDEX, CREATE VIEW, etc.)
            kind = statement.args.get("kind")
            if not kind or str(kind).upper() != "TABLE":
                return False, f"Only 'CREATE TABLE' is allowed (found CREATE {kind or 'UNKNOWN'})."
            
            table_count += 1

        if table_count == 0:
            return False, "No valid CREATE TABLE statements found."

        return True, ""

    except errors.ParseError as e:
        return False, f"SQL Syntax Error: {str(e)[:150]}"
    except Exception as e:
        return False, f"DDL Validation failed: {str(e)[:150]}"


def generate_synthetic_data(ddl_text: str, client, model: str, density: int) -> list[str]:
    """
    Use Groq (Llama 3.1) to generate realistic INSERT queries for each table in the DDL.
    Enforces relational foreign-key integrity between generated tables.
    """
    if not client:
        raise ValueError("Groq client not initialized.")

    prompt = f"""You are a database seeding assistant.
Given the following SQLite schema:
{ddl_text}

Task: Generate exactly {density} realistic SQL INSERT INTO queries for EACH table defined in the schema to seed the database with mock records.

Rules:
- Output ONLY the raw SQL queries. Do NOT wrap them in backticks, markdown code blocks, or write any descriptions/explanations.
- Ensure all values conform to the types and constraints specified in the DDL.
- Maintain relational integrity. Ensure foreign keys point to primary keys of existing mock records.
- Write each INSERT query on a new line.
"""

    # We use up to 512/1024 tokens for seeder generation since it's a one-off layout setup step
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=768,
        temperature=0.7,
        extra_body={"reasoning_effort": "none"},
    )

    raw_output = response.choices[0].message.content.strip()

    # Track usage
    usage = getattr(response, "usage", None)
    if usage:
        token_tracker.add_tokens(
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            task="Synthetic Data Seeding",
            details=f"Tables seeded with {density} rows each."
        )
        log.info("synthetic_data_tokens", prompt_tokens=usage.prompt_tokens, completion_tokens=usage.completion_tokens)

    # Clean markdown formatting and split into queries
    clean_lines = []
    for line in raw_output.split("\n"):
        line = line.strip()
        if not line or line.startswith("```") or line.startswith("`"):
            continue
        if line.upper().startswith("INSERT INTO"):
            # Ensure query ends with semicolon
            if not line.endswith(";"):
                line += ";"
            clean_lines.append(line)

    return clean_lines


def generate_ddl_from_prompt(user_prompt: str, client, model: str) -> str:
    """
    Use Groq (Llama 3.1) to generate a SQLite DDL script from a natural language prompt.
    """
    if not client:
        raise ValueError("Groq client not initialized.")

    prompt = f"""You are an expert database architect.
Given the following database requirements description:
"{user_prompt}"

Task: Generate a clean, optimized SQLite-compatible DDL schema script with CREATE TABLE statements.

Rules:
- Output ONLY the raw CREATE TABLE SQL statements. Do NOT use markdown code blocks or backticks.
- Choose sensible columns, data types, primary keys, and foreign keys.
- Do not output any notes, comments, or explanations.
"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=384,
        temperature=0.6,
        extra_body={"reasoning_effort": "none"},
    )

    ddl_output = response.choices[0].message.content.strip()

    # Track usage
    usage = getattr(response, "usage", None)
    if usage:
        token_tracker.add_tokens(
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            task="Natural Language DDL Generation",
            details=user_prompt[:100]
        )
        log.info("ddl_generation_tokens", prompt_tokens=usage.prompt_tokens, completion_tokens=usage.completion_tokens)

    # Strip markdown block wraps
    ddl_output = ddl_output.replace("```sql", "").replace("```", "").strip()
    return ddl_output
