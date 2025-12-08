# ml_service/schemas.py
from pydantic import BaseModel, Field
from typing import Optional


class PredictRequest(BaseModel):
  driver_id: str = Field(..., alias="driverId")
  target_rate_per_hour: float = Field(..., alias="targetRatePerHour")
  vehicle_type: Optional[str] = Field(None, alias="vehicleType")
  payout: float
  miles: float | None = None
  estimated_minutes: float | None = Field(None, alias="estimatedMinutes")


class PredictResponse(BaseModel):
  predicted_effective_hourly_rate: float = Field(..., alias="predictedEffectiveHourlyRate")
  confidence: float
  model_version: str = Field(..., alias="modelVersion")


class ModelMetadata(BaseModel):
  model_version: str | None = Field(None, alias="modelVersion")
  trained_at: str | None = Field(None, alias="trainedAt")
  run_id: str | None = Field(None, alias="runId")
  rmse: float | None = None
  tracking_uri: str | None = Field(None, alias="trackingUri")
  source: str | None = None
