package com.doordash.decider.rules;

import java.time.Instant;
import java.util.Objects;

public record RuleSeedDefinition(
        String rulesetKey,
        String ruleVersion,
        Instant publishedAt,
        MarketRulesConfig config
) {

    public RuleSeedDefinition {
        Objects.requireNonNull(rulesetKey, "rulesetKey is required");
        Objects.requireNonNull(ruleVersion, "ruleVersion is required");
        Objects.requireNonNull(publishedAt, "publishedAt is required");
        Objects.requireNonNull(config, "config is required");
    }
}
