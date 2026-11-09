from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Project or cutscene name")
    description: Optional[str] = Field(default="", max_length=500, description="Short project synopsis")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    status: Optional[str] = None

class VideoMetadata(BaseModel):
    filename: Optional[str] = None
    size_bytes: Optional[int] = None
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    has_audio: bool = False

class CharacterProfile(BaseModel):
    id: str = Field(..., description="Unique character identifier, e.g. char_1")
    name: str = Field(..., description="Character name or placeholder, e.g. Knight Commander")
    observed_appearance: str = Field(..., description="Directly visible physical appearance and clothing")
    observed_actions: str = Field(..., description="Directly visible actions performed in the cutscene")
    inferred_role: str = Field(..., description="Speculative or inferred character archetype/motivation")
    confidence: str = Field(default="medium", description="high, medium, or low")
    confidence_rationale: Optional[str] = Field(default="", description="Why this confidence was assigned")

class SceneSetting(BaseModel):
    environment: str = Field(..., description="Physical location/setting, e.g. Castle Throne Room")
    time_of_day: str = Field(default="Unknown", description="Time of day or lighting condition")
    atmosphere: str = Field(..., description="Emotional mood and atmosphere, e.g. Tense and foreboding")

class SceneSegment(BaseModel):
    id: str = Field(..., description="Unique scene segment ID, e.g. scene_1")
    timestamp_start: float = Field(..., description="Start timestamp in seconds")
    timestamp_end: float = Field(..., description="End timestamp in seconds")
    description: str = Field(..., description="Concise synopsis of the event")
    directly_observed_details: str = Field(..., description="Concrete facts visually seen in the frames")
    inferred_context: str = Field(..., description="Inferred plot points or character thoughts")
    characters_present: List[str] = Field(default_factory=list, description="Characters visible in this segment")

class SceneAnalysis(BaseModel):
    summary: str = Field(..., description="High-level narrative summary of the cutscene")
    setting: SceneSetting
    characters: List[CharacterProfile] = Field(default_factory=list)
    scenes: List[SceneSegment] = Field(default_factory=list)
    confidence_notes: str = Field(
        ...,
        description="Explicit disclaimer distinguishing concrete visual observations from AI inferences"
    )
    analyzed_at: Optional[str] = None
    is_mock: bool = False

class ProjectResponse(ProjectBase):
    id: str
    status: str
    
    # Video & Cutscene Assets
    video_filename: Optional[str] = None
    video_size_bytes: Optional[int] = None
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    has_audio: bool = False
    has_video: bool = False
    frames_count: int = 0
    error_message: Optional[str] = None

    # Generated Media URLs
    video_url: Optional[str] = None
    audio_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    frame_urls: List[str] = []

    # AI Scene Understanding
    scene_analysis: Optional[SceneAnalysis] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
