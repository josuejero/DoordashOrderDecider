# DoorDashDecider – Architecture Overview (Phase 0)

## Context

- **Client:** PWA (Vite 7 + React 19 + TS + Tailwind 4).
- **Backend API:** Node.js 20 + Fastify + TypeScript.
- **Data:** PostgreSQL (transactional store) used by backend.
- **Future ML Service:** Python + FastAPI (separate service) for model training/serving.
- **Analytics (Future):** DuckDB + Superset/Metabase over Postgres snapshots.

## High-Level Diagram (text)

PWA (browser) ──HTTP──▶ Fastify API ──SQL──▶ Postgres
                                  ▲
                                  │ (future)
                         ML Service (FastAPI)

## Core Domain Model (Phase 0)

- **Driver**
  - id, name/alias, targetRatePerHour, vehicleType
  - fuelCostPerUnit, maintenancePerMile, preferredZones/Times
- **Order**
  - id, driverId, platform, payout, miles, estimatedMinutes, timestamps
- **Decision**
  - id, orderId, driverId, accept (boolean)
  - netPayout, requiredDollars, projectedGrossPerHour, projectedNetPerHour
  - finishIso, createdAt
- **DecisionEvent (logging)**
  - id, decisionId, eventType, payload, createdAt

Phase 0 implements:
- DB schema for these tables.
- Minimal repositories and seeds.
- No ML or analytics yet.
