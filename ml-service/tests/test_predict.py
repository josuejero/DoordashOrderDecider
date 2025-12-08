# tests/test_predict.py
from fastapi.testclient import TestClient

from ml_service.main import app


client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_predict_baseline():
    body = {
        "driverId": "driver-1",
        "targetRatePerHour": 25.0,
        "vehicleType": "car",
        "payout": 10.0,
        "miles": 3.0,
        "estimatedMinutes": 30.0,
    }
    resp = client.post("/predict", json=body)
    assert resp.status_code == 200
    data = resp.json()
    assert "predictedEffectiveHourlyRate" in data
    assert "confidence" in data
    assert "modelVersion" in data
