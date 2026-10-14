from __future__ import annotations

import io
import os
import sqlite3
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from . import face_engine
from .database import Database

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("FACEPOINT_DATA_DIR", BASE_DIR / "data"))
FACES_DIR = DATA_DIR / "faces"
DATABASE_PATH = Path(os.getenv("FACEPOINT_DATABASE", DATA_DIR / "facepoint.sqlite3"))
MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

db = Database(DATABASE_PATH)
db.initialize()
FACES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="FacePoint API", version="0.1.0")
allowed_origins = os.getenv(
    "FACEPOINT_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def read_image(upload: UploadFile) -> tuple[bytes, str]:
    extension = ALLOWED_IMAGE_TYPES.get(upload.content_type or "")
    if not extension:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Envie uma imagem JPEG, PNG ou WebP.")
    content = await upload.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "A imagem deve ter no máximo 5 MB.")
    try:
        with Image.open(io.BytesIO(content)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "O arquivo enviado não é uma imagem válida.") from exc
    return content, extension


def serialize_employee(employee: dict) -> dict:
    return {key: value for key, value in employee.items() if key != "photo_path"}


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "face_engine": "available" if face_engine.is_available() else "unavailable"}


@app.get("/api/employees")
def list_employees() -> list[dict]:
    return db.fetch_all(
        "SELECT id, name, registration, role, department, created_at FROM employees ORDER BY name"
    )


@app.post("/api/employees", status_code=status.HTTP_201_CREATED)
async def create_employee(
    name: Annotated[str, Form(min_length=3, max_length=120)],
    registration: Annotated[str, Form(min_length=2, max_length=40)],
    role: Annotated[str, Form(min_length=2, max_length=100)],
    department: Annotated[str, Form(min_length=2, max_length=100)],
    photo: Annotated[UploadFile, File()],
) -> dict:
    content, extension = await read_image(photo)
    destination = FACES_DIR / f"{uuid.uuid4().hex}{extension}"
    destination.write_bytes(content)
    try:
        face_engine.validate_face(destination)
        employee_id = db.execute(
            """INSERT INTO employees(name, registration, role, department, photo_path, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name.strip(), registration.strip(), role.strip(), department.strip(), str(destination), utc_now()),
        )
    except face_engine.FaceEngineUnavailable as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except (ValueError, TypeError) as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Nenhum rosto válido foi detectado na foto.") from exc
    except sqlite3.IntegrityError as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um funcionário com esta matrícula.") from exc

    employee = db.fetch_one("SELECT * FROM employees WHERE id = ?", (employee_id,))
    return serialize_employee(employee or {})


@app.post("/api/time-entries", status_code=status.HTTP_201_CREATED)
async def create_time_entry(
    entry_type: Annotated[Literal["entrada", "saida", "intervalo"], Form()],
    photo: Annotated[UploadFile, File()],
) -> dict:
    content, extension = await read_image(photo)
    employees = db.fetch_all("SELECT * FROM employees ORDER BY id")
    if not employees:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cadastre ao menos um funcionário antes de registrar o ponto.")

    temporary_path: Path | None = None
    best_match: tuple[dict, dict] | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension, dir=DATA_DIR) as temporary:
            temporary.write(content)
            temporary_path = Path(temporary.name)

        for employee in employees:
            result = face_engine.verify_faces(Path(employee["photo_path"]), temporary_path)
            if result["verified"] and (
                best_match is None or float(result["distance"]) < float(best_match[1]["distance"])
            ):
                best_match = (employee, result)
    except face_engine.FaceEngineUnavailable as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except (ValueError, TypeError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Não foi possível detectar um rosto válido.") from exc
    finally:
        if temporary_path:
            temporary_path.unlink(missing_ok=True)

    if best_match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rosto não reconhecido.")

    employee, result = best_match
    recorded_at = utc_now()
    entry_id = db.execute(
        "INSERT INTO time_entries(employee_id, entry_type, recorded_at, confidence) VALUES (?, ?, ?, ?)",
        (employee["id"], entry_type, recorded_at, result["confidence"]),
    )
    return {
        "id": entry_id,
        "employee": serialize_employee(employee),
        "entry_type": entry_type,
        "recorded_at": recorded_at,
        "confidence": result["confidence"],
    }


@app.get("/api/time-entries")
def list_time_entries(limit: int = 100) -> list[dict]:
    safe_limit = min(max(limit, 1), 500)
    return db.fetch_all(
        """SELECT t.id, t.entry_type, t.recorded_at, t.confidence,
                  e.id AS employee_id, e.name AS employee_name, e.registration
           FROM time_entries t
           JOIN employees e ON e.id = t.employee_id
           ORDER BY t.recorded_at DESC LIMIT ?""",
        (safe_limit,),
    )


@app.get("/api/dashboard")
def dashboard() -> dict:
    today = datetime.now(timezone.utc).date().isoformat()
    employee_count = db.fetch_one("SELECT COUNT(*) AS total FROM employees") or {"total": 0}
    today_count = db.fetch_one(
        "SELECT COUNT(*) AS total FROM time_entries WHERE substr(recorded_at, 1, 10) = ?", (today,)
    ) or {"total": 0}
    return {
        "employees": employee_count["total"],
        "entries_today": today_count["total"],
        "recent": list_time_entries(5),
    }
