from pydantic import BaseModel
from datetime import datetime

class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    timestamp: datetime
