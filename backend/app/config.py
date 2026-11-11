import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartQueue API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smartqueue-secure-jwt-secret-key-328947239847239")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Defaults to SQLite for instantaneous zero-setup local execution,
    # but seamlessly switches to MySQL when DATABASE_URL is configured
    # Example MySQL: mysql+pymysql://user:password@localhost:3306/smartqueue_db
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./smartqueue.db"
    )
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
