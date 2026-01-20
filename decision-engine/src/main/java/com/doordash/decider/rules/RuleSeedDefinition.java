package com.doordash.decider.rules;

import com.fasterxml.jackson.annotation.JsonAlias;

import java.time.Instant;
import java.util.Objects;

public record RuleSeedDefinition(
        @JsonAlias("ruleset_key") String rulesetKey,
        @JsonAlias("rule_version") String ruleVersion,
        @JsonAlias("published_at") Instant publishedAt,
        MarketRulesConfig config
) {

    public RuleSeedDefinition {
        Objects.requireNonNull(rulesetKey, "rulesetKey is required");
        Objects.requireNonNull(ruleVersion, "ruleVersion is required");
        Objects.requireNonNull(publishedAt, "publishedAt is required");
        Objects.requireNonNull(config, "config is required");
    }
}
