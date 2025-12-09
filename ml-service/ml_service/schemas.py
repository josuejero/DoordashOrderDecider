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
