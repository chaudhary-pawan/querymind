# QueryMind: Text-to-SQL Pro 
"Your AI-powered SQL assistant"

A full-stack, AI-powered Database Playground that allows users to query and manage an e-commerce database using natural language. Powered by Gemini, FastAPI, and Next.js.

**Live Demo**: [https://querymind-ebon.vercel.app](https://querymind-ebon.vercel.app)

## ✨ Features

- **Natural Language to SQL**: Convert English questions into optimized SQL queries using Gemini 1.5/2.0.
- **Database Explorer**: View live tables (`users`, `products`, `orders`) in a dedicated management tab.
- **Inline Editing**: Click any cell in the Explorer to instantly update records via SQL.
- **Explain Query**: Get a structured, technical explanation of every generated SQL statement.
- **Pro Actions**: Apply AI-generated `UPDATE`, `DELETE`, and `INSERT` queries directly to the database.
- **Ephemeral Sandbox**: The database resets to its original seeded state on every restart—perfect for safe experimentation.

##  Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite, `google-genai` (SDK)
- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons
- **Deployment**: Vercel (Frontend), Render (Backend)

## 📂 Project Structure

```text
querymind/
├── backend/
│   ├── main.py              # FastAPI entry point & routes
│   ├── llm.py               # Gemini integration & prompt engineering
│   ├── db.py                # Database connection configuration
│   ├── models.py            # SQLAlchemy database models
│   ├── schema.py            # Database initialization & ephemeral seeding
│   ├── validator.py         # SQL safety validator
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main Query Interface
│   │   └── components/
│   │       ├── DBExplorer.tsx   # Table browser & inline editor
│   │       ├── ResultsTable.tsx # Dynamic results display
│   │       └── SQLDisplay.tsx   # AI SQL & explanation view
│   └── package.json
└── README.md
```

## ⚙️ Setup Instructions

### 1. Prerequisites
- Python 3.9+
- Node.js 18+
- Gemini API Key ([Google AI Studio](https://aistudio.google.com/))

### 2. Backend Setup
1. `cd backend`
2. Create `.env`: `GEMINI_API_KEY=your_key`
3. `pip install -r requirements.txt`
4. `python main.py` (Starts at `http://localhost:8000`)

### 3. Frontend Setup
1. `cd frontend`
2. `npm install`
3. Create `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`
4. `npm run dev` (Starts at `http://localhost:3000`)

## 🗄️ Database Schema
- `users`: id, name, email
- `products`: id, name, price
- `orders`: id, user_id, product_id, quantity, total_amount, created_at

## ⚠️ Note on Safety
This is a **Playground App**. The validator is configured to allow all queries (including UPDATE/DELETE) to facilitate learning. In a production environment with real data, more restrictive rules should be applied.
