from fastapi import HTTPException
from fastapi.responses import JSONResponse

from .api import app
from .model import load_metadata, predict
from .schemas import ModelMetadata, PredictRequest, PredictResponse


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/metadata", response_model=ModelMetadata)
async def metadata():
    meta = load_metadata()
    return JSONResponse(content=meta)


@app.post("/predict", response_model=PredictResponse)
async def predict_endpoint(body: PredictRequest):
    try:
        result = predict(body)
    except Exception as exc:

        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return JSONResponse(content=result.model_dump(by_alias=True))
