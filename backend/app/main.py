"""FastAPI application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "ReefLab API",
        "version": "0.1.0",
        "status": "healthy"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


# API routes will be added here later
# from app.api.v1 import auth, tanks, parameters, notes, photos, maintenance, livestock
# app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
# app.include_router(tanks.router, prefix=f"{settings.API_V1_STR}/tanks", tags=["tanks"])
