package com.doordash.decider.rules;

import java.util.Objects;

public record MarketRulesConfig(
        MarketRules.DecisionThresholds thresholds,
        MarketRules.CostProfile costs,
        MarketRules.TimeRounding rounding,
        MarketRules.StrategyFlags strategy
) {

    public MarketRulesConfig {
        Objects.requireNonNull(thresholds, "thresholds are required");
        Objects.requireNonNull(costs, "cost profile is required");
        Objects.requireNonNull(rounding, "time rounding is required");
        Objects.requireNonNull(strategy, "strategy flags are required");
    }
}
