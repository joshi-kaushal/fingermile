import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.db import init_db
from app.routes import router
from app.limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database and create tables if they do not exist
    await init_db()
    yield

app = FastAPI(
    title="Fingermile API",
    description="Backend service for Fingermile Chrome extension scroll tracking.",
    version="1.0.0",
    lifespan=lifespan
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configurations
# Allow requests from the local development server and Chrome Extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # Bearer token is used in Authorization header, so credentials (cookies) are not required
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
