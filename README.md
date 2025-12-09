# DoorDash Order Decider (PWA + API + ML)

[![CI](https://github.com/josuejero/DoordashOrderDecider/actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Offline-first PWA for accept/reject decisions, a Fastify API on Postgres, analytics fact tables, and a small FastAPI ML baseline (heuristic + scikit-learn/XGBoost-ready). Built for quick field use with an upgrade path to hybrid ML and BI.

## What’s inside
- **PWA:** Vite 7 + React 19 + Tailwind 4, installable with service worker caching, offline history, URL-query prefill (for iOS Shortcuts), and `/api/orders/history` integration when online.
- **API:** Fastify + Node 20 backed by Postgres with drivers, order evaluation, history pagination, and analytics fact tables kept up to date on every evaluation.
- **ML service:** FastAPI with `/health`, `/predict`, and `/metadata`, serving a heuristic fallback or a trained GradientBoosting/XGBoost model; MLflow-friendly trainer included.
- **Analytics/BI:** DuckDB export script, analytics views, and docker-compose services for Superset/Metabase plus Prometheus/Grafana.
- **DevOps:** Docker Compose for full stack (frontend + API + DB + ML + BI/observability); Kubernetes manifests under `infra/k8s` for ingress/TLS/HPA/secrets (SOPS/Sealed Secrets ready). CI builds all images, runs migrations, JS/Python lint/tests, and uploads frontend artifacts.

## Architecture
- **Phase 0:** Offline-only PWA, heuristics local, URL query prefill for Shortcuts.
- **Phase 1:** Adds Fastify + Postgres for driver/order persistence.
- **Phase 2:** Analytics facts/dims/views feed `/api/analytics/*` + DuckDB/BI exports.
- **Phase 3:** Optional FastAPI ML scoring blended with heuristics.
- More detail: `docs/architecture.md`

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
   - Loki (logs): http://localhost:3100 · Grafana Loki datasource pre-wired (start with `--profile observability`)

## iOS Shortcut / deep link
- Base URL: `https://<host>/?payout={12.5}&finish={09:45}&miles={3.2}&cpm={0.35}&target={25}&start={09:00}&earned={40}&buffer={5}`
- Query params map 1:1 to form fields; HH:MM is 24h; currency/length are plain numbers.
- Recommended Shortcut (see `docs/ios-shortcuts.md`):
  - Build URL from Clipboard/Dictation/Ask Each Time → **Open URL**.
  - Optional automation: Back Tap / Action Button / Apple Watch / DoorDash app open trigger.

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

## Ops & CI
- Secrets: local dev uses `.env`; production overlays should wrap `infra/k8s/base/config.yaml` with SOPS or Sealed Secrets (guide in `docs/operations.md`).
- HTTPS/ingress: `infra/k8s/base/ingress.yaml` + `tls.yaml` wire NGINX Ingress + cert-manager; swap hostnames and cert issuer per env.
- Observability: `/metrics` on API/ML → Prometheus → Grafana; Loki/Promtail optional for container logs (`docker compose ... --profile observability`).
- CI: migrations against Postgres service, JS lint/tests/build, Python format/tests, Docker image builds (frontend/server/ml), dist artifact upload.

## Testing & quality
- JS/TS: `npm run lint` · `npm test` · `npm run build`
- Python ML service: `black --check ml_service` · `pytest ml-service/tests`

## Troubleshooting
- **virtual:pwa-register missing** → ensure `vite-plugin-pwa` stays enabled.
- **DB connection issues** → set `DD_DECIDER_DEV_DB_URL` (and `DD_DECIDER_TEST_DB_URL` for test/CI) in `.env`; `DATABASE_URL` can point at the dev URL. Then run `npm run db:migrate` / `npm run db:migrate:test`.
- **ML service 500s** → check `MODEL_PATH`/`MODEL_METADATA_PATH` paths; without a trained model, the heuristic baseline will respond with `baseline-heuristic-1`.

## License
MIT — see [LICENSE](LICENSE).
