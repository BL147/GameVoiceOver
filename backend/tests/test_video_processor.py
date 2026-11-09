import subprocess
from pathlib import Path
import pytest
from app.services.video_processor import video_processor, CorruptVideoError

@pytest.fixture(scope="session")
def sample_video_with_audio(tmp_path_factory):
    """Generate a valid 2-second MP4 video with a test audio tone using FFmpeg."""
    temp_dir = tmp_path_factory.mktemp("video_test")
    video_path = temp_dir / "sample_cutscene.mp4"

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(video_path)
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    return video_path

@pytest.fixture(scope="session")
def sample_silent_video(tmp_path_factory):
    """Generate a valid 2-second silent MP4 video without an audio track."""
    temp_dir = tmp_path_factory.mktemp("silent_video_test")
    video_path = temp_dir / "silent_cutscene.mp4"

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=30",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        str(video_path)
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    return video_path

def test_probe_metadata(sample_video_with_audio):
    metadata = video_processor.probe_metadata(sample_video_with_audio)
    assert metadata["duration"] >= 1.9
    assert metadata["width"] == 320
    assert metadata["height"] == 240
    assert metadata["fps"] == 30.0
    assert metadata["has_audio"] is True
    assert metadata["audio_channels"] >= 1

def test_probe_silent_metadata(sample_silent_video):
    metadata = video_processor.probe_metadata(sample_silent_video)
    assert metadata["has_audio"] is False

def test_process_cutscene_pipeline(sample_video_with_audio, tmp_path):
    project_dir = tmp_path / "proj_test"
    results = video_processor.process_cutscene(sample_video_with_audio, project_dir)

    assert results["duration"] >= 1.9
    assert results["has_audio"] is True
    assert results["audio_path"] is not None
    assert Path(results["audio_path"]).exists()
    assert results["thumbnail_path"] is not None
    assert Path(results["thumbnail_path"]).exists()
    assert results["frames_count"] > 0
    assert len(results["frame_filenames"]) == results["frames_count"]

def test_corrupt_video_handling(tmp_path):
    fake_video = tmp_path / "fake_video.mp4"
    fake_video.write_text("This is not a real video file.")

    with pytest.raises(CorruptVideoError):
        video_processor.probe_metadata(fake_video)
