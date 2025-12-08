from fastapi.testclient import TestClient

from ml_service.main import app


client = TestClient(app)


def test_metadata_endpoint():
  resp = client.get("/metadata")
  assert resp.status_code == 200
  data = resp.json()
  assert "modelVersion" in data
  assert "trainedAt" in data
