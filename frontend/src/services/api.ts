import { Project, HealthCheckResponse } from '../types';

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
