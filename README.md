# GameVoiceOver Studio 🎙️🎮

> AI-Powered Game Cutscene Voiceover Studio — Visual Understanding, Dialogue Extraction, Voice Assignment, and Synchronized Audio Generation.

---

## Architecture Overview (Phase 1 Foundation)

```text
GameVoiceOver/
├── backend/
│   ├── app/
│   │   ├── config.py           # Loads settings & environment variables
│   │   ├── database.py         # SQLite connection & SQLAlchemy session management
│   │   ├── models/             # Database ORM models (Project table)
│   │   ├── schemas/            # Pydantic request/response validation schemas
│   │   └── routers/            # API endpoints (/api/health, /api/projects)
│   ├── tests/                  # Pytest unit and integration tests
│   ├── .env.example            # Template for backend secrets and port configuration
│   ├── requirements.txt        # Python dependencies (FastAPI, Uvicorn, SQLAlchemy)
│   └── main.py                 # FastAPI application entrypoint & CORS middleware
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Studio UI (Sidebar, Dashboard, CreateProjectModal)
│   │   ├── services/           # API client layer (communicates with FastAPI backend)
│   │   ├── types/              # TypeScript data interfaces
│   │   ├── App.tsx             # Root layout and studio state manager
│   │   ├── main.tsx            # React application mount
│   │   └── index.css           # Tailwind CSS directives & dark studio styling
│   ├── package.json            # Node.js dependencies (React, Vite, Lucide, Tailwind)
│   ├── tailwind.config.js      # Dark studio theme palette configuration
│   └── vite.config.ts          # Vite bundler & backend /api reverse proxy
│
└── .gitignore                  # Prevents secrets, venv, node_modules, and media leaks
```

---

## Local Setup & Running Instructions

### 1. Prerequisites
- Python 3.10+ (Current system: `3.13.5`)
- Node.js 18+ and npm (Current system: Node `v20.20.2`)

---

### 2. Backend Setup (FastAPI & SQLite)

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend

# 1. Activate the Python virtual environment
source .venv/bin/activate

# 2. Ensure your .env is present (already configured with defaults)
cp .env.example .env

# 3. Run the backend server
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
* It communicates directly with the backend via Vite's configured proxy to `http://127.0.0.1:8000/api`.

---

## Project Status

- [x] **Phase 0:** Gnani AI API verification & documentation inspection.
- [x] **Phase 1:** Project foundation (FastAPI, SQLite, React, Vite, Tailwind CSS, Project CRUD & Healthcheck).
- [ ] **Phase 2:** Video upload & cutscene audio extraction (FFmpeg + OpenCV).
- [ ] **Phase 3:** Visual scene understanding (Google Gemini API).
- [ ] **Phase 4:** Speech transcription (Gnani Prisma STT) & character voice assignment (Gnani Timbre TTS).
- [ ] **Phase 5:** Audio waveform visualization (WaveSurfer.js) & dialogue synchronization.
- [ ] **Phase 6:** Game-ready export (audio stems, JSON dialogue trees, SRT subtitles, ZIP package).
