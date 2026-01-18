# Architecture
DoorDash Order Decider glues together an offline-first client, a Fastify API, an audited Java decision engine, and optional ML + analytics services so drivers can accept or reject delivery offers with traceable reasoning.

## Layered components
- **Client (React + Vite PWA)** – builds decisions with shared logic, renders the explanation tree, stores orders locally when offline, and syncs history/decisions once connectivity returns.
- **Fastify API** – validates `/api/orders/evaluate` requests with Zod, forwards quotes to the Java microservice (`/api/quote`), writes analytics facts, and exposes `/metrics`, `/health`, `/api/model`, and `/api/analytics` when feature flags are enabled.
- **Java decision engine** – a Spring Boot service (`decision-engine/`) that loads `rulesets/*.json`, persists `rule_versions`, enforces idempotency, records audit rows (`quote_requests`, `quote_results`, `quote_assumptions`), and exposes Swagger + Prometheus endpoints.
- **ML service** – FastAPI predictor that can supplement the heuristic by returning a `predictedEffectiveHourlyRate`, plus metadata and health probes.
- **Postgres + analytics** – stores drivers, orders, decisions, facts/dimensions, and rule metadata so both operational dashboards and DuckDB/Superset consumers can run reports.
- **Observability & infra** – `/metrics` endpoints are scraped by Prometheus; logs carry `correlationId` from Fastify so Grafana/Loki dashboards can correlate API calls, decision-engine metrics, and retries.

## Data and control flow
1. Driver enters an offer in the PWA (or syncs a queued entry via IndexedDB).
2. Fastify normalizes the request, stores a correlation ID, emits metrics, and posts the payload to the Java decision engine with the idempotency key.
3. The Java service evaluates the strategy, writes `quote_requests`/`quote_results`/`quote_assumptions`, and replies with the decision, explanations, and the active `rulesetKey`/`ruleVersion`.
4. Fastify persists the decision in its own analytics tables, returns the payload to the PWA, and optionally calls the ML service for `hybrid_ml` mode.
5. Analytics dashboards and DuckDB exports read from the fact tables, while Prometheus/Grafana ingest `http_request_duration_seconds`, `decision_engine.quote.compute_latency`, `strategy_selection`, and `idempotency_hits`.

## Offline resilience
The UI can render decisions, explanations, and driver settings purely from local files (`src/lib/decision.*`). When the network is unavailable it enqueues the evaluation in IndexedDB and retries as soon as Fastify is reachable, ensuring drivers always see consistent reasoning even when data reaches the server later.

## Observability and operations
- Fastify exposes `/metrics` (via `server/metrics.ts`) and includes `x-correlation-id` headers so downstream systems can correlate logs and audit rows.
- The Java decision engine publishes `/actuator/prometheus`, `/swagger-ui.html`, and logs structured fields such as `correlationId`, `ruleVersion`, and `strategy` for easy debugging.
- Infrastructure manifests under `infra/` wire Prometheus, Grafana, Loki, and cert-manager so teams can alert on latency, idempotency hits, and rule deployments.
