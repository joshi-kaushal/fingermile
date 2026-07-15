import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routes import router

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
