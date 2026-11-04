from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Project or cutscene name")
    description: Optional[str] = Field(default="", max_length=500, description="Short project synopsis")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    status: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
