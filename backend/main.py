"""
FastAPI entry point with Guardrails Pipeline integration.
All AI-generated queries now go through the full 4-step guardrails pipeline.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
import uvicorn

from db import get_db, engine
from schema import init_db
from llm import explain_sql, get_client, get_model
from validator import is_safe_sql
from models import User, Product, Order
from logging_config import setup_logging, get_logger, new_correlation_id
from guardrails_pipeline import GuardrailsPipeline
import token_tracker

# Initialize structured logging
setup_logging()
log = get_logger("main")

app = FastAPI(title="Text-to-SQL API — with Guardrails")

# Initialize the guardrails pipeline
pipeline = GuardrailsPipeline(engine, get_client(), get_model())

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response Models ──────────────────────────────


class QueryRequest(BaseModel):
    question: str


class SQLRequest(BaseModel):
    sql: str


class GuardrailsCheck(BaseModel):
    name: str
    passed: bool
    detail: str = ""


class PipelineStepResponse(BaseModel):
    step: str
    status: str
    duration_ms: int = 0
    detail: str = ""


class QueryResponse(BaseModel):
    sql: Optional[str] = None
    results: List[dict] = []
    error: Optional[str] = None

    # Confidence
    confidence: float = 0.0
    confidence_label: str = "MEDIUM"
    confidence_reasoning: str = ""
    potential_issues: List[str] = []

    # Guardrails
    guardrails_passed: bool = False
    guardrails_checks: List[dict] = []

    # Pipeline trace
    pipeline_steps: List[dict] = []

    # Flags
    requires_confirmation: bool = False
    blocked: bool = False
    blocked_reason: str = ""

    # Token usage
    token_usage: dict = {}


# ── Endpoints ────────────────────────────────────────────


@app.on_event("startup")
def startup_event():
    init_db()
    pipeline.invalidate_schema_cache()
    log.info("server_started", title="Text-to-SQL with Guardrails")


@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest, db: Session = Depends(get_db)):
    """
    Main query endpoint — runs the full guardrails pipeline.
    """
    cid = new_correlation_id()
    log.info("query_received", question=request.question[:200], correlation_id=cid)

    try:
        result = await pipeline.process(request.question, db)
        return QueryResponse(**result.to_dict())
    except Exception as e:
        log.error("query_error", error=str(e), correlation_id=cid)
        return QueryResponse(
            error=f"Pipeline error: {str(e)}",
            pipeline_steps=[{
                "step": "pipeline",
                "status": "error",
                "duration_ms": 0,
                "detail": str(e),
            }],
        )


@app.post("/explain")
async def explain_query(request: SQLRequest):
    """Explain a SQL query in plain English using Groq."""
    try:
        log.info("explain_requested", sql=request.sql[:200])
        explanation = explain_sql(request.sql)
        return {
            "explanation": explanation,
            "token_usage": token_tracker.get_stats()
        }
    except Exception as e:
        log.error("explain_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tables")
async def get_all_tables(db: Session = Depends(get_db)):
    """Get all table data for the DB Explorer."""
    try:
        tables = ["users", "products", "orders"]
        result = {}
        for table in tables:
            rows = db.execute(text(f"SELECT * FROM {table}"))
            columns = rows.keys()
            result[table] = [dict(zip(columns, row)) for row in rows.fetchall()]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/execute")
async def execute_raw_sql(request: SQLRequest, db: Session = Depends(get_db)):
    """
    Executes a SQL query directly (used by DB Explorer inline editing).
    Still uses basic safety validation via sqlglot.
    """
    try:
        log.info("execute_raw", sql=request.sql[:200])

        if not is_safe_sql(request.sql):
            return {"success": False, "error": "Query blocked by safety validator"}

        result = db.execute(text(request.sql))
        db.commit()

        if result.returns_rows:
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in result.fetchall()]
            return {"success": True, "results": data}

        return {"success": True, "message": "Query executed and committed successfully"}
    except Exception as e:
        db.rollback()
        log.error("execute_error", error=str(e))
        return {"success": False, "error": str(e)}


@app.post("/reset")
async def reset_database():
    """Reset the database to its seeded state."""
    init_db()
    pipeline.invalidate_schema_cache()
    log.info("database_reset")
    return {"success": True}


@app.get("/schema")
async def get_schema():
    """Expose live schema info for debugging/UI."""
    try:
        schema_string = pipeline.schema_introspector.get_schema_string()
        tables = pipeline.schema_introspector.get_allowed_tables()
        return {
            "schema": schema_string,
            "tables": list(tables),
            "table_count": len(tables),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tokens")
async def get_tokens():
    """Get the current token usage stats."""
    return token_tracker.get_stats()


@app.post("/tokens/reset")
async def reset_tokens():
    """Reset the token usage statistics."""
    return token_tracker.reset_stats()


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
