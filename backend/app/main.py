"""
Gold Analysis Core - Main Application Entry Point
黃金價格多維度決策輔助系統
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
import uvicorn


class Settings(BaseSettings):
    """Application settings"""

    app_name: str = "Gold Analysis Core"
    app_version: str = "0.1.0"
    debug: bool = True
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="黃金價格多維度決策輔助系統 - 核心功能",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
