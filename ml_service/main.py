from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from .model import load_metadata, predict_with_fallback
from .schemas import ModelMetadata, PredictRequest, PredictResponse

app = FastAPI(title="DoorDash Order Decider ML Service")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/metadata", response_model=ModelMetadata)
async def metadata() -> JSONResponse:
    """Expose model metadata for observability and debugging."""
    meta = load_metadata()
    # Return as JSON using alias names from the Pydantic model.
    return JSONResponse(content=meta.model_dump(by_alias=True))


@app.post("/predict", response_model=PredictResponse)
async def predict_endpoint(body: PredictRequest) -> JSONResponse:
    """Run an online prediction for a single offer."""
    try:
        result = predict_with_fallback(body)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return JSONResponse(content=result.model_dump(by_alias=True))
