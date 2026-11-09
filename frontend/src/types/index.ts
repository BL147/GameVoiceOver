export interface CharacterProfile {
  id: string;
  name: string;
  observed_appearance: string;
  observed_actions: string;
  inferred_role: string;
  confidence: 'high' | 'medium' | 'low';
  confidence_rationale?: string;
}

export interface SceneSetting {
  environment: string;
  time_of_day: string;
  atmosphere: string;
}

export interface SceneSegment {
  id: string;
  timestamp_start: number;
  timestamp_end: number;
  description: string;
  directly_observed_details: string;
  inferred_context: string;
  characters_present: string[];
}

export interface SceneAnalysis {
  summary: string;
  setting: SceneSetting;
  characters: CharacterProfile[];
  scenes: SceneSegment[];
  confidence_notes: string;
  analyzed_at?: string;
  is_mock?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'uploading' | 'processing' | 'ready' | 'failed' | 'completed';
  
  // Video Metadata
  video_filename?: string;
  video_size_bytes?: number;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  has_audio: boolean;
  has_video: boolean;
  frames_count: number;
  error_message?: string;

  // Media URLs
  video_url?: string;
  audio_url?: string;
  thumbnail_url?: string;
  frame_urls: string[];

  // Gemini AI Scene Understanding
  scene_analysis?: SceneAnalysis;

  created_at: string;
  updated_at: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  database: string;
  timestamp: string;
}
