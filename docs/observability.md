# Observability
DoorDash Order Decider exposes metrics, correlation IDs, and audit rows so you can monitor latency, retries, and the reasoning behind every recommendation.

## Fastify metrics
- `server/metrics.ts` registers `http_request_duration_seconds` with method/route/status labels.
- `/metrics` returns the Prometheus registry so Grafana/Prometheus can scrape request latency, success rate, and upstream error spikes.
- Fastify injects `x-correlation-id` on every request via `server/app.ts`; logs include the header so you can join API logs with Java decision-engine logs and analytics exports.

## Java decision-engine metrics
- `decision-engine/src/main/java/com/doordash/decider/metrics/QuoteMetrics.java` exposes `decision_engine.quote.compute_latency` and `decision_engine.quote.strategy_selection{strategy}` to break down which `QuoteStrategy` nodes are hot.
- `decision-engine/src/main/java/com/doordash/decider/audit/QuoteAuditMetrics.java` increments `decision_engine.quote.idempotency_hits` whenever a duplicate `idempotency_key` is detected.
- `/actuator/prometheus` serves these metrics plus JVM and Spring probes so you know when rule evaluations or idempotency lookups regressed.

## Audit tables as observability data
- `quote_requests` tracks raw payloads, `correlation_id`, and `idempotency_key` so you can replay inputs.
- `quote_results` stores the normalized decision, `decision_action`, `rule_version`, and payload for downstream analytics.
- `quote_assumptions` flattens the `explanationTree`, meaning you can query `assumption_key` values to track which thresholds or costs changed over time.
- `rule_versions` ties each quote to the exact configuration that emitted it.

## Correlation story
- Fastify seeds `request.correlationId` and flows it into logs and the forwarded Java payload (`server/routes/quote.ts`).
- The Java engine returns the same correlation ID so frontend dashboards, logs, and metrics share a common trace.
- Prometheus/Grafana dashboards can pin down slow heuristics by joining `http_request_duration_seconds` (Fastify) with `decision_engine.quote.compute_latency` (Java).

## Infrastructure
- The `infra/` manifests wire Prometheus, Grafana, Loki, and cert-manager for production deployments.
- Docker Compose brings up Loki/Promtail, Superset/Metabase, Postgres, and Grafana so you can inspect logs and dashboards locally.
