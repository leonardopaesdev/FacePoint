from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from app import main
from app.database import Database


def jpeg_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (120, 120), color=(90, 120, 160)).save(output, format="JPEG")
    return output.getvalue()


def test_employee_and_time_entry_flow(tmp_path: Path, monkeypatch) -> None:
    database = Database(tmp_path / "api.sqlite3")
    database.initialize()
    faces = tmp_path / "faces"
    faces.mkdir()

    monkeypatch.setattr(main, "db", database)
    monkeypatch.setattr(main, "FACES_DIR", faces)
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    monkeypatch.setattr(main.face_engine, "validate_face", lambda _path: None)
    monkeypatch.setattr(
        main.face_engine,
        "verify_faces",
        lambda _reference, _captured: {
            "verified": True,
            "distance": 0.12,
            "threshold": 0.3,
            "confidence": 97.4,
        },
    )

    client = TestClient(main.app)
    image = jpeg_bytes()
    employee_response = client.post(
        "/api/employees",
        data={
            "name": "Ana Oliveira",
            "registration": "2026001",
            "role": "Analista",
            "department": "Tecnologia",
        },
        files={"photo": ("ana.jpg", image, "image/jpeg")},
    )
    assert employee_response.status_code == 201
    assert employee_response.json()["registration"] == "2026001"
    assert "photo_path" not in employee_response.json()

    entry_response = client.post(
        "/api/time-entries",
        data={"entry_type": "entrada"},
        files={"photo": ("captura.jpg", image, "image/jpeg")},
    )
    assert entry_response.status_code == 201
    assert entry_response.json()["employee"]["name"] == "Ana Oliveira"
    assert entry_response.json()["confidence"] == 97.4

    dashboard = client.get("/api/dashboard")
    history = client.get("/api/time-entries")
    assert dashboard.status_code == 200
    assert dashboard.json()["employees"] == 1
    assert dashboard.json()["entries_today"] == 1
    assert len(history.json()) == 1
