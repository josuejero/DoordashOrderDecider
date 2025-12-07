from fastapi import HTTPException
from fastapi.responses import JSONResponse

from .api import app  # instrumentation and /metrics endpoint
from .model import predict
from .schemas import PredictRequest, PredictResponse


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
