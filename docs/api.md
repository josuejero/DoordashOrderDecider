# Decision Engine API
The Fastify backend forwards every `/api/quote` request to the Java decision engine. The API enforces a predictable payload, mirrors the Java response, and tracks correlation + idempotency so you can safely retry requests.

## Quote evaluation contract
- **Endpoint:** `POST /api/quote`
- **Purpose:** Return a recommendation, explanation, and rule metadata for a driver offer so the PWA can render the decision and persist an audit trail.
- **Rule metadata:** Every successful response includes `rulesetKey` + `ruleVersion`; those values match the rows in the `rule_versions` table.
- **Correlation & idempotency:** Fastify propagates the `x-correlation-id` header and accepts an `Idempotency-Key` header (and optional body field) so retries preserve the same `quoteId` and can be tracked across services.

## Request
### Headers
- `Content-Type: application/json`
- `Accept: application/json`
- `Idempotency-Key: <opaque string>` (preferred) – used by Fastify and Java to deduplicate.
- `X-Correlation-Id: <uuid>` – Fastify generates one if you omit it and returns it with every response.

### Body schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `rulesetKey` | string | yes | Pick the market/profile so the right rule set is selected. |
| `driverId` | string (UUID) | yes | Persisted driver identifier. |
| `platform` | string | yes | e.g. `"doordash"`. |
| `targetRatePerHour` | number | yes | Driver target run rate. |
| `shiftStartHHMM`, `finishHHMM` | string | yes | Local HHMM times. |
| `earnedSoFar`, `offerPayout` | number | yes | Current earnings + payout for the quoted order. |
| `miles`, `costPerMile`, `bufferMinutes` | number | no | Optional distance/cost adjustments. |
| `pickupStoreType`, `pickupLocation`, `dropoffZone` | string | no | Optional context for analytics. |
| `zoneName`, `zoneCity`, `zoneRegion` | string | no | Additional zone metadata. |
| `finalDecision` | `ACCEPT`/`REJECT` | no | When the driver already decided. |
| `idempotencyKey` | string | no | Body fallback if headers are stripped. |

### Example request
```json
POST /api/quote HTTP/1.1
Content-Type: application/json
Idempotency-Key: 7f47f4c2-94b3-4288-9b93-2fcff05d4a9d
X-Correlation-Id: 6d9f1b4f-4d23-4f3c-9286-9e663e6a0c3b

{
  "rulesetKey": "sf-urban",
  "driverId": "c4b2e4a5-2bf0-4f43-90ef-dce0f4f551d1",
  "platform": "doordash",
  "targetRatePerHour": 45,
  "shiftStartHHMM": "0800",
  "finishHHMM": "1200",
  "earnedSoFar": 120,
  "offerPayout": 28,
  "miles": 3.2,
  "costPerMile": 0.74,
  "bufferMinutes": 15,
  "pickupStoreType": "grocery",
  "pickupLocation": "Market Street",
  "dropoffZone": "Mission",
  "idempotencyKey": "order-123",
  "finalDecision": "ACCEPT"
}
```

## Response
### Success payload
Fastify mirrors the Java payload so the UI receives `{ quoteId, rulesetKey, ruleVersion, decision, explanation }` along with metadata such as `mode`, `usedMl`, `modelVersion`, and the persisted `correlationId`.

```json
{
  "quoteId": "1af6b830-3f6a-4c0a-9b50-5c9b5f9b2c07",
  "rulesetKey": "sf-urban",
  "ruleVersion": "2024-11-07",
  "driverId": "c4b2e4a5-2bf0-4f43-90ef-dce0f4f551d1",
  "correlationId": "6d9f1b4f-4d23-4f3c-9286-9e663e6a0c3b",
  "recommendedDecision": "ACCEPT",
  "finalDecision": "ACCEPT",
  "mode": "hybrid_ml",
  "usedMl": true,
  "modelVersion": "ml-v2.3.1",
  "decision": {
    "netPayout": 26,
    "requiredDollars": 22,
    "projectedGrossPerHour": 48,
    "projectedNetPerHour": 46.2,
    "finishIso": "2025-01-09T16:00:00.000Z"
  },
  "explanation": {
    "code": "TARGET_RATE_HIT",
    "message": "Projected net $46.2/h exceeds $45/h target."
  }
}
```

### Errors
Every error returns the same shape so clients can inspect `code`, `message`, `correlationId`, and `retryable`.

```json
{
  "code": "string",
  "message": "human-friendly description",
  "correlationId": "uuid",
  "retryable": true
}
```

| Status | Meaning | Example code | Retry? |
| --- | --- | --- | --- |
| `400 Bad Request` | Validation failed in Fastify. | `invalid_payload` | no |
| `422 Unprocessable Entity` | Domain checks failed (`unknown_driver`, `ruleset_mismatch`). | no |
| `500 Internal Server Error` | Decision engine crashed. | `quote_service_error` | yes (after backoff) |
| `503 Service Unavailable` | Java or DB warming up. | `dependency_unavailable` | yes |

### Idempotency & retry guidance
- Fastify prefers the `Idempotency-Key` header and falls back to the `idempotencyKey` body field.
- Duplicate requests reuse the same rows and increment `decision_engine.quote.idempotency_hits` so metrics expose retries.
- Retry only when the `retryable` flag is `true` (500/503). Keep the original key until the request succeeds.

## Observability notes
- Fastify sets `x-correlation-id` in every response via `server/app.ts` and logs the value for each request.
- The Java quote service records `decision_engine.quote.compute_latency`, `decision_engine.quote.strategy_selection`, and `decision_engine.quote.idempotency_hits` (see `decision-engine/src/main/java/com/doordash/decider/metrics/QuoteMetrics.java`).
- `/metrics` is powered by Prometheus (Fastify uses `server/metrics.ts`, Spring Boot publishes Micrometer/Actuator endpoints).
- Logs carry `quoteId`, `ruleVersion`, `strategy`, and `correlationId` so you can trace “Why did the system recommend DECLINE?” by joining logs with `quote_assumptions`.
