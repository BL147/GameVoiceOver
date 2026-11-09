import subprocess
from pathlib import Path
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def create_sample_mp4(dest_path: Path):
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(dest_path)
    ]
    subprocess.run(cmd, capture_output=True, check=True)

def test_create_and_retrieve_project():
    payload = {
        "name": "Cyberpunk Neon Chase",
        "description": "Rainy neon city rooftop pursuit cutscene."
    }
    create_res = client.post("/api/projects", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["name"] == payload["name"]
    project_id = created_data["id"]

    get_res = client.get(f"/api/projects/{project_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == project_id

    del_res = client.delete(f"/api/projects/{project_id}")
    assert del_res.status_code == 204

def test_project_video_upload_and_assets(tmp_path):
    # 1. Create a project
    create_res = client.post("/api/projects", json={
        "name": "Boss Fight Cutscene",
        "description": "Dramatic entrance of the dragon"
    })
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]

    # 2. Test invalid extension upload (.txt)
    txt_file = tmp_path / "notes.txt"
    txt_file.write_text("not a video")
    with open(txt_file, "rb") as f:
        inv_res = client.post(f"/api/projects/{proj_id}/upload-video", files={"file": ("notes.txt", f, "text/plain")})
    assert inv_res.status_code == 400
    assert "Invalid file extension" in inv_res.json()["detail"]

    # 3. Create real sample video and upload
    video_file = tmp_path / "boss_intro.mp4"
    create_sample_mp4(video_file)

    with open(video_file, "rb") as f:
        upload_res = client.post(
            f"/api/projects/{proj_id}/upload-video",
            files={"file": ("boss_intro.mp4", f, "video/mp4")}
        )
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["status"] == "ready"
    assert data["has_video"] is True
    assert data["has_audio"] is True
    assert data["duration"] >= 1.9
    assert data["width"] == 320
    assert data["height"] == 240
    assert data["video_url"] == f"/api/projects/{proj_id}/video"
    assert data["audio_url"] == f"/api/projects/{proj_id}/audio"
    assert data["thumbnail_url"] == f"/api/projects/{proj_id}/thumbnail"
    assert len(data["frame_urls"]) > 0

    # 4. Verify video stream endpoint
    v_res = client.get(data["video_url"])
    assert v_res.status_code == 200

    # 5. Verify audio stream endpoint (extracted WAV)
    a_res = client.get(data["audio_url"])
    assert a_res.status_code == 200
    assert a_res.headers["content-type"] == "audio/wav"

    # 6. Verify thumbnail endpoint
    t_res = client.get(data["thumbnail_url"])
    assert t_res.status_code == 200
    assert t_res.headers["content-type"] == "image/jpeg"

    # 7. Verify frame endpoint
    f_res = client.get(data["frame_urls"][0])
    assert f_res.status_code == 200
    assert f_res.headers["content-type"] == "image/jpeg"

    # 8. Clean up
    del_res = client.delete(f"/api/projects/{proj_id}")
    assert del_res.status_code == 204
