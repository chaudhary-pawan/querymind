# Text-to-SQL Web App

A clean, production-ready Text-to-SQL application that allows users to query an e-commerce database using natural language. Powered by Gemini, FastAPI, and Next.js.

## 🚀 Features

- **Natural Language to SQL**: Convert English questions into optimized SQL queries.
- **Instant Execution**: Run generated queries on a connected SQLite database.
- **Explain Query**: Get a plain-English explanation of the generated SQL.
- **SQL Safety**: Built-in validator to prevent destructive queries (SELECT only).
- **Responsive UI**: Modern, glassmorphism design with loading states and error handling.

## 🛠️ Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite, Gemini API (`google-generativeai`)
- **Frontend**: Next.js 14, Tailwind CSS, Lucide React (optional)

## 📂 Project Structure

```text
text-to-sql-app/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── llm.py               # Gemini integration
│   ├── db.py                # Database connection
│   ├── models.py            # SQLAlchemy models
│   ├── schema.py            # DB initialization & seeding
│   ├── validator.py         # SQL safety validation
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main UI
│   │   └── components/
│   │       ├── QueryInput.tsx
│   │       ├── ResultsTable.tsx
│   │       └── SQLDisplay.tsx
│   └── package.json
└── README.md
```

## ⚙️ Setup Instructions

### 1. Prerequisites
- Python 3.9+
- Node.js 18+
- Gemini API Key (Get it from [Google AI Studio](https://aistudio.google.com/))

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file and add your Gemini API Key:
   ```text
   GEMINI_API_KEY=your_api_key_here
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the backend server:
   ```bash
   python main.py
   ```
   The backend will start at `http://localhost:8000`. It will automatically initialize the SQLite database (`sql_app.db`) and seed it with dummy data on the first run.

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.

## 🗄️ Database Schema
The app uses a sample e-commerce database with the following tables:
- `users`: id, name, email
- `products`: id, name, price
- `orders`: id, user_id, product_id, quantity, total_amount, created_at

## ⚠️ Security
The backend includes a validator that allows ONLY `SELECT` statements. Commands like `DELETE`, `DROP`, `UPDATE`, and `INSERT` are blocked to ensure data integrity.
