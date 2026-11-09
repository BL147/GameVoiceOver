import { Project, HealthCheckResponse, SceneAnalysis } from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects`);
  if (!response.ok) {
    throw new Error(`Failed to load projects: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load project: ${response.statusText}`);
  }
  return response.json();
}

export async function createProject(name: string, description?: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description: description || '' }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || 'Failed to create project');
  }
  return response.json();
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete project: ${response.statusText}`);
  }
}

/**
 * Upload cutscene video with real-time percentage progress callback
 */
export function uploadCutsceneVideo(
  projectId: string,
  file: File,
  onProgress?: (percentage: number) => void
): Promise<Project> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data: Project = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error('Invalid response received from server.'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.detail || `Upload failed with HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred during video upload.'));
    });

    xhr.open('POST', `${API_BASE}/projects/${projectId}/upload-video`);
    xhr.send(formData);
  });
}

/**
 * Trigger Gemini AI Scene Understanding on extracted frames.
 * Supports mock mode to test without consuming API tokens.
 */
export async function analyzeScene(projectId: string, mock: boolean = false): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/analyze-scene?mock=${mock}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Scene analysis failed with HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Update / save user-edited scene descriptions and character profiles.
 */
export async function updateSceneAnalysis(
  projectId: string,
  analysis: SceneAnalysis
): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/scene-analysis`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(analysis),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to update scene analysis: ${response.statusText}`);
  }
  return response.json();
}
