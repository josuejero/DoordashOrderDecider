# DoorDashDecider – Architecture (Phases 1–3)

## Evolution by phase
- **Phase 1 (PWA + API + DB):** Offline-capable PWA calculates accept/reject heuristics locally. Fastify API persists drivers/orders/decisions in Postgres. Service worker caches the shell; history falls back to local storage when offline.
- **Phase 2 (Analytics):** Fact tables (`fact_orders`, `fact_decisions`, `fact_shifts`) plus `dim_driver`, `dim_zone`, and `dim_time` power `/api/orders/history`, `/api/analytics/*`, and DuckDB/Superset/Metabase exports. Pickup type/location and dropoff zone are captured for zone/time reporting.
- **Phase 3 (Hybrid ML):** Separate FastAPI service exposes `/health`, `/predict`, and `/metadata` using a heuristic fallback or a trained GradientBoosting/XGBoost baseline. The API optionally blends ML scores with heuristics when drivers opt into `decisionMode = hybrid_ml`. Model artifacts come from `ml_service.train` (MLflow-ready).

## System components
- **PWA (Vite/React/Tailwind):** Computes decisions client-side, syncs driver profiles, hits `/api/orders/evaluate` for persisted history/analytics, caches profile + model metadata, and queues order logs in IndexedDB when offline.
- **API (Fastify + Postgres):**
  - Endpoints: `/api/drivers`, `/api/orders/evaluate`, `/api/orders/history`, `/api/model/*`, `/api/analytics/*`, `/metrics`, `/health`.
  - Inserts into OLTP tables and analytics fact tables on every evaluation.
  - Optional ML call-out to the FastAPI service when `decisionMode=hybrid_ml`.
- **Data stores:**
  - **Postgres** for drivers/orders/decisions + analytics facts/dims/views.
  - **IndexedDB** for offline order log queue; **Cache Storage + localStorage** for profile and model metadata.
- **ML service (FastAPI):** Serves `/predict` + `/health` + `/metadata`; loads `model.pkl` + `model_metadata.json` if present, otherwise returns a heuristic baseline. Trainer reads Postgres fact tables and logs to MLflow.
- **Analytics/BI:** DuckDB export (`tools/export_to_duckdb.sh`), Superset/Metabase docker services, Prometheus/Grafana for API/ML metrics.
- **DevOps:** Docker Compose for full stack; Kubernetes manifests under `infra/k8s` (ingress, TLS, resources, HPA, secrets via SOPS/Sealed Secrets).

## Request & data flow (Phase 3)
```
PWA ──/api/orders/evaluate────▶ Fastify API ──SQL──▶ Postgres (orders + fact_*)
  │                                   │
  │ offline: queue in IndexedDB       └─▶ (optional) ML service /predict
  │                                   │
  └─/api/orders/history───────────────┘
```
- Each evaluation persists the order + decision, writes fact tables, and returns both recommended and final decisions (if the driver overrides).
- History UI uses `/api/orders/history` when online, otherwise local cache; analytics views power BI exports.
- ML metadata is cached client-side so the PWA can display the model version even when offline.

## Core domain model
- **Driver:** `id`, `name`, `targetRatePerHour`, `vehicleType`, `fuelCostPerUnit`, `maintenanceCostPerMile`, `decisionMode`, `preferredZones`, `preferredTimeBuckets`, timestamps.
- **Order:** `id`, `driverId`, `platform`, `payout`, `miles`, `estimatedMinutes`, pickup/dropoff context (`pickupStoreType`, `pickupLocation`, `dropoffZone`), timestamps.
- **Decision:** `id`, `orderId`, `driverId`, `accept`, `netPayout`, `requiredDollars`, `projectedGrossPerHour`, `projectedNetPerHour`, `finishIso`, `createdAt`.
- **DecisionEvent:** audit/log stream keyed by `decisionId` for future instrumentation.
- **Analytics facts/dims:** `fact_orders`, `fact_decisions`, `fact_shifts`, plus `dim_driver`, `dim_zone`, `dim_time` with views like `analytics_driver_daily_summary` and `analytics_driver_zone_time`.

## Local + deploy notes
- **Env:** copy `.env.example` and set Postgres + ML URLs. `ENABLE_ANALYTICS_API=true` enables analytics routes; `ENABLE_HYBRID_ML=true` lets the API call the ML service.
- **Local dev:** `npm ci && npm run db:migrate && npm run dev:server` plus `npm run dev` for the PWA. `uvicorn ml_service.main:app` to run the ML service.
- **Full stack:** `docker compose -f infra/docker-compose.yml up --build` brings up frontend, API, Postgres, ML, Superset, Metabase, Prometheus, and Grafana.
- **K8s:** manifests in `infra/k8s/base`; configure ingress hosts + TLS, HPA, and secrets (SOPS/Sealed Secrets) per environment.
