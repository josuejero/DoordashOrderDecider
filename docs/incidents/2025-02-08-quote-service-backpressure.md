# 2025-02-08 – quote service backpressure

## Summary
During a morning surge, `/api/quote` started returning 500s for `rulesetKey = sf-urban`. The frontend dashboard flashed “Unable to reach the decision engine” and First Response time rose 3× on Prometheus.

## Impact
- ~80% of quotes hitting `sf-urban` failed, so the PWA replay queue grew (visible as a spike in `decision_engine.quote.idempotency_hits`).
- Drivers saw “Try again later” while analytics readings lagged, which delayed post-shift reports.

## Root cause
The latest rule seed (v2025-02-08) had `enabled=false` in `rule_versions` because the manual migration script defaulted to disabled for staging. `RulesResolver.findLatest` threw `RulesetNotFoundException`, so Fastify surfaced a 500 before the request hit the heuristic. Logs show the correlation IDs from the frontend, and `quote_requests` held the raw payload even though `quote_results` stayed empty.

## Action items
1. Update the `rule_versions` row to `enabled=true` for `sf-urban`, restart the decision engine so it sees the new rows, and warm the Java cache with `curl` before drivers hit the zone.
2. Add a lint check that every new seed in `decision-engine/src/main/resources/rulesets` has `enabled` baked into the SQL migration (or script the INSERT with `enabled=true`).
3. Add a Grafana alert that watches for `RulesetNotFoundException` logs and a sustained `x-correlation-id` error spike so we can catch similar misconfigurations earlier.
