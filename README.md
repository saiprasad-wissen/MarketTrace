# MarketTrace ⚡

**MarketTrace** is an enterprise-grade AI-powered trade surveillance, investigation, and explainability workbench. It is designed for compliance teams, market surveillance officers, and exchange investigators to identify, analyze, and escalate market manipulation patterns with unprecedented speed and forensic depth.

## 🎯 Problem Statement
In modern financial markets, identifying manipulative trading behavior (such as Spoofing, Wash Trading, or Quote Stuffing) is like finding a needle in a haystack. Traditional surveillance systems generate overwhelming amounts of false-positive alerts, lacking the context and forensic narrative needed by compliance officers. Investigators spend hours manually correlating trades with market news, building timelines, and writing case reports.

**MarketTrace solves this by:**
1. Running a high-speed deterministic rules engine to flag precise manipulation patterns from raw order flow.
2. Automatically generating deep-dive forensic narratives using top-tier AI models (Claude 3.5 Sonnet & Llama 3.3).
3. Providing a "Market Replay" simulator that visually correlates high-speed order flow with real-world news events.

## ✨ Key Features
- **Deterministic Pattern Detection:** Instantly flags Spoofing, Quote Stuffing, Momentum Ignition, Pump & Dump, Wash Trading, Layering, and Close Manipulation.
- **AI Forensic Investigator:** Utilizes Claude 3.5 Sonnet (with Llama 3.3 fallback) to construct step-by-step, data-driven reasoning trees for every flagged case.
- **Live Market Replay:** A high-octane simulation engine that chronologically plays back trades interleaved with glowing "Market Context" news events to prove intent.
- **Trader Risk Heatmaps & Network Graphs:** Identify coordinated cross-market manipulation rings visually.
- **Investigation Funnel:** Seamlessly tracks raw trades → alerts → cases → escalations.
- **Exportable Compliance Reports:** 1-click PDF generation for regulators and external audits.

## 🔄 System Flow Architecture

```mermaid
graph TD
    A[Raw Datasets<br/>Stocks, Traders, Trades, Context] -->|Upload| B(FastAPI Backend)
    B --> C[(PostgreSQL DB)]
    C --> D{Surveillance Engine}
    
    D -->|Detects Patterns| E[Alerts]
    E --> F[Cases]
    
    F -->|Sends Data| G((AI Engine<br/>Claude 3.5 / Llama 3.3))
    G -->|Returns Forensic Tree| F
    
    F --> H[Frontend Dashboard]
    H --> I[Trader Trace Modal]
    H --> J[Market Replay Simulator]
    H --> K[PDF Report Generator]
```

## 🛠 Setup & Installation

**Prerequisites:**
- Node.js (v18+)
- Python (3.10+)
- Docker Desktop (for PostgreSQL)

### 1. Database Setup
1. Open **pgAdmin** and connect to your local PostgreSQL server.
2. Right-click on **Databases** > **Create** > **Database...**
3. Name the database `markettrace` and click **Save**.
4. *(Optional)* Ensure your database user is `postgres` with the password `abc123`, or update the `DATABASE_URL` in your `.env` file to match your local credentials.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:
```env
DATABASE_URL=postgresql+asyncpg://postgres:abc123@localhost:5432/markettrace
SECRET_KEY=your-secret-key
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
```

Apply migrations and start the server:
```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## 👥 Team: DaemonOps
- **Saiprasad Jamdar**
- **Deep Adak**
- **Saeedsufiyan Shaikh**
- **Aryaan Gala**
