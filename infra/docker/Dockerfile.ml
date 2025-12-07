# infra/docker/Dockerfile.ml
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY ml-service/requirements.txt ./ml-service/requirements.txt
WORKDIR /app/ml-service

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY ml-service/ .

ENV PORT=8000
CMD ["uvicorn", "ml_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
