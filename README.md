# QueryMind: Text-to-SQL Pro 
"Your AI-powered SQL assistant with Guardrails & Observability"

A full-stack, AI-powered Database Playground that allows users to query and manage an e-commerce database using natural language. Powered by Groq (Llama 2/3), FastAPI, and Next.js.

**Live Demo**: [https://querymind-ebon.vercel.app](https://querymind-ebon.vercel.app)

---

## ✨ Features

### 🛡️ Production-Grade Guardrails Pipeline
QueryMind runs every question through a secure **4-step Guardrails Pipeline** before executing any generated SQL on the database:
1. **Dynamic Schema Introspection**: Auto-extracts table layouts, column names, primary keys, and foreign keys directly from SQLite using SQLAlchemy instead of a hardcoded schema.
2. **Pre-LLM Injection Scan**: Blocks SQL injection attempts (e.g. statement chaining, boolean tautologies) and prompt injection attempts (e.g. override guidelines, role reassignment) *before* hitting the model.
3. **AST SQL Validation**: Uses `sqlglot` to parse generated SQL, block DDL operations (`CREATE`, `DROP`, `ALTER`), enforce read-only SELECT permissions, and verify that tables and columns exist in the database.
4. **Self-Evaluation Confidence Scorer**: Prompts Llama to grade its own SQL generation confidence ($0.0 - 1.0$), explain its reasoning, and identify potential issues.

### 🔑 Secure Token Dashboard
To prevent rate-limit exhaustion, token stats are protected behind a secure admin gate:
* **Admin Login Route**: `/admin`
* **Credentials**: Admin ID: `Pawan` | Password: `Jat`
* **Features**: Live monitor of prompt/completion tokens, transaction history, and one-click consumption resets.
* **Safety Lock**: If cumulative token consumption exceeds **10,000**, the main query panel is locked to prevent hitting API limits until the administrator resets the statistics.

### ⚙️ Bring Your Own Schema (BYOS) Sandbox
QueryMind is no longer locked to a fixed schema. Users can define custom SQL schemas using three interactive modes and automatically generate relational mock datasets:
* **Mode 1: AI Prompt Builder**: Type database requirements in plain English (e.g. *"Gym member management"*), and Llama writes the SQLite DDL layout.
* **Mode 2: No-Code Visual Builder**: Click to add tables, define columns and datatypes, and set foreign key links interactively without writing SQL.
* **Mode 3: Raw SQL DDL**: Paste or upload your `.sql` table creation scripts directly.
* **Configurable Data Seeding**: Groq generates and runs synthetic data queries to populate the new tables with `5`, `15`, or `30` rows of relational records matching key constraints.
* **Dynamic DB Explorer**: The database browser and query pipeline dynamically adapt to render and run queries against any uploaded schema.
* **Restore Button**: One-click restoration back to the default e-commerce database layout.

### 📊 Other Features
- **Collapsible Pipeline Trace**: View status, checks, and durations for each step of the pipeline.
- **Interactive Confidence Badge**: Hover over the confidence score to view the model's self-evaluation reasoning.
- **Low Confidence Confirmation**: Low-confidence queries trigger a warning dialog asking the user for confirmation before executing.
- **Database Explorer**: View live tables in a dedicated tab with dynamic tab selection.
- **Inline Editing**: Click any cell in the Explorer to instantly update records via SQL.
- **Explain Query**: Get a structured, technical explanation of every generated SQL statement.
- **Ephemeral Sandbox**: The database resets to its seeded state on every restart—perfect for safe experimentation.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite, `groq` (SDK), `sqlglot`, `structlog`
- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons
- **Deployment**: Vercel (Frontend), Render (Backend)

---

## 📂 Project Structure

```text
querymind/
├── backend/
│   ├── main.py              # FastAPI entry point, routes, & admin endpoints
│   ├── guardrails_pipeline.py # Chains introspection, scans, validation, & scoring
│   ├── schema_introspector.py # Introspects DB schema live using SQLAlchemy
│   ├── injection_scanner.py # Pre-LLM prompt/SQL injection scanner
│   ├── validator.py         # AST parser checking syntax, DDL, and column verification
│   ├── guardrails_validator.py # Guardrails AI checks with robust fallback
│   ├── confidence_scorer.py # LLM self-evaluation module
│   ├── token_tracker.py     # Local JSON-based token persistence tracker
│   ├── logging_config.py    # Structured JSON logger with request correlation IDs
│   ├── llm.py               # Groq client credentials and query describer
│   ├── db.py                # Database connection configuration
│   ├── models.py            # SQLAlchemy database models
│   ├── schema.py            # Database initialization & ephemeral seeding
│   └── requirements.txt     # Python dependencies (added sqlglot, groq, structlog)
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main Query Interface (Query & DB Explorer tabs)
│   │   ├── admin/
│   │   │   └── page.tsx     # Secure Login & Token Dashboard
│   │   └── components/
│   │       ├── TokenDashboard.tsx  # Admin token progress & logs visualizer
│   │       ├── GuardrailsPanel.tsx # Interactive pipeline progress bar
│   │       ├── ConfidenceBadge.tsx # Mapped confidence indicator + reasoning tooltip
│   │       ├── ConfirmationModal.tsx # Warns user of low-confidence runs
│   │       ├── DBExplorer.tsx   # Table browser & inline editor
│   │       ├── ResultsTable.tsx # Dynamic results display
│   │       └── SQLDisplay.tsx   # AI SQL & explanation view
│   └── package.json
└── README.md
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API Key ([Groq Console](https://console.groq.com/))

### 2. Backend Setup
1. `cd backend`
2. Create `.env`:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
3. `pip install -r requirements.txt`
4. `python main.py` (Starts at `http://localhost:8000`)

### 3. Frontend Setup
1. `cd frontend`
2. `npm install`
3. Create `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. `npm run dev` (Starts at `http://localhost:3000`)

---

## 🗄️ Database Schema
- `users`: id, name, email
- `products`: id, name, price
- `orders`: id, user_id, product_id, quantity, total_amount, created_at

---

## ⚠️ Note on Safety
This is a **Playground App**. The query generator is configured for read-only access (SELECT statements only), and any dangerous SQL commands are blocked by the SQL validator prior to execution. Explorer write operations are validated and executed inside the local sandbox.
