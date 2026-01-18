# Current state (Phase 0 baseline)

## Flow from UI to persistence
- The React/Vite UI computes every decision locally with `src/lib/decision.ts` (`computeDecision` + `explainDecision`) so the heuristic recommendation is available immediately, even offline.
- When the driver confirms an order, `src/hooks/useDecisionLogger.ts` builds an `EvaluateOrderPayload`, posts it to `/api/orders/evaluate`, and persists the evaluation locally (history array + IndexedDB `pending-evaluations`) if the network is unavailable. The same hook also syncs cached driver and model metadata via `src/lib/driverApi.ts`/`src/lib/offlineCache.ts`.
- On the backend (`server/routes/orders.ts`) Fastify recomputes the net/hour projections, optionally calls the ML service (`callMlPredict`) when `drivers.decisionMode === "hybrid_ml"`, and replies with both the canonical decision object and the explanation metadata.
- Every successful evaluation creates an `orders` row, inserts the decision into `decisions`, and mirrors the data into analytics fact tables (`fact_orders`, `fact_decisions`) plus the dimensional helpers (`dim_driver`, `dim_zone`, `dim_time`). Failed analytics inserts are logged but do not block the API response.

## API surface

### POST `/api/orders/evaluate`
- Request body (`server/routes/orders.ts:23-60`) carries `driverId`, `platform`, `targetRatePerHour`, `shiftStartHHMM`, `earnedSoFar`, `offerPayout`, `finishHHMM`, optional `miles`, `costPerMile`, `bufferMinutes`, `pickupStoreType`, `pickupLocation`, `dropoffZone`, `finalDecision`, and zone metadata.
- The server responds with `{ orderId, decisionId, recommendedDecision, finalDecision, mode, usedMl, modelVersion, decision, explanation }`, where `decision` mirrors the locally computed values (`netPayout`, `requiredDollars`, `projectedGrossPerHour`, `projectedNetPerHour`, `finishIso`) and `explanation` contains `{ code, message }`.
- The route also returns HTTP 404 when the driver is missing and 201 on success.

### GET `/api/orders/history`
- Accepts `driverId`, pagination (`limit`, `page`), optional `startDate`, `endDate`, `zone`, and decision filters (`accept/reject`). Response rows join `decisions`, `orders`, `fact_orders`, `dim_zone`, and `fact_decisions` so the UI has payout/miles/estimated minutes, recommended vs. final decision, and the captured zone name (`server/routes/orders.ts:110-180`).

### `/api/drivers` (POST/GET/PUT)
- Creates or updates the `drivers` table (`server/routes/drivers.ts`) with `name`, `targetRatePerHour`, `vehicleType`, optional costs, `decisionMode` (`heuristic` vs. `hybrid_ml`), and driver preferences. PUT requests also refresh `dim_driver` via `ensureDimDriver`.
- `src/lib/driverApi.ts` caches the payloads (`cacheDriverProfile`) and emits offline-friendly errors when the browser queue is holding writes.

### Analytics routes
- `GET /api/analytics/summary` (requires `driverId`, optional date window) returns aggregates from the `analytics_driver_daily_summary` view (acceptance rate, earnings, miles, estimated minutes, effective hourly rate).
- `GET /api/analytics/zone-time` uses the `analytics_driver_zone_time` view to break out orders per time-of-day bucket + zone.

### ML passthrough
- `GET /api/model/metadata` and `POST /api/model/predict` are Fastify wrappers around the FastAPI service. Prediction is gated by `ENABLE_HYBRID_ML`; `/predict` forwards `{ driverId, targetRatePerHour, vehicleType, payout, miles, estimatedMinutes }` and returns `{ predictedEffectiveHourlyRate, confidence, modelVersion? }`.

### Health & observability
- `/health`, `/version`, `/health/db` (checks `SELECT 1`), and `/metrics` (`prom-client`) round out probes. Metrics are collected via `server/metrics.ts` and hooked through `wrapWithMetrics`.

## Data persistence

### OLTP tables (migrations/1764208736754_init-schema.cjs)
- `drivers`: `id (UUID)`, `name`, `target_rate_per_hour`, `vehicle_type`, `fuel_cost_per_unit`, `maintenance_per_mile`, `decision_mode`, `preferred_zones`, `preferred_time_buckets`, `created_at`, `updated_at`.
- `orders`: `id`, `driver_id`, `platform`, `payout`, `miles`, `estimated_minutes`, `created_at`.
- `decisions`: `id`, `order_id`, `driver_id`, `accept`, `net_payout`, `required_dollars`, `projected_gross_per_hour`, `projected_net_per_hour`, `finish_iso`, `created_at`.
- `decision_events`: `id`, `decision_id`, `event_type`, `payload`, `created_at` (reserved for audit/event streams even though no code currently writes to it).

### Analytics warehouse (Phase 2 migrations)
- Dimensions: `dim_driver`, `dim_zone`, `dim_time` (auto-populated buckets for date/hour/time-of-day).
- Facts: `fact_orders` records `base_payout`, `tip`, `estimated_distance_miles`, `estimated_time_minutes`, `pickup_store_type`, `pickup_location`, `dropoff_zone`, `zone_id`, `time_id`, `platform`.
- `fact_decisions` stores `active_mode`, `recommended_decision`, `final_decision`, `effective_hourly_rate`, `reason_codes`.
- `fact_shifts` captures shift-level totals (`started_at`, `ended_at`, `total_miles`, `dead_miles`, `total_earnings`).
- Views `analytics_driver_daily_summary`, `analytics_driver_zone_time`, `analytics_accept_all_baseline` power `/api/analytics/*` and downstream BI exports (`tools/export_to_duckdb.sh`).

### Payload shapes we already store
- **Order logs:** `orders` plus `fact_orders` retain payout, miles, ETA minutes, pickup/dropoff context, zone/time references, and driver metadata via `dim_*`.
- **Decisions:** `decisions` and `fact_decisions` encode accept/reject, net vs required dollars, projected gross/net per hour, reason codes, active mode (heuristic vs. hybrid), and ML metadata when available.
- **Decision events (future audit):** `decision_events` keeps `event_type` and arbitrary JSON `payload` for `decisionId` timelines (currently unused but part of the schema/migrations).

## Minimum business facts for a quote
The quote math consumes:
1. **Payout/offer** – base `offerPayout` from the UI.
2. **Distance friction** – optional `miles` + `costPerMile` to derive variable costs.
3. **Time window** – `shiftStartHHMM`, `finishHHMM`, and optional `bufferMinutes` form the total minutes.
4. **Earned so far** – to compare against the target run rate.
5. **Driver target rate** – `targetRatePerHour` from profile + `decisionMode` (heuristic vs. hybrid).
6. **Optional ML signal** – hybrid mode hits ML service (`callMlPredict`) and blends the predicted effective hourly rate.

## Offline / “do not break” constraints to preserve
- **Local heuristics + explanation:** `computeDecision`/`explainDecision` live in `src/lib/decision.ts`, re-used both in the UI and on Fastify before persistence so offline behavior and explainability stay in sync.
- **IndexedDB queue:** `pending-evaluations` (in `src/lib/offlineQueue.ts`) buffers payloads when `isOnline` is false. `useDecisionLogger` drains the queue when connectivity returns, honoring cached driver IDs (via `syncDriverProfile`) and `cacheModelMetadata`.
- **History & profile caches:** The history UI falls back to `src/lib/decisionHistory.ts` storage when the API is unreachable, and `src/lib/offlineCache.ts` keeps driver profile/model metadata in localStorage + Cache Storage.
- **Driver provisioning fallback:** If there is no driver ID yet, the hook waits for `/api/drivers` to succeed before logging, but it will still queue decisions offline and fill the ID once reconnecting.
- **Logging + metrics:** Fastify stays the gateway with built-in logging, `prom-client` metrics, and deployment probes (`/health`, `/metrics`) so observable behavior is unchanged.
- **DB migrations:** Existing `node-pg-migrate` scripts define the schema; any target change must keep scripts runnable so `npm run db:migrate`/`db:seed` still work.

## Ownership boundaries
- Fastify remains the canonical gateway: it owns `/api/*`, ties UI inputs to persistence, logs decisions, and translates ML metadata into the response.
- The Java quote service (target owner) should be responsible for the actual quote math, rule-versioning, explainability text, and audit trail of quote inputs/outputs while Fastify simply proxies the final quote + metadata. Today the Fastify API owns both responsibilities, but the roadmap shifts quote logic into the Java service while Fastify stays the entry point.

## Diagrams
- **Today:** `PWA (local heuristics + offline queue)` → `Fastify API (orders/history/drivers/analytics/model/metrics)` → `Postgres (drivers/orders/decisions/fact_*)` with an optional branch to `ML FastAPI (predict/metadata)` and `service-worker/caches` for offline.
- **Target:** `PWA` → `Fastify gateway` → `Java quote service (quote math/rules/explainable audit)` → `Postgres/fact tables`; `Fastify` still proxies `/analytics`, `/drivers`, `/model`, `/metrics`, `/health`, and keeps the IndexedDB queue intact, while `ML FastAPI` remains an optional hybrid signal.
