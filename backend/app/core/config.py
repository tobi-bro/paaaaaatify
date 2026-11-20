import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Paaaaaaatify"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "paaaaaatify_super_secret_jwt_key_2026_music_freedom")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./paaaaaatify.db")
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # CORS - Explicit allowlist for production and local environments
    ALLOWED_ORIGINS_ENV: str = os.getenv("ALLOWED_ORIGINS", "")
    DEFAULT_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "capacitor://localhost",
        "http://localhost",
        "https://localhost",
    ]

    @property
    def cors_origins(self) -> List[str]:
        origins = list(self.DEFAULT_CORS_ORIGINS)
        if self.ALLOWED_ORIGINS_ENV:
            extra = [o.strip() for o in self.ALLOWED_ORIGINS_ENV.split(",") if o.strip()]
            origins.extend(extra)
        return list(dict.fromkeys(origins))
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # Directories
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    STATIC_DIR: str = os.path.join(BASE_DIR, "static")
    AUDIO_DIR: str = os.path.join(STATIC_DIR, "audio")
    ARTWORK_DIR: str = os.path.join(STATIC_DIR, "artwork")
    UPLOADS_DIR: str = os.path.join(STATIC_DIR, "uploads")
    
    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()

os.makedirs(settings.AUDIO_DIR, exist_ok=True)
os.makedirs(settings.ARTWORK_DIR, exist_ok=True)
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
