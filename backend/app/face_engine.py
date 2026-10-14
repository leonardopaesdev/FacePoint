from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any


class FaceEngineUnavailable(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _deepface() -> Any:
    try:
        from deepface import DeepFace
    except Exception as exc:
        raise FaceEngineUnavailable(
            "DeepFace não está disponível. Instale as dependências do backend com Python 3.12."
        ) from exc
    return DeepFace


def is_available() -> bool:
    try:
        _deepface()
        return True
    except FaceEngineUnavailable:
        return False


def validate_face(image_path: Path) -> None:
    deepface = _deepface()
    deepface.extract_faces(
        img_path=str(image_path),
        detector_backend=os.getenv("FACEPOINT_DETECTOR", "opencv"),
        enforce_detection=True,
        anti_spoofing=False,
    )


def verify_faces(reference_path: Path, captured_path: Path) -> dict[str, float | bool]:
    deepface = _deepface()
    result = deepface.verify(
        img1_path=str(reference_path),
        img2_path=str(captured_path),
        model_name=os.getenv("FACEPOINT_MODEL", "Facenet512"),
        detector_backend=os.getenv("FACEPOINT_DETECTOR", "opencv"),
        distance_metric="cosine",
        enforce_detection=True,
        align=True,
        anti_spoofing=False,
        silent=True,
    )
    return {
        "verified": bool(result["verified"]),
        "distance": float(result["distance"]),
        "threshold": float(result["threshold"]),
        "confidence": float(result.get("confidence", 0.0)),
    }
