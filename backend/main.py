from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import uvicorn

from db import get_db, engine
from schema import init_db
from llm import generate_sql, explain_sql
from validator import is_safe_sql
from models import User, Product, Order

app = FastAPI(title="Text-to-SQL API")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

class SQLRequest(BaseModel):
    sql: str

@app.on_event("startup")
def startup_event():
    init_db()

@app.post("/query")
async def process_query(request: QueryRequest, db: Session = Depends(get_db)):
    try:
        # 1. Generate SQL
        sql = generate_sql(request.question)
        
        # 2. Validate SQL
        if not is_safe_sql(sql):
            raise HTTPException(status_code=400, detail=f"Unsafe or invalid query generated: {sql}")
        
        # 3. Execute SQL ONLY if it is a SELECT query
        is_select = sql.strip().lower().startswith("select")
        
        data = []
        if is_select:
            result = db.execute(text(sql))
            db.commit()
            if result.returns_rows:
                columns = result.keys()
                data = [dict(zip(columns, row)) for row in result.fetchall()]
        
        return {
            "sql": sql,
            "results": data,
            "error": None
        }
    except Exception as e:
        return {
            "sql": None,
            "results": [],
            "error": str(e)
        }

@app.post("/explain")
async def explain_query(request: SQLRequest):
    try:
        print(f"Explaining query: {request.sql}")
        explanation = explain_sql(request.sql)
        return {"explanation": explanation}
    except Exception as e:
        print(f"Error in /explain: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tables")
async def get_all_tables(db: Session = Depends(get_db)):
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
    Executes ANY SQL query and commits it. Use with caution.
    """
    try:
        print(f"Executing raw SQL: {request.sql}")
        result = db.execute(text(request.sql))
        db.commit()
        
        # If it returns rows (SELECT), return results; otherwise return success
        if result.returns_rows:
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in result.fetchall()]
            return {"success": True, "results": data}
            
        return {"success": True, "message": "Query executed and committed successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error executing raw SQL: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/reset")
async def reset_database():
    init_db()
    return {"success": True}

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
