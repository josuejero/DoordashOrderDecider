# ml_service/api.py
from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from .metrics import LATENCY, REQUESTS

app = FastAPI(title="DoorDashDecider ML Service")

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

# /health and /predict are attached in main.py so instrumentation is shared.
