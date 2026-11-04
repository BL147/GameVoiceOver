from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, DateTime, Text
from app.database import Base

def generate_id() -> str:
    """Generate a clean project identifier like 'proj_a1b2c3d4'."""
    return f"proj_{uuid.uuid4().hex[:8]}"

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_id, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True, default="")
    status = Column(String(32), nullable=False, default="draft")  # draft, processing, ready, completed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
