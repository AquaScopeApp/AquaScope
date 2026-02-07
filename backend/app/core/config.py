"""Application configuration"""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # API Configuration
    PROJECT_NAME: str = "ReefLab"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str

    # InfluxDB
    INFLUXDB_URL: str
    INFLUXDB_TOKEN: str
    INFLUXDB_ORG: str
    INFLUXDB_BUCKET: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    # File Upload
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png", "gif"}

    # External APIs
    FISHBASE_API_URL: str = "https://fishbase.ropensci.org"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
