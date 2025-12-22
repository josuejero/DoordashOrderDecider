
# DoorDash Order Decider

[![CI](https://github.com/josuejero/cashsim/actions/workflows/ci.yml/badge.svg)](https://github.com/josuejero/DoorDashOrderDecider/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-informational.svg)](#)
[![Live App](https://img.shields.io/badge/app-live-brightgreen.svg)](https://doordash-order-decider.vercel.app/)


A full-stack decision-support app for gig-delivery drivers: enter an offer (payout, miles, projected finish time) and get an **ACCEPT / REJECT** recommendation based on a target hourly rate. Includes an **offline-first UI**, an API that logs outcomes to Postgres for **analytics**, and an optional **hybrid ML** mode powered by a FastAPI microservice.

**Disclaimer:** Independent portfolio project; not affiliated with DoorDash. Offers are entered manually. Any data is stored only in your own database.

> Built to showcase product-minded engineering across **frontend**, **backend**, **data/ML**, and **DevOps/cloud** disciplines.

---

## Why this exists

Delivery offers are often evaluated under time pressure with incomplete information. This project turns that “mental math” into a repeatable workflow:

- **Heuristic mode**: deterministic rules + explanations (works offline)
- **Hybrid ML mode**: combines heuristics with a model-based estimate of effective hourly rate
- **Analytics**: captures decisions and outcomes to support performance reviews and retraining

---

## Key features

- **Decision engine** (shared between client + server): computes effective hourly rate, recommends accept/reject, and emits reason codes.
- **Two modes**
  - `heuristic` – local, offline-safe
  - `hybrid_ml` – calls ML service for a predicted effective hourly rate (toggleable)
- **Offline-first UX**
  - queues evaluations in IndexedDB while offline
  - syncs when connectivity returns
- **Analytics UI + API**
  - summary cards and drilldowns (feature-flagged)
  - star-schema style fact tables for decisions/orders/shifts
- **Observability**
  - Prometheus metrics endpoint on the backend (`/metrics`)
  - Kubernetes manifests include scrape annotations

---

## Tech stack

**Frontend**

* React + TypeScript + Vite
* Vitest unit tests + Playwright E2E
* Offline queue via IndexedDB

**Backend**

* Fastify (Node/TypeScript), Zod validation
* Postgres + migrations (`node-pg-migrate`)
* Prometheus metrics via `prom-client`

**ML service**

* FastAPI + Pydantic (Python)
* scikit-learn model persisted with `joblib`
* Training data sourced from Postgres analytics tables

**Infra**

* Dockerfiles for frontend, backend, and ML service
* Kubernetes manifests (Kustomize) for app + database + retraining CronJob
* OpenTofu (Terraform-compatible) + Helm for cluster add-ons and observability

---

## Repo layout

* `src/` – React app + shared decision logic (`src/lib/decision.*`)
* `server/` – Fastify API, analytics routes, DB access layer, metrics
* `ml_service/` – FastAPI ML microservice (predict + metadata + training)
* `migrations/` – Postgres migrations (schema + analytics tables)
* `infra/`

  * `docker/` – Dockerfiles + nginx config
  * `k8s/` – Kustomize base manifests (app, ML, Postgres, ingress, observability)
  * `tofu/` – OpenTofu IaC for namespaces + Helm-installed observability stack
* `e2e/` – Playwright end-to-end tests

---

## Quick start (local)

### Prerequisites

* Node.js 20+
* Python 3.12+
* Postgres 14+ running locally

### 1) Install dependencies

```bash
npm install
python -m venv .venv && source .venv/bin/activate
pip install -r ml_service/requirements.txt
```

### 2) Configure your database

Create two databases (dev + test), then export URLs (examples shown):

```bash
export DD_DECIDER_DEV_DB_URL="postgres://localhost:5432/doordash_decider_dev"
export DD_DECIDER_TEST_DB_URL="postgres://localhost:5432/doordash_decider_test"
```

Run migrations + seed data:

```bash
npm run db:migrate
npm run db:seed
```

### 3) Start services (three terminals)

Backend:

```bash
npm run dev:server
```

Frontend (Vite):

```bash
npm run dev
```

ML service (optional; enables `hybrid_ml`):

```bash
uvicorn ml_service.main:app --reload --host 0.0.0.0 --port 8000
```

Open the app at:

* Frontend: `http://localhost:5173`
* Backend: `http://localhost:4000`
* ML service: `http://localhost:8000`

---

## Configuration

| Variable                   |                                           Default | Purpose                    |
| -------------------------- | ------------------------------------------------: | -------------------------- |
| `DD_DECIDER_API_PORT`      |                                            `4000` | backend port               |
| `DD_DECIDER_DEV_DB_URL`    |  `postgres://localhost:5432/doordash_decider_dev` | dev DB                     |
| `DD_DECIDER_TEST_DB_URL`   | `postgres://localhost:5432/doordash_decider_test` | test DB                    |
| `DATABASE_URL`             |                     (falls back to dev/test URLs) | override DB URL            |
| `ENABLE_ANALYTICS_API`     |                                            `true` | enable analytics endpoints |
| `ENABLE_HYBRID_ML`         |                                           `false` | enable hybrid mode in API  |
| `ML_SERVICE_URL`           |                           `http://localhost:8000` | ML service base URL        |
| `ML_SERVICE_TIMEOUT_MS`    |                                              `75` | request timeout            |
| `VITE_ENABLE_ANALYTICS_UI` |                                            `true` | show/hide analytics UI     |

---

## API endpoints (high level)

* `GET /health` – liveness/readiness
* `GET /metrics` – Prometheus metrics
* `POST /api/orders/evaluate` – log an evaluated offer + decision
* `GET /api/analytics/summary` – rollups (acceptance rate, hourly, miles/time, etc.)
* `GET /api/model/metadata` – ML model metadata passthrough
* `POST /api/model/predict` – ML prediction passthrough

---

## Model training

The ML service includes a simple training script that pulls labeled examples from Postgres:

```bash
export DD_DECIDER_DATABASE_URL="$DD_DECIDER_DEV_DB_URL"
python -m ml_service.train
```

This produces/updates `ml_service/model.pkl` (or the configured `MODEL_PATH` if you set it in the environment).

---

## Testing

Unit tests:

```bash
npm test
```

Server tests:

```bash
npm run test:coverage
```

E2E (requires frontend + backend running):

```bash
npm run test:e2e
```

---

## Deployment notes

### Docker

* `infra/docker/Dockerfile.frontend` – builds the static UI served by nginx
* `infra/docker/Dockerfile.server` – builds the Fastify API
* `infra/docker/Dockerfile.ml` – builds the FastAPI ML service

### Kubernetes

Kustomize base lives in `infra/k8s/base/` and includes Postgres, backend, ML service, a retraining CronJob, ingress, and observability wiring.

### Infrastructure as Code

`infra/tofu/` uses OpenTofu (Terraform-compatible) with Kubernetes + Helm providers to provision namespaces and install observability components.

---

## Role-focused highlights

* **Software engineer / developer**

  * shared business logic (client + server), strong typing, validation, tests, clean layering
* **AI / ML engineer**

  * separate prediction service, model artifact persistence, retraining CronJob, metadata endpoint for debugging
* **Data scientist**

  * feature engineering from a structured analytics schema, reproducible training script, evaluation hooks
* **Data analyst**

  * analytics endpoints, rollup metrics (acceptance rate, effective hourly, miles/time), star-schema-style fact tables
* **DevOps / cloud engineer**

  * multi-stage Docker builds, Kubernetes manifests (readiness/liveness), IaC via OpenTofu, Prometheus/Grafana-friendly instrumentation

---

## License

MIT (see `LICENSE`).
