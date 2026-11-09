from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, DateTime, Text, Float, Integer, Boolean
from app.database import Base

def generate_id() -> str:
    """Generate a clean project identifier like 'proj_a1b2c3d4'."""
    return f"proj_{uuid.uuid4().hex[:8]}"

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_id, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True, default="")
    status = Column(String(32), nullable=False, default="draft")  # draft, uploading, processing, ready, failed
    
    # Video & Cutscene Assets
    video_filename = Column(String(255), nullable=True)
    video_path = Column(String(500), nullable=True)
    video_size_bytes = Column(Integer, nullable=True)
    duration = Column(Float, nullable=True)  # in seconds
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    fps = Column(Float, nullable=True)
    has_audio = Column(Boolean, default=False, nullable=False)
    audio_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    frames_count = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    scene_analysis = Column(Text, nullable=True)  # Structured JSON string of Gemini scene understanding

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

