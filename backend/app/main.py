from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import create_tables
from app.routers import profiles, investigations, trades, alerts, cases, reports, ai, settings as settings_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist
    await create_tables()
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="MarketTrace API",
    description="AI-Powered Trade Surveillance & Investigation Workbench",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(profiles.router)
app.include_router(investigations.router)
app.include_router(trades.router)
app.include_router(alerts.router)
app.include_router(alerts.global_router)
app.include_router(cases.router)
app.include_router(reports.router)
app.include_router(ai.router)
app.include_router(settings_router.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "MarketTrace API", "version": "1.0.0"}
