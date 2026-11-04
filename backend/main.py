from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.routers import health_router, projects_router

# Initialize database tables on application start
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GameVoiceOver Studio API",
    description="Backend API for AI-Powered Game Cutscene Voiceover Studio",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware to allow the Vite/React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers under /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(projects_router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "GameVoiceOver Studio API is running",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
