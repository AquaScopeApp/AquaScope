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
        "message": "AquaScope API",
        "version": "0.1.0",
        "status": "healthy"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


# API routes
from app.api.v1 import auth, tanks, parameters, notes, photos, maintenance, livestock, equipment, icp_tests, admin, parameter_ranges

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["authentication"])
app.include_router(tanks.router, prefix=f"{settings.API_V1_STR}/tanks", tags=["tanks"])
app.include_router(parameter_ranges.router, prefix=f"{settings.API_V1_STR}/tanks", tags=["parameter-ranges"])
app.include_router(parameters.router, prefix=f"{settings.API_V1_STR}/parameters", tags=["parameters"])
app.include_router(notes.router, prefix=f"{settings.API_V1_STR}/notes", tags=["notes"])
app.include_router(photos.router, prefix=f"{settings.API_V1_STR}/photos", tags=["photos"])
app.include_router(maintenance.router, prefix=f"{settings.API_V1_STR}/maintenance", tags=["maintenance"])
app.include_router(livestock.router, prefix=f"{settings.API_V1_STR}/livestock", tags=["livestock"])
app.include_router(equipment.router, prefix=f"{settings.API_V1_STR}/equipment", tags=["equipment"])
app.include_router(icp_tests.router, prefix=f"{settings.API_V1_STR}/icp-tests", tags=["icp-tests"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
