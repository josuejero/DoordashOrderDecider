# Rule configuration & versioning
Rules live in `decision-engine/src/main/resources/rulesets` as JSON seed files (`RuleSeedDefinition`). Each seed contains a `rulesetKey`, a semantically versioned `ruleVersion`, and a `config` block with `thresholds`, `costs`, `rounding`, and `strategy` flags.

## Version metadata
- The Java service persists each seed inside `rule_versions` (`decision-engine/src/main/resources/db/migration/V1__init.sql`).
- Rows hold `ruleset_key`, `rule_version`, `published_at`, `config`, and an `enabled` flag to gate gradual rollouts.
- `JdbcRuleRepository.save` avoids duplicates by checking the `(ruleset_key, rule_version)` unique constraint.

## Rule selection
`RulesResolver` loads the latest enabled row per `rulesetKey`. When `decision-engine` evaluates a quote it builds a `MarketRules` value object (thresholds, cost profile, rounding, strategy) that the selected `QuoteStrategy` consumes.

## Deploying new versions
1. Create a new JSON seed in `decision-engine/src/main/resources/rulesets` or insert the same payload directly into `rule_versions`.
2. Update `ruleVersion` and `publishedAt` so teams can trace when the configuration changed.
3. `MarketRuleSeedLoader` automatically reads `classpath*:rulesets/*.json` on startup, which means a new Spring Boot deployment can seed the new row without code changes.
4. Use the `enabled` flag in the database if you need to roll back quickly: setting it to `false` removes it from `findLatest` without deleting history.

## Strategy knobs
- `thresholds.acceptMultiplier` and `.declineMultiplier` scale the driver target rate to compute required/ rejection bands.
- `costs` include `deadheadFactor`, `overheadFactor`, and `defaultCostPerMile` plus a multiplier for variable cost.
- `rounding.minutes` controls how many minutes the strategy rounds up the time window.
- `strategy.enableHybridMl` toggles whether ML is invited into scoring and `mlConfidenceThreshold` governs how much the heuristic trusts the model.

Any change to these knobs increments the `ruleVersion` so clients of `/api/quote` know which rules produced each recommendation.
