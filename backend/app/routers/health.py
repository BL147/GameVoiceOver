from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.schemas.health import HealthResponse

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("", response_model=HealthResponse)
def check_health(db: Session = Depends(get_db)):
    """Health check endpoint confirming API server and SQLite DB connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return HealthResponse(
        status="ok",
        service="GameVoiceOver Studio API",
        database=db_status,
        timestamp=datetime.now(timezone.utc)
    )
