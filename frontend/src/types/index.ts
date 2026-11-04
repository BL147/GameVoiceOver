export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'processing' | 'ready' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  database: string;
  timestamp: string;
}
