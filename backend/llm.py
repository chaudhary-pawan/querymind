from google import genai
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Configure Gemini API
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
client = None

if not API_KEY:
    print("Warning: GEMINI_API_KEY not found in .env or environment variables.")
else:
    client = genai.Client(api_key=API_KEY)

# Schema description for the prompt
SCHEMA_INFO = """
Database Schema:
Table: users
Columns: id (INT, PK), name (TEXT), email (TEXT)

Table: products
Columns: id (INT, PK), name (TEXT), price (FLOAT)

Table: orders
Columns: id (INT, PK), user_id (INT, FK), product_id (INT, FK), quantity (INT), total_amount (FLOAT), created_at (DATETIME)

Relationships:
- orders.user_id references users.id
- orders.product_id references products.id
"""

def generate_sql(question: str) -> str:
    """
    Converts natural language question to SQL using Gemini.
    """
    if not client:
        raise ValueError("Gemini Client not initialized. Check your API key.")
        
    prompt = f"""
    You are an expert SQL generator.
    {SCHEMA_INFO}
    
    Task: Convert the following question into a valid, optimized SQLite query.
    Rules:
    - Only output the raw SQL query. No markdown formatting, no backticks, no explanations.
    - Use correct table and column names.
    - Prefer optimized queries using JOIN and GROUP BY.
    - Use LIMIT when appropriate for SELECT queries.
    - You ARE allowed to generate UPDATE, DELETE, and INSERT queries if requested.
    - Note on Case Sensitivity: In SQLite, string comparisons are case-sensitive. If the user's intent is unclear, use the `LIKE` operator or ensure the case matches the schema values (e.g., 'Monitor' instead of 'monitor').
    - Use double quotes for column/table names if they are keywords.
    
    Question: {question}
    SQL:"""
    
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt
    )
    sql = response.text.strip()
    
    # Remove any backticks if the LLM ignored the instruction
    sql = sql.replace("```sql", "").replace("```", "").strip()
    
    return sql

def explain_sql(sql: str) -> str:
    """
    Explains a SQL query in plain English using Gemini.
    """
    if not client:
        raise ValueError("Gemini Client not initialized. Check your API key.")
    
    prompt = f"""
    You are a professional data analyst. Explain the following SQL query in plain English for a business user.
    
    Rules:
    - Use actual table and column names from the query.
    - Be structured and clear (use bullet points if necessary).
    - Explain WHAT the query is doing and WHY (the business goal).
    - Keep it concise but technically accurate (mention JOINs, filters, and aggregations clearly).
    
    Query: {sql}
    
    Explanation:"""
    
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt
    )
    return response.text.strip()
