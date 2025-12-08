# DoorDash Order Decider (PWA + API + ML)

[![CI](https://github.com/josuejero/DoordashOrderDecider/actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Offline-first PWA for accept/reject decisions, a Fastify API on Postgres, analytics fact tables, and a small FastAPI ML baseline (heuristic + scikit-learn/XGBoost-ready). Built for quick field use with an upgrade path to hybrid ML and BI.

## What’s inside
- **PWA:** Vite 7 + React 19 + Tailwind 4, installable with service worker caching, offline history, and `/api/orders/history` integration when online.
- **API:** Fastify + Node 20 backed by Postgres with drivers, order evaluation, history pagination, and analytics fact tables kept up to date on every evaluation.
- **ML service:** FastAPI with `/health`, `/predict`, and `/metadata`, serving a heuristic fallback or a trained GradientBoosting/XGBoost model; MLflow-friendly trainer included.
- **Analytics/BI:** DuckDB export script, analytics views, and docker-compose services for Superset/Metabase plus Prometheus/Grafana.
- **DevOps:** Docker Compose for full stack (frontend + API + DB + ML + BI); Kubernetes manifests under `infra/k8s` for ingress/TLS/HPA/secrets (SOPS/Sealed Secrets ready).

## Run locally
1. `cp .env.example .env` and set your Postgres URL(s).
2. Start Postgres (Docker): `docker compose -f infra/docker-compose.yml up postgres -d` or point to your own DB.
3. Install JS deps: `npm ci`
4. Run migrations: `npm run db:migrate`
5. Start the API: `npm run dev:server` (defaults to `http://localhost:4000`)
6. Start the PWA: `npm run dev` (Vite dev server; `/api` proxy hits the Fastify API)
7. Optional ML service locally:
   ```bash
   python -m venv .venv && source .venv/bin/activate
   pip install -r ml_service/requirements.txt
   uvicorn ml_service.main:app --reload --host 0.0.0.0 --port 8000
   ```
8. Full stack (frontend + API + DB + ML + BI/observability):
   ```bash
   docker compose -f infra/docker-compose.yml up --build
   ```
   - Frontend: http://localhost:4173 (static build)
   - API: http://localhost:4000
   - ML: http://localhost:8000
   - Superset: http://localhost:8088 · Metabase: http://localhost:3001
   - Prometheus: http://localhost:9090 · Grafana: http://localhost:3000

## API quick examples
Use the running Fastify API (default `http://localhost:4000`).

```bash
# Create a driver
curl -X POST http://localhost:4000/api/drivers \
  -H "content-type: application/json" \
  -d '{"name":"Casey","targetRatePerHour":25,"vehicleType":"car","decisionMode":"hybrid_ml"}'

# Evaluate an order (pickup/dropoff context flows to analytics fact tables)
curl -X POST http://localhost:4000/api/orders/evaluate \
  -H "content-type: application/json" \
  -d '{
    "driverId":"<driver-id>",
    "platform":"doordash",
    "targetRatePerHour":25,
    "shiftStartHHMM":"09:00",
    "earnedSoFar":40,
    "offerPayout":14,
    "finishHHMM":"10:05",
    "miles":3.4,
    "costPerMile":0.35,
    "bufferMinutes":5,
    "pickupStoreType":"fast food",
    "pickupLocation":"McDonalds - 3rd St",
    "dropoffZone":"SOMA",
    "finalDecision":"ACCEPT"
  }'

# Paginated history (UI uses this when online)
curl "http://localhost:4000/api/orders/history?driverId=<driver-id>&page=1&limit=10"

# ML predict directly (heuristic fallback if no model.pkl is present)
curl -X POST http://localhost:8000/predict \
  -H "content-type: application/json" \
  -d '{"driverId":"d1","targetRatePerHour":25,"vehicleType":"car","payout":12,"miles":4,"estimatedMinutes":32}'
```

## Data, analytics, and BI
- Fact tables (`fact_orders`, `fact_decisions`, `fact_shifts`) and dims are populated on every `/api/orders/evaluate` call.
- Export a DuckDB snapshot for Superset/Metabase: `PG_URL=postgres://... ./tools/export_to_duckdb.sh`
- Superset/Metabase docker services point at Postgres by default; connect to `analytics_driver_daily_summary` or `analytics_driver_zone_time` for dashboards.

## Testing & quality
- JS/TS: `npm run lint` · `npm test` · `npm run build`
- Python ML service: `black --check ml_service` · `pytest ml-service/tests`

## Troubleshooting
- **virtual:pwa-register missing** → ensure `vite-plugin-pwa` stays enabled.
- **DB connection issues** → verify `DATABASE_URL`/`DD_DECIDER_DEV_DB_URL` in `.env` and run `npm run db:migrate`.
- **ML service 500s** → check `MODEL_PATH`/`MODEL_METADATA_PATH` paths; without a trained model, the heuristic baseline will respond with `baseline-heuristic-1`.

## License
MIT — see [LICENSE](LICENSE).
