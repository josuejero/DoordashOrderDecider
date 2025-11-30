# ml_service/main.py
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from .model import predict
from .schemas import PredictRequest, PredictResponse


app = FastAPI(title="DoorDashDecider ML Service")


@app.get("/health")
async def health():
  return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
async def predict_endpoint(body: PredictRequest):
  try:
    result = predict(body)
  except Exception as exc:  # noqa: BLE001
    # In production, add logging here.
    raise HTTPException(status_code=500, detail=str(exc)) from exc

  return JSONResponse(content=result.model_dump(by_alias=True))
