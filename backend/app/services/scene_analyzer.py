import base64
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

class SceneAnalysisError(Exception):
    """Raised when an error occurs during AI scene analysis."""
    pass

class SceneAnalyzer:
    """
    Dedicated AI Scene Understanding service for GameVoiceOver.
    Analyzes cutscene representative frames using the Gemini Vision API
    to identify visible characters, scene settings, actions, and timestamps.
    Separates directly observed visual facts from inferred interpretations.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = "gemini-2.5-flash"
        self.api_endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent"

    def _generate_mock_analysis(self, duration: float) -> Dict[str, Any]:
        """
        Generates realistic, structured mock scene analysis for local development
        and UI testing without consuming Gemini API tokens.
        """
        d = max(4.0, duration or 10.0)
        t_mid = round(d * 0.45, 1)
        t_end = round(d, 1)

        return {
            "summary": "A tense confrontation unfolds within an ancient, rune-carved subterranean sanctum.",
            "setting": {
                "environment": "Ancient underground temple chamber with glowing blue runic conduits and crumbling stone pillars.",
                "time_of_day": "Underground / Artificial Arcane Lighting",
                "atmosphere": "Tense, suspenseful, and emotionally charged."
            },
            "characters": [
                {
                    "id": "char_1",
                    "name": "Knight Commander (Aethelgard)",
                    "observed_appearance": "Heavy steel plate armor with gold filigree, worn navy cape, short dark hair, visible scar across left cheek.",
                    "observed_actions": "Steps purposefully into the chamber, draws a runic broadsword, shields a companion.",
                    "inferred_role": "Protective vanguard or military leader defending their allies.",
                    "confidence": "high",
                    "confidence_rationale": "Clear frontal visual angles and distinctive heraldry on breastplate."
                },
                {
                    "id": "char_2",
                    "name": "Rogue Scout (Lyra)",
                    "observed_appearance": "Leather tunic, hooded dark cloak, fingerless gloves, dual daggers strapped to utility belt.",
                    "observed_actions": "Crouches in the shadows near a shattered pillar, gestures toward the glowing altar.",
                    "inferred_role": "Infiltrator or reconnaissance specialist warning of an impending hazard.",
                    "confidence": "medium",
                    "confidence_rationale": "Partially obscured by shadow and pillar geometry; clothing and stance suggest stealth role."
                }
            ],
            "scenes": [
                {
                    "id": "scene_1",
                    "timestamp_start": 0.0,
                    "timestamp_end": t_mid,
                    "description": "The heroes enter the ruined chamber as the central portal begins surging with energy.",
                    "directly_observed_details": "Camera pans across ancient stone masonry; blue electrical sparks arc between pillars; Knight Commander walks forward.",
                    "inferred_context": "The chamber is likely an ancient sealing gate or energy reactor that has become unstable.",
                    "characters_present": ["Knight Commander (Aethelgard)", "Rogue Scout (Lyra)"]
                },
                {
                    "id": "scene_2",
                    "timestamp_start": t_mid,
                    "timestamp_end": t_end,
                    "description": "An ominous rumble shakes the chamber as the Knight draws his blade and assumes a defensive guard.",
                    "directly_observed_details": "Stone dust falls from the ceiling; bright flare of light from the archway; Knight brandishes sword.",
                    "inferred_context": "An imminent threat or boss encounter is about to emerge through the portal.",
                    "characters_present": ["Knight Commander (Aethelgard)"]
                }
            ],
            "confidence_notes": "Character armor, visible weapons, and environment masonry are directly verified from frames. Character names, relationships, and motivations are plausible inferences provided as starting points for user customization.",
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "is_mock": True
        }

    def analyze_cutscene(
        self,
        frames_paths: List[Path],
        duration: float,
        mock: bool = False
    ) -> Dict[str, Any]:
        """
        Analyze representative frames of a cutscene.
        If mock is True or GEMINI_API_KEY is not set, returns realistic mock analysis.
        Otherwise calls Gemini API with base64 encoded frames.
        """
        # Fallback to mock mode if explicitly requested or if API key is absent
        if mock or not self.api_key or not self.api_key.strip():
            logger.info("Using mock response mode for scene analysis (saving API tokens).")
            return self._generate_mock_analysis(duration)

        if not frames_paths:
            raise SceneAnalysisError("No representative frames available to analyze.")

        # Subsample frames to max 6 to minimize token usage and latency
        selected_frames = frames_paths
        if len(frames_paths) > 6:
            step = len(frames_paths) / 6.0
            selected_frames = [frames_paths[int(i * step)] for i in range(6)]

        # Prepare images as inline base64 JPEG parts
        image_parts = []
        for frame_p in selected_frames:
            if frame_p.exists():
                try:
                    with open(frame_p, "rb") as f:
                        b64_data = base64.b64encode(f.read()).decode("utf-8")
                        image_parts.append({
                            "inlineData": {
                                "mimeType": "image/jpeg",
                                "data": b64_data
                            }
                        })
                except Exception as e:
                    logger.warning(f"Could not read frame {frame_p}: {e}")

        if not image_parts:
            raise SceneAnalysisError("Failed to encode any representative frames for Gemini analysis.")

        system_prompt = f"""
You are a game cinematic director and visual scene understanding expert assisting a game cutscene voiceover studio.
Analyze these {len(image_parts)} sequential visual frames from a game cutscene that is approximately {duration:.1f} seconds long.

CRITICAL INSTRUCTIONS:
1. DISTINGUISH DIRECT OBSERVATIONS FROM INFERENCES:
   - "observed_appearance" and "observed_actions": Must describe strictly what is physically visible in the frames (clothing, colors, weapons, posture, movements).
   - "inferred_role": Educated inferences about character personality, relationships, or motivations.
   - For every character, assign a confidence rating ("high", "medium", or "low") based on how clearly they are visible.
2. TIMESTAMPS:
   - Approximate scene segment timestamps based on the total video duration of {duration:.1f} seconds.
3. OUTPUT FORMAT:
   - You MUST respond with pure JSON only matching this schema:

{{
  "summary": "Concise 1-2 sentence synopsis of the cutscene",
  "setting": {{
    "environment": "Physical location description",
    "time_of_day": "Day, Night, Dawn, Dusk, or Underground",
    "atmosphere": "Mood and atmospheric tone"
  }},
  "characters": [
    {{
      "id": "char_1",
      "name": "Descriptive character title or inferred name",
      "observed_appearance": "Visible clothing, armor, facial features, accessories",
      "observed_actions": "Actions seen in the frames",
      "inferred_role": "Inferred role in the game or scene",
      "confidence": "high",
      "confidence_rationale": "Why this confidence level was chosen"
    }}
  ],
  "scenes": [
    {{
      "id": "scene_1",
      "timestamp_start": 0.0,
      "timestamp_end": 5.0,
      "description": "What happens in this part of the cutscene",
      "directly_observed_details": "Specific visual details visible in the frames",
      "inferred_context": "Inferred dramatic context",
      "characters_present": ["Character Name"]
    }}
  ],
  "confidence_notes": "Explicit summary statement distinguishing concrete observations from speculative inferences"
}}
"""

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": system_prompt},
                        *image_parts
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2
            }
        }

        url = f"{self.api_endpoint}?key={self.api_key}"

        try:
            with httpx.Client(timeout=45.0) as client:
                response = client.post(url, json=payload)

            if response.status_code == 400:
                err_detail = response.json().get("error", {}).get("message", "Bad Request")
                raise SceneAnalysisError(f"Gemini API Bad Request: {err_detail}")
            elif response.status_code == 401:
                raise SceneAnalysisError("Invalid Gemini API key. Please check your backend .env configuration.")
            elif response.status_code == 429:
                raise SceneAnalysisError("Gemini API rate limit exceeded. Please wait a moment or switch to Mock Mode.")
            elif response.status_code != 200:
                raise SceneAnalysisError(f"Gemini API returned HTTP {response.status_code}: {response.text}")

            result_json = response.json()
            candidates = result_json.get("candidates", [])
            if not candidates:
                raise SceneAnalysisError("Gemini API returned no candidates.")

            text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if not text_content:
                raise SceneAnalysisError("Gemini returned empty analysis text.")

            # Parse JSON
            parsed_data = json.loads(text_content)
            parsed_data["analyzed_at"] = datetime.now(timezone.utc).isoformat()
            parsed_data["is_mock"] = False
            return parsed_data

        except httpx.TimeoutException:
            logger.error("Gemini API request timed out.")
            raise SceneAnalysisError("Gemini API request timed out after 45 seconds. Check network connectivity.")
        except json.JSONDecodeError as jde:
            logger.error(f"Failed to parse Gemini JSON: {jde}")
            raise SceneAnalysisError("Failed to parse structured JSON from Gemini response.")
        except SceneAnalysisError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in scene analysis: {e}")
            raise SceneAnalysisError(f"Unexpected error calling Gemini API: {str(e)}")

# Global singleton
scene_analyzer = SceneAnalyzer()
