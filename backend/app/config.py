import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory if present
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")
    
    # CORS: Allow frontend to connect
    raw_cors = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    CORS_ORIGINS: list[str] = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./gamevoiceover.db")
    
    # API Keys (to be filled in later phases)
    GNANI_API_KEY: str = os.getenv("GNANI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
