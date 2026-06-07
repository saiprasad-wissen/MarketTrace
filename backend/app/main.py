from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import asyncio
import logging

from app.config import get_settings
from app.database import create_tables
from app.routers import profiles, investigations, trades, alerts, cases, reports, ai, settings as settings_router, auth

settings = get_settings()


async def keep_alive_task():
    """Background task to keep the Render service awake by pinging itself."""
    if not settings.RENDER_EXTERNAL_URL:
        return
        
    url = f"{settings.RENDER_EXTERNAL_URL.rstrip('/')}/api/health"
    logging.info(f"Starting keep-alive background task for {url}")
    
    async with httpx.AsyncClient() as client:
        while True:
            try:
                await asyncio.sleep(600)  # Sleep for 10 minutes (Render spins down after 15 min)
                response = await client.get(url, timeout=10.0)
                logging.info(f"Keep-alive ping status: {response.status_code}")
            except Exception as e:
                logging.warning(f"Keep-alive ping failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Wrap in a timeout to prevent deadlocks with Supabase pooler blocking Uvicorn startup
        await asyncio.wait_for(create_tables(), timeout=5.0)
    except Exception as e:
        logging.warning(f"Could not run create_tables on startup (this is normal in production): {e}")
        
    # Start the keep-alive task
    task = asyncio.create_task(keep_alive_task())
    
    yield
    # Shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


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
app.include_router(auth.router)
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
