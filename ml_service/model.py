from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple

import joblib  # type: ignore[import-untyped]
import numpy as np

from .schemas import ModelMetadata, PredictRequest, PredictResponse

MODEL_PATH = Path(__file__).with_name("model.pkl")
DEFAULT_MODEL_VERSION = "baseline-heuristic-1"


class ModelNotLoaded(Exception):
    """Raised when a serialized model file cannot be found or loaded."""

    pass


def _estimate_duration_hours(req: PredictRequest) -> float:
    """Estimate order duration in hours from the request.

    Prefer the explicit estimatedMinutes field. If it's missing, fall back to
    a coarse estimate based on miles. As a last resort, assume 30 minutes.
    """
    if req.estimated_minutes is not None:
        minutes = max(float(req.estimated_minutes), 1.0)
    elif req.miles is not None:
        minutes = max(float(req.miles) * 6.0, 1.0)
    else:
        minutes = 30.0
    return minutes / 60.0


def _heuristic_fallback(req: PredictRequest) -> Tuple[float, float, str]:
    """Fallback when no trained model is available.

    Uses a simple "payout per estimated hour" heuristic and returns a
    (predicted_rate, confidence, model_version) tuple.
    """
    hours = _estimate_duration_hours(req)
    payout = float(req.payout)
    predicted_hourly = payout / hours
    confidence = 0.3
    return predicted_hourly, confidence, DEFAULT_MODEL_VERSION


def _build_feature_vector(req: PredictRequest) -> np.ndarray:
    """Construct a feature vector matching the training schema.

    The training data currently uses:

    - gross_payout
    - miles
    - est_minutes
    - hour_of_day
    - day_of_week

    When serving online predictions we may not have time features; default them
    to zero so the model still receives a fixed-width numeric vector.
    """
    miles = 0.0 if req.miles is None else float(req.miles)
    est_minutes = 0.0 if req.estimated_minutes is None else float(req.estimated_minutes)
    gross = float(req.payout)
    features = np.array([[gross, miles, est_minutes, 0.0, 0.0]], dtype=float)
    return features


def load_model(path: Path | None = None):
    """Load the trained model from disk.

    Raises
    ------
    ModelNotLoaded
        If the model file does not exist or cannot be loaded.
    """
    model_path = path or MODEL_PATH
    if not model_path.exists():
        raise ModelNotLoaded(f"Model file not found at {model_path}")
    try:
        return joblib.load(model_path)
    except Exception as exc:  # pragma: no cover - defensive
        raise ModelNotLoaded(f"Failed to load model from {model_path}") from exc


def predict(req: PredictRequest) -> PredictResponse:
    """Predict effective hourly rate with a trained model or fallback.

    If loading or using the model fails for any reason, a deterministic
    heuristic is used instead so the service still returns a result.
    """
    try:
        model = load_model()
    except ModelNotLoaded:
        rate, confidence, model_version = _heuristic_fallback(req)
        return PredictResponse(
            predictedEffectiveHourlyRate=rate,
            confidence=confidence,
            modelVersion=model_version,
        )

    features = _build_feature_vector(req)
    try:
        prediction = float(model.predict(features)[0])
    except Exception:  # pragma: no cover - defensive
        rate, confidence, model_version = _heuristic_fallback(req)
        return PredictResponse(
            predictedEffectiveHourlyRate=rate,
            confidence=confidence,
            modelVersion=model_version,
        )

    confidence = 0.7
    model_version = getattr(model, "model_version_", DEFAULT_MODEL_VERSION)
    return PredictResponse(
        predictedEffectiveHourlyRate=prediction,
        confidence=confidence,
        modelVersion=model_version,
    )


def predict_with_fallback(req: PredictRequest) -> PredictResponse:
    """Backward-compatible alias used by the FastAPI layer/tests."""
    return predict(req)


def load_metadata(source: str = "heuristic") -> ModelMetadata:
    """Return basic metadata information for the model used by the service."""
    trained_at = datetime.now(timezone.utc).isoformat()
    try:
        model = load_model()
        model_version = getattr(model, "model_version_", DEFAULT_MODEL_VERSION)
    except ModelNotLoaded:
        model_version = DEFAULT_MODEL_VERSION

    return ModelMetadata(
        modelVersion=model_version,
        trainedAt=trained_at,
        runId=None,
        rmse=None,
        trackingUri=None,
        source=source,
    )
