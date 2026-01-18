# Decision Engine API (Phase 1)

This document defines the single microservice contract that the rest of the system depends on, makes retries safe with idempotency, and keeps failures predictable with a typed error model.

## Contract at a glance
- **Endpoint:** `POST /quote`
- **Purpose:** Return a decision quote for a proposed order so the PWA can render a recommendation and persist the result in its local queue.
- **Versioning:** Every response (success or error) carries a `ruleVersion` value. The request carries a `rulesetKey` so the quote service can route to the correct market/profile logic.
- **Correlation:** `X-Correlation-Id` is accepted from the PWA, forwarded through Fastify to the Java quote service, and echoed back so UI, logs, and metrics all share the same trace.
- **Idempotency:** `Idempotency-Key` is supported as a request header (preferred) and also via an optional `idempotencyKey` field in the body for backwards compatibility with existing clients.
- **Persistence:** The service writes raw payloads + metadata to `quote_requests`, `quote_results`, and `quote_assumptions` while `rule_versions` captures the selected rule metadata so every quote is auditable.

## Request

### Headers
- `Content-Type: application/json`
- `Accept: application/json`
- `Idempotency-Key: <opaque string>` (preferred; replay-safe)
- `X-Correlation-Id: <UUID>` (if missing, Fastify generates one and returns it in every response)

### Body schema (validated by Fastify before contacting Java)
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `rulesetKey` | string | yes | Identifies the driver profile/market; used to select the rule set. |
| `driverId` | string (UUID) | yes | Persisted driver profile key. |
| `platform` | string | yes | e.g., `"doordash"`. Fastify can default this if omitted. |
| `targetRatePerHour` | number | yes | Driver target run rate. |
| `shiftStartHHMM` | string | yes | Local HHMM of the shift start. |
| `finishHHMM` | string | yes | Hop finish time. |
| `earnedSoFar` | number | yes | Amount earned before the quoted order. |
| `offerPayout` | number | yes | Base payout for this offer. |
| `miles` | number | no | Estimated miles for this offer. |
| `costPerMile` | number | no | Driver cost model. |
| `bufferMinutes` | number | no | Additional padding minutes. |
| `pickupStoreType` | string | no | e.g., `"grocery"`. |
| `pickupLocation` | string | no | e.g., `"123 Main St"`. |
| `dropoffZone` | string | no | e.g., `"Downtown"`. |
| `zoneName`, `zoneCity`, `zoneRegion` | string | no | Optional zone metadata used for analytics. |
| `finalDecision` | enum(`"ACCEPT"`, `"REJECT"`) | no | When the PWA already decided; quote should still be recorded. |
| `idempotencyKey` | string | no | Fallback when headers are stripped; Fastify and Java deduplicate using this value. |

Fastify uses a `zod` schema (or similar) to validate the full payload before instantiating the Java quote request, guaranteeing consistent input.

### Example request
```json
POST /quote HTTP/1.1
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

Every 2xx response includes `ruleVersion` and echoes `rulesetKey`, `driverId`, and `correlationId`. The payload mirrors what Fastify already builds today so the UI can render no matter whether Java or Fastify is generating the quote.

Repeated submissions using the same idempotency key return the persisted `quoteId`/result, keep the response body identical, and increment the `decision_engine.quote.idempotency_hits` metric so retries stay detectable without duplicating rows.

### Success payload
```json
HTTP/1.1 200 OK
Content-Type: application/json

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

## Error model
All error responses use the same typed payload so clients can reliably inspect `code`, `message`, `correlationId`, and `retryable`.

```json
{
  "code": "string",
  "message": "human-friendly description",
  "correlationId": "uuid",
  "retryable": true
}
```

| Status | Meaning | Example `code` | When to retry |
| --- | --- | --- | --- |
| `400 Bad Request` | Payload validation failed (Fastify schema). | `invalid_payload` | **no** — fix the request.
| `422 Unprocessable Entity` | Domain-level errors (e.g., driver unknown, ruleset mismatch, or business gating). | `unknown_driver` | **no** unless the condition changes.
| `500 Internal Server Error` | Unexpected failure within Fastify/Java. | `quote_service_error` | **yes**, once after a short backoff (retryable: true) because the request may succeed on the next attempt.
| `503 Service Unavailable` | Downstream dependency still warming up (database, Java, etc.). | `dependency_unavailable` | **yes**, use exponential backoff.

### Example error payloads
#### 400 Bad Request
```json
HTTP/1.1 400 Bad Request
{
  "code": "invalid_payload",
  "message": ""targetRatePerHour" must be a positive number.",
  "correlationId": "6d9f1b4f-4d23-4f3c-9286-9e663e6a0c3b",
  "retryable": false
}
```

#### 422 Unprocessable Entity
```json
HTTP/1.1 422 Unprocessable Entity
{
  "code": "unknown_driver",
  "message": "Driver c4b2e4a5-... does not exist.",
  "correlationId": "6d9f1b4f-4d23-4f3c-9286-9e663e6a0c3b",
  "retryable": false
}
```

#### 500 Internal Server Error
```json
HTTP/1.1 500 Internal Server Error
{
  "code": "quote_service_error",
  "message": "Failed to execute rules against ruleset sf-urban.",
  "correlationId": "6d9f1b4f-4d23-4f3c-9286-9e663e6a0c3b",
  "retryable": true
}
```

#### 503 Service Unavailable
```json
HTTP/1.1 503 Service Unavailable
{
  "code": "dependency_unavailable",
  "message": "Java decision engine is starting up.",
  "correlationId": "6d9f1b4f-4d23-4f3c-9286-9e663e6a0c3b",
  "retryable": true
}
```

## Idempotency and retry guidance
- **Idempotency keys**: Clients SHOULD provide a stable key per driver/order combination. Fastify deduplicates requests by `Idempotency-Key` header first, then by the `idempotencyKey` body field as a fallback for older clients or request transformations.
- **Safe retries**: Retry only when the error payload sets `retryable: true` (i.e., 500/503). Fastify records the idempotency key and correlation id so repeated requests before the timeout return the same response.
- **Client best practice**: Store the idempotency key on the client side until the request succeeds so you can replay the same key after a transient failure without generating duplicate quotes.

## Observability
- `/actuator/health` and `/actuator/prometheus` are exposed so probes and Prometheus scrapers can reach the quote service directly.
- Metrics surface three decision-specific meters: the `decision_engine.quote.compute_latency` timer tracks how long evaluations take, `decision_engine.quote.strategy_selection` counts which strategy was chosen (`strategy` tag), and `decision_engine.quote.idempotency_hits` highlights duplicate submissions.
- Logs now carry structured fields for `correlationId`, `quoteId`, `ruleVersion`, and `strategy`, making it possible to trace “Why did the system recommend DECLINE?” using logs + audit rows + the explanation tree persisted in `quote_assumptions`.

## Compatibility rules
1. **Schema validation**: Fastify validates the request via `zod` (or equivalent) before hitting the Java service, so Java can assume well-formed payloads.
2. **Correlation**: Fastify forwards `X-Correlation-Id` to Java and relays it back in the response; every log/metric slice and the error payload include it.
3. **Rule metadata**: Java pairs a response with `ruleVersion`, and Fastify mirrors that into every success or error response so clients know which rules produced the quote.
4. **Ruleset dispatch**: `rulesetKey` is required—Fastify uses it to select the right Java grouping and also records it in the response for telemetry.
5. **Rules configuration**: Java resolves the `rulesetKey` against the `rule_versions` table (JSON config + version metadata). Seed files live in `decision-engine/src/main/resources/rulesets`, and new rows can be inserted/updated in the DB to safely roll out new rule versions without changing the Java code.

## Mocking the Java service for the UI
- Until Java is available, Fastify can call a mocked endpoint that returns the JSON seen in the success example above. The UI simply renders the `decision`, `explanation`, and `recommendedDecision` fields as it does today.
- Ensure the mock obeys the same error shapes so any retry logic in the UI can be exercised end-to-end.
