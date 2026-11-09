import json
import logging
import math
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class VideoProcessingError(Exception):
    """Raised when an FFmpeg or video processing operation fails."""
    pass

class CorruptVideoError(VideoProcessingError):
    """Raised when an uploaded file cannot be parsed as a valid video."""
    pass


class VideoProcessor:
    """
    Dedicated video processing service for GameVoiceOver.
    Encapsulates FFmpeg and FFprobe executions to probe video metadata,
    extract dialogue audio, generate thumbnails, and sample representative frames.
    """

    def __init__(self, ffmpeg_bin: str = "ffmpeg", ffprobe_bin: str = "ffprobe"):
        self.ffmpeg_bin = shutil.which(ffmpeg_bin) or ffmpeg_bin
        self.ffprobe_bin = shutil.which(ffprobe_bin) or ffprobe_bin

    def probe_metadata(self, video_path: Path) -> Dict[str, Any]:
        """
        Extract video dimensions, duration, fps, and stream details using ffprobe.
        """
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found at: {video_path}")

        cmd = [
            self.ffprobe_bin,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(video_path)
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            probe_data = json.loads(result.stdout)
        except subprocess.CalledProcessError as e:
            logger.error(f"ffprobe failed: {e.stderr}")
            raise CorruptVideoError("Failed to probe video file. File may be corrupted or not a valid video.") from e
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse ffprobe JSON output: {e}")
            raise CorruptVideoError("Invalid metadata returned from video probe.") from e

        streams = probe_data.get("streams", [])
        format_info = probe_data.get("format", {})

        video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

        if not video_stream:
            raise CorruptVideoError("No video stream found in the uploaded file.")

        # Duration resolution (check stream then format)
        duration_str = video_stream.get("duration") or format_info.get("duration") or "0"
        try:
            duration = float(duration_str)
        except ValueError:
            duration = 0.0

        # Width and Height
        width = int(video_stream.get("width", 0))
        height = int(video_stream.get("height", 0))

        # Frames per second
        r_frame_rate = video_stream.get("r_frame_rate", "0/1")
        fps = 0.0
        try:
            if "/" in r_frame_rate:
                num, den = r_frame_rate.split("/")
                fps = round(float(num) / float(den), 2) if float(den) > 0 else 0.0
            else:
                fps = round(float(r_frame_rate), 2)
        except Exception:
            fps = 0.0

        size_bytes = int(format_info.get("size", video_path.stat().st_size))

        return {
            "duration": round(duration, 2),
            "width": width,
            "height": height,
            "fps": fps,
            "size_bytes": size_bytes,
            "format_name": format_info.get("format_name", "unknown"),
            "video_codec": video_stream.get("codec_name", "unknown"),
            "has_audio": audio_stream is not None,
            "audio_codec": audio_stream.get("codec_name") if audio_stream else None,
            "audio_sample_rate": int(audio_stream.get("sample_rate", 0)) if audio_stream else None,
            "audio_channels": int(audio_stream.get("channels", 0)) if audio_stream else None,
        }

    def extract_audio(self, video_path: Path, output_audio_path: Path, has_audio: bool) -> bool:
        """
        Extract audio track to 48kHz mono 16-bit PCM WAV (ideal for speech-to-text and audio stems).
        If has_audio is False, gracefully skips extraction and returns False.
        """
        if not has_audio:
            logger.info("Video has no audio stream (silent cutscene). Skipping audio extraction.")
            return False

        output_audio_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            self.ffmpeg_bin,
            "-y",                     # Overwrite output without asking
            "-i", str(video_path),
            "-vn",                    # Disable video recording
            "-acodec", "pcm_s16le",   # Standard 16-bit linear PCM
            "-ar", "48000",           # 48kHz sample rate
            "-ac", "1",               # Mono channel (optimal for dialogue STT)
            str(output_audio_path)
        ]

        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            return output_audio_path.exists() and output_audio_path.stat().st_size > 0
        except subprocess.CalledProcessError as e:
            logger.warning(f"Audio extraction warning: {e.stderr}")
            # If extraction failed because stream was empty or invalid, treat gracefully
            return False

    def generate_thumbnail(self, video_path: Path, output_thumb_path: Path, duration: float) -> bool:
        """
        Extract a single high-quality frame to use as the cutscene poster thumbnail.
        Picks a time at 1 second or 10% into the video to avoid black intro frames.
        """
        output_thumb_path.parent.mkdir(parents=True, exist_ok=True)
        seek_time = max(0.0, min(1.0, duration * 0.1))

        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-ss", str(seek_time),
            "-i", str(video_path),
            "-vframes", "1",
            "-q:v", "2",              # High JPEG quality
            str(output_thumb_path)
        ]

        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            return output_thumb_path.exists()
        except subprocess.CalledProcessError as e:
            logger.error(f"Thumbnail generation failed: {e.stderr}")
            return False

    def extract_representative_frames(
        self,
        video_path: Path,
        frames_dir: Path,
        duration: float,
        max_frames: int = 12
    ) -> List[Path]:
        """
        Extract representative video frames across the cutscene timeline.
        Scales to max 640px width for fast loading and optimal VLM token usage.
        """
        if frames_dir.exists():
            # Clean existing frames
            for f in frames_dir.glob("frame_*.jpg"):
                try:
                    f.unlink()
                except OSError:
                    pass
        frames_dir.mkdir(parents=True, exist_ok=True)

        if duration <= 0:
            duration = 1.0

        # Calculate sampling rate (fps) to get roughly max_frames over the duration
        # Example: 10s video -> sample 1 frame/sec = 10 frames
        # Example: 60s video -> sample 1 frame every 5s = 12 frames
        interval = max(1.0, duration / max_frames)
        fps_filter = f"fps=1/{interval:.2f},scale=640:-1"

        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-i", str(video_path),
            "-vf", fps_filter,
            "-q:v", "3",
            str(frames_dir / "frame_%03d.jpg")
        ]

        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            logger.error(f"Frame extraction failed: {e.stderr}")
            # Fallback: try capturing at least one frame
            fallback_cmd = [
                self.ffmpeg_bin,
                "-y",
                "-ss", "0",
                "-i", str(video_path),
                "-vframes", "1",
                "-vf", "scale=640:-1",
                "-q:v", "3",
                str(frames_dir / "frame_001.jpg")
            ]
            try:
                subprocess.run(fallback_cmd, capture_output=True, text=True, check=True)
            except Exception:
                pass

        frames = sorted(list(frames_dir.glob("frame_*.jpg")))
        return frames

    def process_cutscene(self, video_path: Path, project_dir: Path) -> Dict[str, Any]:
        """
        Orchestrate the full video processing pipeline:
        1. Probe metadata (duration, resolution, fps, audio presence)
        2. Extract audio track to audio.wav
        3. Extract thumbnail to thumbnail.jpg
        4. Extract representative frames to frames/
        """
        project_dir.mkdir(parents=True, exist_ok=True)

        # 1. Probe
        metadata = self.probe_metadata(video_path)

        # 2. Extract Audio
        audio_path = project_dir / "audio.wav"
        has_extracted_audio = self.extract_audio(
            video_path=video_path,
            output_audio_path=audio_path,
            has_audio=metadata["has_audio"]
        )

        # 3. Generate Thumbnail
        thumb_path = project_dir / "thumbnail.jpg"
        has_thumb = self.generate_thumbnail(
            video_path=video_path,
            output_thumb_path=thumb_path,
            duration=metadata["duration"]
        )

        # 4. Extract Representative Frames
        frames_dir = project_dir / "frames"
        frames = self.extract_representative_frames(
            video_path=video_path,
            frames_dir=frames_dir,
            duration=metadata["duration"],
            max_frames=12
        )

        return {
            **metadata,
            "audio_path": str(audio_path) if has_extracted_audio else None,
            "thumbnail_path": str(thumb_path) if has_thumb else None,
            "frames_count": len(frames),
            "frame_filenames": [f.name for f in frames],
        }

# Global singleton instance
video_processor = VideoProcessor()
