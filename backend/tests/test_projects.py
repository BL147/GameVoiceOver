from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_and_retrieve_project():
    # 1. Create a project
    payload = {
        "name": "Cyberpunk Neon Chase",
        "description": "Rainy neon city rooftop pursuit cutscene."
    }
    create_res = client.post("/api/projects", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["name"] == payload["name"]
    assert created_data["description"] == payload["description"]
    assert created_data["status"] == "draft"
    assert created_data["id"].startswith("proj_")
    
    project_id = created_data["id"]

    # 2. Retrieve single project
    get_res = client.get(f"/api/projects/{project_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == project_id

    # 3. List all projects
    list_res = client.get("/api/projects")
    assert list_res.status_code == 200
    projects = list_res.json()
    assert any(p["id"] == project_id for p in projects)

    # 4. Clean up / Delete project
    del_res = client.delete(f"/api/projects/{project_id}")
    assert del_res.status_code == 204

    # 5. Verify deletion
    verify_res = client.get(f"/api/projects/{project_id}")
    assert verify_res.status_code == 404
