from __future__ import annotations

from datetime import datetime
import os
import json
from pathlib import Path
from typing import Tuple

import joblib
import numpy as np

from .schemas import PredictRequest, PredictResponse


DEFAULT_MODEL_PATH = Path(__file__).with_name("model.pkl")
MODEL_PATH = Path(os.environ.get("MODEL_PATH", DEFAULT_MODEL_PATH))
MODEL_METADATA_PATH = Path(
  os.environ.get(
    "MODEL_METADATA_PATH",
    DEFAULT_MODEL_PATH.with_name("model_metadata.json"),
  )
)
DEFAULT_MODEL_VERSION = "baseline-heuristic-1"


def _heuristic_fallback(req: PredictRequest) -> Tuple[float, float, str]:
  """Lightweight baseline when a trained model is not present."""
  payout = float(req.payout)
  minutes = float(req.estimated_minutes or 30.0)
  hours = max(minutes / 60.0, 0.25)
  hourly = payout / hours
  return hourly, 0.1, DEFAULT_MODEL_VERSION


def load_model():
  if not MODEL_PATH.exists():
    return None
  return joblib.load(MODEL_PATH)


_model = load_model()
_model_mtime = MODEL_PATH.stat().st_mtime if MODEL_PATH.exists() else None


def _maybe_reload_model():
  global _model, _model_mtime
  if not MODEL_PATH.exists():
    _model = None
    _model_mtime = None
    return

  current_mtime = MODEL_PATH.stat().st_mtime
  if _model is None or _model_mtime != current_mtime:
    _model = joblib.load(MODEL_PATH)
    _model_mtime = current_mtime


def load_metadata() -> dict[str, str | float | None]:
  if not MODEL_METADATA_PATH.exists():
    return {
      "modelVersion": DEFAULT_MODEL_VERSION,
      "trainedAt": None,
      "runId": None,
      "rmse": None,
      "trackingUri": None,
      "source": "heuristic",
    }

  try:
    return json.loads(MODEL_METADATA_PATH.read_text())
  except json.JSONDecodeError:
    return {
      "modelVersion": DEFAULT_MODEL_VERSION,
      "trainedAt": None,
      "runId": None,
      "rmse": None,
      "trackingUri": None,
      "source": "heuristic",
    }


def predict(req: PredictRequest) -> PredictResponse:
  global _model
  _maybe_reload_model()

  if _model is None:
    hourly, confidence, version = _heuristic_fallback(req)
    return PredictResponse(
      predictedEffectiveHourlyRate=hourly,
      confidence=confidence,
      modelVersion=version,
    )

  # Derive time features so we have 5 inputs (matching training)
  now = datetime.now()
  hour_of_day = now.hour           # 0–23
  day_of_week = now.weekday()      # 0=Monday … 6=Sunday

  features = np.array(
    [
      [
        float(req.payout),                 # gross_payout
        float(req.miles or 0.0),          # miles
        float(req.estimated_minutes or 30.0),  # est_minutes
        float(hour_of_day),               # hour_of_day
        float(day_of_week),               # day_of_week
      ]
    ]
  )

  hourly = float(_model.predict(features)[0])
  confidence = 0.7
  return PredictResponse(
    predictedEffectiveHourlyRate=hourly,
    confidence=confidence,
    modelVersion=getattr(_model, "model_version_", DEFAULT_MODEL_VERSION),
  )
