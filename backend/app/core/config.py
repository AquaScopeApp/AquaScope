"""Application configuration"""
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    # API Configuration
    PROJECT_NAME: str = "AquaScope"
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
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and v:
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return []

    # File Upload
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png", "gif"}

    # External APIs for species information
    FISHBASE_API_URL: str = "https://fishbase.ropensci.org"
    WORMS_API_URL: str = "https://www.marinespecies.org/rest"
    INATURALIST_API_URL: str = "https://api.inaturalist.org/v1"

    model_config = SettingsConfigDict(case_sensitive=True)


settings = Settings()
