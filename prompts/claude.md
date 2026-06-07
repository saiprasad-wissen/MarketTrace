# MarketTrace — Implementation Plan
## AI-Powered Trade Surveillance & Investigation Workbench

MarketTrace is a production-grade enterprise web application for trade surveillance, investigation, explainability, and escalation. It serves compliance teams, market surveillance officers, exchange investigators, and regulators. The platform processes raw trade data and drives it through an investigation funnel: Trades → Alerts → Investigations → Escalations.

---

## Architecture Decision

**Full-Stack Application** (FastAPI + PostgreSQL + React + Vite + TypeScript)

Production-grade three-tier architecture:
- **Frontend**: React 18 + Vite + TypeScript, running on port 5173
- **Backend**: FastAPI with SQLAlchemy ORM + Alembic migrations, running on port 8000
- **Database**: PostgreSQL for persistent storage of all entities
- **AI**: Groq API called server-side via FastAPI (key stored in backend `.env`)
- **Background Tasks**: FastAPI BackgroundTasks for surveillance engine processing

> [!IMPORTANT]
> **AI Integration (Option A)**: User enters their Groq API key in Settings UI → stored via backend API → used server-side for all AI calls.

> [!IMPORTANT]
> **No Sample Data**: Users must go through the full wizard (upload stocks.csv, traders.csv, trades.csv, context.csv). No auto-loading of demo data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 + Vite + TypeScript |
| **Styling** | TailwindCSS + shadcn/ui |
| **Charts** | Recharts |
| **Graph** | React Flow |
| **Animation** | Framer Motion |
| **State** | Zustand |
| **Routing** | React Router v6 |
| **PDF Export** | jsPDF + html2canvas |
| **CSV Parsing** | PapaParse (frontend preview) |
| **Backend** | FastAPI + Uvicorn |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Migrations** | Alembic |
| **Database** | PostgreSQL |
| **AI** | Groq API (llama-3.3-70b-versatile) via backend |
| **HTTP Client** | Axios (frontend → backend) |
| **Background Tasks** | FastAPI BackgroundTasks |

---

## Dataset Understanding

From the existing CSV files in `/dataset`:

**stocks.csv**: 8 stocks — NVDA, AAPL, TSLA, MSFT (NASDAQ) + HDFCBANK, RELIANCE, INFY, TCS (NSE)

**traders.csv**: 25 traders — T001 to T025, all Equities desk, across Mumbai/Delhi/Bangalore/Chennai/Pune/Ahmedabad/Hyderabad

**trades.csv**: ~1,124 trades with timestamp, trader_id, symbol, side, quantity, price, order_id, status (NEW/EXECUTE/CANCEL)

**context.csv**: 7 market context events with timestamp, symbol, type (NEWS/ANALYST/MACRO), severity (HIGH/MEDIUM/LOW), title, summary

### Embedded Pattern Evidence in trades.csv

| Pattern | Trader | Symbol | Evidence |
|---|---|---|---|
| Spoofing | T007 | NVDA | 3 large BUY orders (50K each) → instant CANCEL → small SELL profit |
| Spoofing | T007 | AAPL | 3 BUY 40K orders → CANCEL → SELL 1,500 at higher price |
| Spoofing | T007 | MSFT | 4 BUY 60K orders → CANCEL → SELL 2,000 |
| Spoofing | T007 | RELIANCE | 4 BUY 70K orders → CANCEL → SELL 2,500 |
| Quote Stuffing | T018 | MSFT | 8 rapid BUY→CANCEL cycles in 22 seconds |
| Quote Stuffing | T018 | NVDA | 8 rapid BUY→CANCEL cycles |
| Quote Stuffing | T018 | RELIANCE | 6 rapid BUY→CANCEL cycles |
| Momentum Ignition | T015 | TSLA | Staircase BUY 10K→12K→15K→18K→20K → SELL 55K at peak |
| Momentum Ignition | T015 | TSLA | Second session: BUY 15K→18K→20K→25K → SELL 70K |
| Momentum Ignition | T015 | NVDA | BUY 20K→22K→25K→28K → SELL 95K |
| Pump & Dump | T021 | NVDA | 3 large accumulations → SELL 60K at 165.50 (vs buy at 154) |
| Pump & Dump | T021 | HDFCBANK | BUY 20K+18K+15K → SELL 53K at 1843 |
| Pump & Dump | T019 | MSFT | BUY 50K+45K+40K → SELL 120K at peak |
| Pump & Dump | T024 | MSFT | 4 large accumulations (no sell yet — ongoing accumulation) |
| Wash Trading | T011 | RELIANCE, HDFCBANK, TCS, NVDA | Buy and immediate same-size sell at same price |
| Cross-Market | T022, T023 | NVDA | Coordinated buying after T021 accumulation |
| Close Manipulation | T020 | INFY | Large buy 50K+40K+30K near close (15:16) |
| Close Manipulation | T020 | TCS | Large buy 40K+35K+30K near close (15:20) |

---

## Application Structure

```
MarketTrace/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── config.py            # Settings & env vars
│   │   ├── models/
│   │   │   ├── profile.py       # Profile, ProfileStock, ProfileTrader
│   │   │   ├── investigation.py # Investigation
│   │   │   ├── trade.py         # Trade, Alert
│   │   │   ├── case.py          # Case, CaseComment
│   │   │   ├── report.py        # Report
│   │   │   └── ai.py            # AIConversation
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── profiles.py      # /api/profiles
│   │   │   ├── investigations.py# /api/investigations
│   │   │   ├── trades.py        # /api/trades
│   │   │   ├── alerts.py        # /api/alerts
│   │   │   ├── cases.py         # /api/cases
│   │   │   ├── reports.py       # /api/reports
│   │   │   ├── ai.py            # /api/ai
│   │   │   └── settings.py      # /api/settings
│   │   ├── engine/
│   │   │   ├── csv_parser.py    # CSV ingestion + validation
│   │   │   ├── surveillance.py  # All pattern detection rules
│   │   │   ├── risk_scorer.py   # Risk score computation
│   │   │   ├── case_builder.py  # Auto case generation
│   │   │   └── report_gen.py    # Report generation
│   │   └── services/
│   │       └── groq_service.py  # Groq API calls
│   ├── alembic/                 # DB migrations
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Header, Layout
│   │   │   ├── dashboard/       # All 8 chart components
│   │   │   ├── investigation/   # Queue + Trader table
│   │   │   ├── replay/          # Replay engine drawer
│   │   │   ├── trader-trace/    # Flagship trace modal
│   │   │   ├── ai-panel/        # AI investigator panel
│   │   │   ├── cases/           # Case management
│   │   │   ├── profiles/        # Profile wizard + list
│   │   │   ├── reports/         # Report viewer
│   │   │   └── settings/        # Settings
│   │   ├── pages/               # Route-level pages
│   │   ├── store/               # Zustand stores
│   │   ├── services/            # Axios API clients
│   │   ├── lib/                 # Utilities
│   │   └── types/               # TypeScript types
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml           # PostgreSQL + pgAdmin
```

---

## Proposed Changes

### Phase 1 — Infrastructure & Project Scaffolding

#### [NEW] `docker-compose.yml`
PostgreSQL 15 + pgAdmin containers

#### [NEW] `backend/` — FastAPI project
- Python venv, requirements.txt
- Alembic initialized

#### [NEW] `frontend/` — Vite React TypeScript project
- All npm dependencies installed

---

### Phase 2 — Database Layer

#### [NEW] `backend/app/models/*.py`
10 SQLAlchemy models:
- `Profile`, `ProfileStock`, `ProfileTrader`
- `Investigation`
- `Trade`, `Alert`
- `Case`, `CaseComment`
- `Report`
- `AIConversation`
- `AuditLog`

#### [NEW] `backend/alembic/` — DB migrations
Initial migration creating all tables

---

### Phase 3 — Backend Core

#### [NEW] `backend/app/config.py`
Pydantic Settings loading from `.env`: DATABASE_URL, GROQ_API_KEY

#### [NEW] `backend/app/database.py`
SQLAlchemy async engine + session factory

#### [NEW] `backend/app/main.py`
FastAPI app with CORS, routers registered, lifespan startup

---

### Phase 4 — Surveillance Engine (Backend)

#### [NEW] `backend/app/engine/csv_parser.py`
- Validate and parse trades.csv, stocks.csv, traders.csv, context.csv
- Bulk insert to PostgreSQL

#### [NEW] `backend/app/engine/surveillance.py`
Rule-based pattern detection (pure Python, runs as background task):
- **Spoofing**: Large NEW order → CANCEL within 5s → EXECUTE opposite side
- **Quote Stuffing**: ≥5 order/cancel cycles in 30 seconds, same trader+symbol
- **Momentum Ignition**: Staircase quantity increase (≥3 steps) → large exit
- **Pump & Dump**: Sustained accumulation >10min → dump at peak price
- **Wash Trading**: BUY + SELL same symbol, same price, same trader
- **Layering**: Multiple simultaneous bid levels cancelled together
- **Close Manipulation**: Large volume orders in last 30min of session

#### [NEW] `backend/app/engine/risk_scorer.py`
Composite risk score (0-100) per trader:
- Pattern severity weights
- Frequency multipliers
- Volume impact scoring

#### [NEW] `backend/app/engine/case_builder.py`
Auto-generate cases from alerts with priority assignment

#### [NEW] `backend/app/services/groq_service.py`
Server-side Groq API calls with context-aware system prompts

---

### Phase 5 — API Routers (Backend)

#### [NEW] `backend/app/routers/profiles.py`
`GET/POST/PUT/DELETE /api/profiles` + file upload endpoints for stocks/traders CSV

#### [NEW] `backend/app/routers/investigations.py`
`GET/POST/PUT/DELETE /api/investigations` + trigger surveillance engine

#### [NEW] `backend/app/routers/trades.py`
`GET /api/investigations/{id}/trades` — filterable by symbol, trader, time range

#### [NEW] `backend/app/routers/alerts.py`
`GET /api/investigations/{id}/alerts` — filterable by pattern, severity

#### [NEW] `backend/app/routers/cases.py`
Full CRUD + status transitions + comments

#### [NEW] `backend/app/routers/reports.py`
Generate + retrieve reports per investigation/trader/case

#### [NEW] `backend/app/routers/ai.py`
`POST /api/ai/ask` — context-aware Groq query with investigation data injected into system prompt

#### [NEW] `backend/app/routers/settings.py`
Store Groq API key + preferences

---

### Phase 6 — Frontend Setup

#### [NEW] `frontend/src/types/index.ts`
All TypeScript interfaces mirroring backend schemas

#### [NEW] `frontend/src/services/api.ts`
Axios instance with base URL + all typed API functions

#### [NEW] `frontend/src/store/useAppStore.ts`
Zustand global store: active investigation, selected stock, UI state, AI panel

#### [NEW] `frontend/src/store/useReplayStore.ts`
Replay engine state: position, speed, running/paused, live events

---

### Phase 7 — Layout & Navigation (Frontend)

#### [NEW] `Sidebar.tsx`
- MarketTrace logo
- "+ New Investigation" CTA
- Navigation links
- Recent investigations with context menu

#### [NEW] `Header.tsx`
- Breadcrumb, stock filter dropdown, PDF export, AI toggle

#### [NEW] `Layout.tsx`
- Three-column layout: Sidebar | Main | AI Panel

---

### Phase 8 — Profile & Investigation Wizards (Frontend)

#### [NEW] Profile Wizard (5 steps)
Name → Upload stocks.csv → Upload traders.csv → Review → Save (POST /api/profiles)

#### [NEW] Investigation Wizard (5 steps)
Name → Select Profile → Upload trades.csv → Upload context.csv → **Boot Sequence**

**Boot Sequence Animation** (10 stages, progress bar, record counts):
1. Loading Dataset
2. Validating Records
3. Building Market Timeline
4. Running Pattern Discovery
5. Running Surveillance Engine
6. Calculating Risk Scores
7. Building Cases
8. Generating Dashboards
9. Preparing AI Context
10. Generating Reports

---

### Phase 9 — Dashboard Components (Frontend)

#### [NEW] `ExecutiveMetrics.tsx` — 8 animated KPI cards
#### [NEW] `GlobalFilterBar.tsx` — Stock dropdown transforms entire workspace
#### [NEW] Chart Components (Recharts)
1. Price vs Time — LineChart
2. Volume vs Time — AreaChart
3. Orders Per Minute — BarChart
4. Cancellation Activity (Trader-wise) — BarChart
5. Alert Distribution — PieChart
6. Trader Risk Heatmap — CSS Grid cells
7. Investigation Funnel — Custom SVG
8. Trader Network Graph — React Flow

#### [NEW] `MarketContextPanel.tsx` — Context timeline
#### [NEW] `InvestigationQueue.tsx` — Cases data table
#### [NEW] `SuspiciousTraderTable.tsx` — Risk-ranked traders with actions

---

### Phase 10 — Replay Engine (Frontend)

#### [NEW] `ReplayEngine.tsx` — Bottom drawer
- 80% Market Events scrolling feed
- 20% Live Alert Stream
- Play/Pause/Resume/Stop + 1x/2x/5x/10x/20x speeds
- Charts animate live during replay

---

### Phase 11 — Trader Trace Mode (FLAGSHIP)

#### [NEW] `TraderTraceModal.tsx` — Full-screen compliance case file
- Trader profile card
- Chronological activity timeline
- Triggered pattern evidence cards
- Evidence metrics table
- Related stocks & context events
- Risk Assessment gauge
- WHY FLAGGED? explainability section

---

### Phase 12 — AI Investigator Panel (Frontend)

#### [NEW] `AIInvestigatorPanel.tsx` — Right-side collapsible drawer
- Context-aware system prompt (investigation + trader + stock + alerts)
- Quick question chips
- Chat interface with streaming responses

---

### Phase 13 — Case Management, Reports & Settings

#### [NEW] Cases page — Full CRUD with status workflow
#### [NEW] Reports page — Generate + view + PDF export
#### [NEW] Settings page — Groq API key, notifications, preferences

---

## Design System

```
Colors:
  Primary Blue:   #1a56db  (accent, CTAs)
  Navy:           #0f172a  (sidebar background)
  Surface:        #f8fafc  (main background)
  Card:           #ffffff  (card backgrounds)
  Border:         #e2e8f0  (subtle borders)
  Text Primary:   #0f172a
  Text Secondary: #64748b
  
  Alert Colors:
    Critical:  #dc2626
    High:      #ea580c
    Medium:    #d97706
    Low:       #16a34a
    Info:      #2563eb
    
Typography:
  Font: Inter (Google Fonts)
  Sizes: 12/14/16/20/24/32/48px
  
Shadows:
  Card: 0 1px 3px rgba(0,0,0,0.08)
  Elevated: 0 4px 16px rgba(0,0,0,0.12)
  
Spacing: 4/8/12/16/24/32/48px grid
```

---

## Verification Plan

### Build Verification
- `npm run build` must complete without errors
- `npm run dev` starts on localhost:5173

### Functional Verification
1. Upload the sample dataset files from `/dataset`
2. Run investigation → boot sequence animates through all 10 stages
3. Dashboard shows all 8 metric cards with real data
4. Filter by NVDA → all charts update to NVDA data
5. T007 appears in Suspicious Traders table (Spoofing)
6. T015 appears (Momentum Ignition)
7. T011 appears (Wash Trading)
8. Trader Trace for T007 shows Spoofing evidence with cancellation ratio
9. Replay Engine plays through market events with live chart updates
10. AI Panel responds with context-aware analysis (requires Groq API key)
11. PDF export generates a professional report

### User Experience Verification
- App loads in under 2 seconds
- All transitions are smooth
- Information density feels like Bloomberg/Palantir
- No placeholder images or lorem ipsum text
