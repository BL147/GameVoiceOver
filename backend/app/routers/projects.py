import json
import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, SceneAnalysis
from app.services.video_processor import video_processor, VideoProcessingError, CorruptVideoError
from app.services.scene_analyzer import scene_analyzer, SceneAnalysisError

router = APIRouter(prefix="/projects", tags=["Projects"])

def get_project_storage_dir(project_id: str) -> Path:
    """Returns the dedicated storage directory for a project."""
    project_dir = settings.STORAGE_DIR / "projects" / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir

def format_project_response(project: Project) -> ProjectResponse:
    """Helper to assemble media URLs and frame lists into the response schema."""
    project_dir = settings.STORAGE_DIR / "projects" / project.id
    frames_dir = project_dir / "frames"
    
    frame_urls: List[str] = []
    if frames_dir.exists():
        for frame_file in sorted(frames_dir.glob("frame_*.jpg")):
            frame_urls.append(f"/api/projects/{project.id}/frames/{frame_file.name}")

    has_video = bool(project.video_path and Path(project.video_path).exists())
    has_audio = bool(project.audio_path and Path(project.audio_path).exists())
    has_thumb = bool(project.thumbnail_path and Path(project.thumbnail_path).exists())

    scene_analysis_obj = None
    if project.scene_analysis:
        try:
            scene_analysis_obj = json.loads(project.scene_analysis)
        except Exception:
            scene_analysis_obj = None

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description or "",
        status=project.status,
        video_filename=project.video_filename,
        video_size_bytes=project.video_size_bytes,
        duration=project.duration,
        width=project.width,
        height=project.height,
        fps=project.fps,
        has_audio=project.has_audio,
        has_video=has_video,
        frames_count=len(frame_urls) if frame_urls else (project.frames_count or 0),
        error_message=project.error_message,
        video_url=f"/api/projects/{project.id}/video" if has_video else None,
        audio_url=f"/api/projects/{project.id}/audio" if has_audio else None,
        thumbnail_url=f"/api/projects/{project.id}/thumbnail" if has_thumb else None,
        frame_urls=frame_urls,
        scene_analysis=scene_analysis_obj,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    """Retrieve all projects with attached video & media asset URLs."""
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return [format_project_response(p) for p in projects]

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new cutscene voiceover project."""
    new_project = Project(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else "",
        status="draft"
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return format_project_response(new_project)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    """Fetch details of a single project by ID."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found"
        )
    return format_project_response(project)

@router.post("/{project_id}/upload-video", response_model=ProjectResponse)
async def upload_cutscene_video(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload an MP4 or MOV cutscene video file, validate type and size,
    and process it using FFmpeg (audio extraction, thumbnails, representative frames).
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found"
        )

    # 1. Validate File Extension
    original_filename = file.filename or "cutscene.mp4"
    file_ext = Path(original_filename).suffix.lower()
    if file_ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{file_ext}'. Only MP4 and MOV files are supported."
        )

    project_dir = get_project_storage_dir(project_id)
    saved_video_path = project_dir / f"cutscene{file_ext}"

    # 2. Stream & Save File Locally with Size Limit Enforcement
    bytes_written = 0
    max_bytes = settings.MAX_UPLOAD_SIZE_BYTES
    chunk_size = 1024 * 1024  # 1MB chunks

    try:
        with open(saved_video_path, "wb") as out_file:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    out_file.close()
                    if saved_video_path.exists():
                        saved_video_path.unlink()
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed upload size of {max_bytes // (1024 * 1024)}MB."
                    )
                out_file.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if saved_video_path.exists():
            saved_video_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write uploaded file to disk: {str(e)}"
        )

    # 3. Mark status as processing
    project.status = "processing"
    project.video_filename = original_filename
    project.video_path = str(saved_video_path)
    project.video_size_bytes = bytes_written
    project.error_message = None
    db.commit()

    # 4. Run FFmpeg Processing Pipeline
    try:
        pipeline_results = video_processor.process_cutscene(
            video_path=saved_video_path,
            project_dir=project_dir
        )

        project.duration = pipeline_results["duration"]
        project.width = pipeline_results["width"]
        project.height = pipeline_results["height"]
        project.fps = pipeline_results["fps"]
        project.has_audio = pipeline_results["has_audio"]
        project.audio_path = pipeline_results["audio_path"]
        project.thumbnail_path = pipeline_results["thumbnail_path"]
        project.frames_count = pipeline_results["frames_count"]
        project.status = "ready"
        project.error_message = None
        db.commit()
        db.refresh(project)

    except CorruptVideoError as cve:
        project.status = "failed"
        project.error_message = str(cve)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid video file: {str(cve)}"
        )
    except Exception as e:
        project.status = "failed"
        project.error_message = f"Processing error: {str(e)}"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process video with FFmpeg: {str(e)}"
        )

    return format_project_response(project)

@router.get("/{project_id}/video")
def get_project_video(project_id: str, db: Session = Depends(get_db)):
    """Stream / download the cutscene video file for the browser player."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or not project.video_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    video_path = Path(project.video_path)
    if not video_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file missing on disk")

    media_type = "video/quicktime" if video_path.suffix.lower() == ".mov" else "video/mp4"
    return FileResponse(video_path, media_type=media_type, filename=project.video_filename or video_path.name)

@router.get("/{project_id}/audio")
def get_project_audio(project_id: str, db: Session = Depends(get_db)):
    """Stream / download the extracted 48kHz PCM WAV audio track."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or not project.audio_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extracted audio not found or video is silent")

    audio_path = Path(project.audio_path)
    if not audio_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file missing on disk")

    return FileResponse(audio_path, media_type="audio/wav", filename=f"{project_id}_audio.wav")

@router.get("/{project_id}/thumbnail")
def get_project_thumbnail(project_id: str, db: Session = Depends(get_db)):
    """Get the poster thumbnail frame of the cutscene."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or not project.thumbnail_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not found")

    thumb_path = Path(project.thumbnail_path)
    if not thumb_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail file missing on disk")

    return FileResponse(thumb_path, media_type="image/jpeg")

@router.get("/{project_id}/frames/{frame_name}")
def get_project_frame(project_id: str, frame_name: str):
    """Retrieve an extracted representative frame JPEG."""
    project_dir = settings.STORAGE_DIR / "projects" / project_id
    frame_path = project_dir / "frames" / frame_name

    if not frame_path.exists() or not frame_name.startswith("frame_"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frame not found")

    return FileResponse(frame_path, media_type="image/jpeg")

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Delete a project from database and permanently clean up its disk storage."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found"
        )
    
    # Remove files on disk
    project_dir = settings.STORAGE_DIR / "projects" / project_id
    if project_dir.exists():
        shutil.rmtree(project_dir, ignore_errors=True)

    db.delete(project)
    db.commit()
    return None

@router.post("/{project_id}/analyze-scene", response_model=ProjectResponse)
def analyze_cutscene_scene(
    project_id: str,
    mock: bool = Query(False, description="Run in mock mode to test without consuming Gemini API tokens"),
    db: Session = Depends(get_db)
):
    """
    Run Gemini Vision AI analysis on the cutscene's representative frames.
    Identifies characters, visible actions, settings, and approximate scene timelines.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found"
        )

    if not project.video_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot analyze scene before uploading a cutscene video."
        )

    project_dir = get_project_storage_dir(project_id)
    frames_dir = project_dir / "frames"
    frames = sorted(list(frames_dir.glob("frame_*.jpg")))

    if not frames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No extracted frames found for this cutscene. Please re-upload or re-process the video."
        )

    try:
        analysis_data = scene_analyzer.analyze_cutscene(
            frames_paths=frames,
            duration=project.duration or 10.0,
            mock=mock
        )

        project.scene_analysis = json.dumps(analysis_data)
        db.commit()
        db.refresh(project)

        return format_project_response(project)

    except SceneAnalysisError as sae:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(sae)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected scene analysis error: {str(e)}"
        )

@router.get("/{project_id}/scene-analysis", response_model=Optional[SceneAnalysis])
def get_scene_analysis(project_id: str, db: Session = Depends(get_db)):
    """Retrieve saved Gemini scene analysis for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found"
        )

    if not project.scene_analysis:
        return None

    try:
        return json.loads(project.scene_analysis)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse stored scene analysis JSON."
        )

@router.put("/{project_id}/scene-analysis", response_model=ProjectResponse)
def update_scene_analysis(
    project_id: str,
    payload: SceneAnalysis,
    db: Session = Depends(get_db)
):
    """
    Update / edit scene analysis descriptions, character profiles, or timestamps.
    Allows user corrections before proceeding to dialogue and voiceover generation.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found"
        )

    # Save updated JSON model
    project.scene_analysis = payload.model_dump_json()
    db.commit()
    db.refresh(project)

    return format_project_response(project)

