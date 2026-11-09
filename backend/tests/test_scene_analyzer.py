import json
import subprocess
from pathlib import Path
from fastapi.testclient import TestClient
from main import app
from app.services.scene_analyzer import scene_analyzer

client = TestClient(app)

def create_sample_mp4(dest_path: Path):
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi", "-i", "testsrc=duration=3:size=320x240:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(dest_path)
    ]
    subprocess.run(cmd, capture_output=True, check=True)

def test_scene_analyzer_mock_generation():
    mock_result = scene_analyzer._generate_mock_analysis(duration=8.5)
    assert "summary" in mock_result
    assert "setting" in mock_result
    assert "environment" in mock_result["setting"]
    assert len(mock_result["characters"]) >= 2
    
    char = mock_result["characters"][0]
    assert "observed_appearance" in char
    assert "observed_actions" in char
    assert "inferred_role" in char
    assert char["confidence"] in ["high", "medium", "low"]
    
    scene = mock_result["scenes"][0]
    assert "directly_observed_details" in scene
    assert "inferred_context" in scene
    assert scene["timestamp_start"] == 0.0

def test_analyze_scene_endpoint_and_edits(tmp_path):
    # 1. Create project
    proj_res = client.post("/api/projects", json={
        "name": "Ruins of Aethelgard",
        "description": "Exploration of the ancient vault"
    })
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 2. Cannot analyze before video is uploaded
    bad_res = client.post(f"/api/projects/{proj_id}/analyze-scene")
    assert bad_res.status_code == 400

    # 3. Upload cutscene
    video_file = tmp_path / "ruins.mp4"
    create_sample_mp4(video_file)
    with open(video_file, "rb") as f:
        up_res = client.post(
            f"/api/projects/{proj_id}/upload-video",
            files={"file": ("ruins.mp4", f, "video/mp4")}
        )
    assert up_res.status_code == 200

    # 4. Trigger Scene Analysis in Mock Mode
    analysis_res = client.post(f"/api/projects/{proj_id}/analyze-scene?mock=true")
    assert analysis_res.status_code == 200
    data = analysis_res.json()
    assert data["scene_analysis"] is not None
    assert len(data["scene_analysis"]["characters"]) >= 2
    assert data["scene_analysis"]["is_mock"] is True

    # 5. Retrieve scene analysis via dedicated endpoint
    get_res = client.get(f"/api/projects/{proj_id}/scene-analysis")
    assert get_res.status_code == 200
    saved_analysis = get_res.json()
    assert saved_analysis["summary"] == data["scene_analysis"]["summary"]

    # 6. User edits: Rename character and adjust description
    saved_analysis["characters"][0]["name"] = "Sir Daniel Fortesque"
    saved_analysis["setting"]["atmosphere"] = "Gothic and comical"
    
    put_res = client.put(f"/api/projects/{proj_id}/scene-analysis", json=saved_analysis)
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert updated_data["scene_analysis"]["characters"][0]["name"] == "Sir Daniel Fortesque"
    assert updated_data["scene_analysis"]["setting"]["atmosphere"] == "Gothic and comical"

    # Clean up
    client.delete(f"/api/projects/{proj_id}")
