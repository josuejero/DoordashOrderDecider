from __future__ import annotations

from pathlib import Path
from typing import Tuple

import joblib
import numpy as np
from datetime import datetime

from .schemas import PredictRequest, PredictResponse


MODEL_PATH = Path(__file__).with_name("model.pkl")
DEFAULT_MODEL_VERSION = "baseline-heuristic-1"


class ModelNotLoaded(Exception):
  pass


def _heuristic_fallback(req: PredictRequest) -> Tuple[float, float, str]:

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

def predict(req: PredictRequest) -> PredictResponse:
  global _model

  if _model is None:
    hourly, confidence, version = _heuristic_fallback(req)
    return PredictResponse(
      predictedEffectiveHourlyRate=hourly,
      confidence=confidence,
      modelVersion=version,
    )


  now = datetime.now()
  hour_of_day = now.hour
  day_of_week = now.weekday()

  features = np.array(
    [
      [
        float(req.payout),
        float(req.miles or 0.0),
        float(req.estimated_minutes or 30.0),
        float(hour_of_day),
        float(day_of_week),
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
