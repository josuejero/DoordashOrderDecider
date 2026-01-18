# Operations – secrets, ingress/HTTPS, observability, CI

## Secrets (SOPS / Sealed Secrets)
- Keep cleartext out of git. Base manifests show the shape (`infra/k8s/base/config.yaml`); for real environments create an overlay secret and encrypt it.
- **SOPS + age (recommended):**
  ```bash
  brew install sops age # or your package manager

  cat > infra/k8s/overlays/prod/secrets.enc.yaml <<'YAML'
  apiVersion: v1
  kind: Secret
  metadata:
    name: dd-db-secret
    namespace: dd-app
  stringData:
    DATABASE_URL: postgres://<user>:<pass>@<host>:5432/doordash_decider_prod
    DD_DECIDER_DATABASE_URL: postgres://<user>:<pass>@<host>:5432/doordash_decider_prod
    POSTGRES_USER: <user>
    POSTGRES_PASSWORD: <pass>
    POSTGRES_DB: doordash_decider_prod
  YAML

  # Encrypt in place; keep your age key out of the repo/CI
  SOPS_AGE_RECIPIENTS=age1... sops --encrypt --in-place infra/k8s/overlays/prod/secrets.enc.yaml
  ```
  Copy `.sops.example.yaml` to `.sops.yaml` with your recipient/team rules so everyone encrypts consistently, and point CI to the age key via a secret.
- **Sealed Secrets (K8s-native):**
  ```bash
  kubeseal --controller-namespace kube-system --format yaml \
    < infra/k8s/overlays/prod/secrets.enc.yaml \
    > infra/k8s/overlays/prod/sealed-secrets.yaml
  ```
  Then reference the sealed secret in your overlay `kustomization.yaml`.

## Ingress and HTTPS
- `infra/k8s/base/ingress.yaml` carries NGINX Ingress rules for API/ML + Grafana/BI with TLS enforced.
- `infra/k8s/base/tls.yaml` provisions self-signed certs via cert-manager; swap DNS names/issuer for your real domains.
- Terraform/Tofu bootstrap for cert-manager lives in `infra/tofu/cert-manager.tf`.
- Local: Docker Compose serves the frontend behind Nginx; for HTTPS, add a cert to `infra/docker/nginx-frontend.conf` or terminate at a reverse proxy in front of Compose.

## Observability
- Metrics: `/metrics` on API and ML (`prom-client`) plus the Java decision engine `/actuator/prometheus` → `infra/observability/prometheus.yml` now scrapes backend/ML plus `host.docker.internal:8080` (the local Java service) when Compose runs with the observability stack.
- Dashboards: Grafana is pre-provisioned with Prometheus (and Loki when enabled) under `infra/observability/grafana/datasources/`.
- Logs: Loki + Promtail (Docker Compose `--profile observability`) tails container logs; K8s uses the `loki-stack` Helm release in `infra/tofu/observability.tf`.
- Health: `/health` on API/ML double as readiness probes; BI/DB endpoints have their own native health checks.

## CI coverage (`.github/workflows/ci.yml`)
- Postgres service + `npm run db:migrate:test` for migration smoke.
- JS/TS: lint, unit tests with coverage, client/server builds.
- Python ML service: `black --check` and `pytest ml-service/tests`.
- Docker image builds for frontend/server/ml to catch Dockerfile regressions.
- Frontend dist uploaded as an artifact for previews.
