# GameVoiceOver Studio 🎙️🎮

> AI-Powered Game Cutscene Voiceover Studio — Visual Understanding, Dialogue Extraction, Voice Assignment, and Synchronized Audio Generation.

---

## Architecture Overview (Phase 2 Video Processing)

```text
GameVoiceOver/
├── backend/
│   ├── app/
│   │   ├── config.py               # Media storage paths, allowed video types (.mp4, .mov), size limits
│   │   ├── database.py             # SQLite connection & SQLAlchemy session management
│   │   ├── models/                 # Database ORM models (Project table with cutscene metadata)
│   │   ├── schemas/                # Pydantic request/response schemas (ProjectResponse, VideoMetadata)
│   │   ├── services/
│   │   │   └── video_processor.py  # Dedicated FFmpeg & FFprobe video processing service
│   │   └── routers/
│   │       ├── health.py           # GET /api/health endpoint
│   │       └── projects.py         # CRUD + Cutscene Video Upload & Streaming endpoints
│   ├── tests/                      # Pytest suite (health, CRUD, FFmpeg video processing pipeline)
│   ├── storage/                    # Local media assets (gitignored)
│   │   └── projects/{project_id}/  # cutscene.mp4, audio.wav, thumbnail.jpg, frames/
│   ├── .env.example                # Template for backend secrets and port configuration
│   ├── requirements.txt            # Python dependencies (FastAPI, python-multipart, SQLAlchemy, Pytest)
│   └── main.py                     # FastAPI application entrypoint & CORS middleware
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         # Studio navigation & live backend status indicator
│   │   │   ├── Dashboard.tsx       # Projects list with video thumbnails, duration & audio tags
│   │   │   ├── CutsceneStudio.tsx  # Interactive cutscene player, 48kHz audio preview & frames gallery
│   │   │   └── CreateProjectModal.tsx # Project creation modal
│   │   ├── services/
│   │   │   └── api.ts              # XHR upload with real-time percentage progress + fetch API
│   │   ├── types/                  # TypeScript data interfaces (Project, VideoMetadata)
│   │   ├── App.tsx                 # Studio state coordinator & workspace router
│   │   ├── main.tsx                # React application mount
│   │   └── index.css               # Tailwind CSS directives & dark studio styling
│   ├── package.json                # Node.js dependencies (React, Vite, Lucide, Tailwind)
│   ├── tailwind.config.js          # Dark studio theme palette configuration
│   └── vite.config.ts              # Vite bundler & backend /api reverse proxy
│
└── .gitignore                      # Prevents secrets, venv, node_modules, and media leaks
```

---

## FFmpeg Video Processing Pipeline

When a user drops an MP4 or MOV cutscene into the Studio:

1. **Format & Size Validation:**  
   Backend validates file extension (`.mp4`, `.mov`) and enforces max upload size (150MB).
2. **Metadata Inspection (`ffprobe`):**  
   Reads duration, width, height, frame rate, and detects if an audio stream exists.
3. **Dialogue Audio Extraction (`ffmpeg`):**  
   Extracts audio track into **48kHz mono 16-bit PCM WAV** (`audio.wav`) — the required standard for speech-to-text transcription (Gnani Prisma). If the cutscene is silent, it is handled gracefully without error.
4. **Thumbnail Poster Generation (`ffmpeg`):**  
   Captures a high-quality JPEG poster (`thumbnail.jpg`) at 10% into the timeline to avoid black intro frames.
5. **Representative Keyframes Extraction (`ffmpeg`):**  
   Samples up to 12 representative video frames (`frames/frame_001.jpg` ...), scaled to 640px width for fast loading and optimal token usage in Gemini VLM analysis.

---

## Local Setup & Running Instructions

### 1. Prerequisites
- Python 3.10+ (Current system: `3.13.5`)
- Node.js 18+ and npm (Current system: Node `v20.20.2`)
- FFmpeg & FFprobe (Current system: `/usr/local/bin/ffmpeg`, `/usr/local/bin/ffprobe`)

---

### 2. Backend Setup (FastAPI & SQLite)

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend

# 1. Activate the Python virtual environment
source .venv/bin/activate

# 2. Run the backend server
uvicorn main:app --reload --port 8000
```

* API will run at: `http://127.0.0.1:8000`
* Interactive API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
* Health check: `http://127.0.0.1:8000/api/health`

#### Running Backend Tests:
```bash
cd backend
source .venv/bin/activate
pytest
```

---

### 3. Frontend Setup (React + Vite + Tailwind)

In a second terminal window, navigate to the `frontend/` directory:

```bash
cd frontend

# Start the Vite development server
npm run dev
```

* Frontend Studio will run at: `http://localhost:5173`
* Opens project cutscenes, uploads video with real-time percentage progress, previews video, plays extracted audio, and inspects extracted frame gallery.

---

## Project Status

- [x] **Phase 0:** Gnani AI API verification & documentation inspection.
- [x] **Phase 1:** Project foundation (FastAPI, SQLite, React, Vite, Tailwind CSS, Project CRUD & Healthcheck).
- [x] **Phase 2:** Video upload & cutscene audio extraction (FFmpeg + FFprobe, 48kHz WAV audio, thumbnails, representative frame sampling).
- [x] **Phase 3:** Visual scene understanding (Google Gemini API VLM analysis of extracted frames, direct observations vs inferences, editable characters and scene timeline, zero-credit mock mode).
- [ ] **Phase 4:** Speech transcription (Gnani Prisma STT) & character voice assignment (Gnani Timbre TTS).
- [ ] **Phase 5:** Audio waveform visualization (WaveSurfer.js) & dialogue synchronization.
- [ ] **Phase 6:** Game-ready export (audio stems, JSON dialogue trees, SRT subtitles, ZIP package).
