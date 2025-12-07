# ml_service/api.py
from fastapi import FastAPI, Request, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from .metrics import REQUESTS, LATENCY

app = FastAPI()

@app.middleware("http")
async def track_requests(request: Request, call_next):
    endpoint = request.url.path
    with LATENCY.labels(endpoint=endpoint).time():
        response = await call_next(request)
    REQUESTS.labels(endpoint=endpoint, status=str(response.status_code)).inc()
    return response

@app.get("/metrics")
async def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

# existing /predict, /health routes remain
