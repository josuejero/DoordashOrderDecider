package com.doordash.decider.rules;

import java.math.BigDecimal;
import java.util.Objects;

public record MarketRules(
        String rulesetKey,
        RuleVersion version,
        DecisionThresholds thresholds,
        CostProfile costs,
        TimeRounding rounding,
        StrategyFlags strategy
) {

    public MarketRules {
        Objects.requireNonNull(rulesetKey, "rulesetKey is required");
        Objects.requireNonNull(version, "version is required");
        Objects.requireNonNull(thresholds, "thresholds are required");
        Objects.requireNonNull(costs, "cost profile is required");
        Objects.requireNonNull(rounding, "time rounding is required");
        Objects.requireNonNull(strategy, "strategy flags are required");
    }

    public static MarketRules fromConfig(String rulesetKey, RuleVersion version, MarketRulesConfig config) {
        return new MarketRules(
                rulesetKey,
                version,
                config.thresholds(),
                config.costs(),
                config.rounding(),
                config.strategy()
        );
    }

    public static record DecisionThresholds(BigDecimal acceptMultiplier, BigDecimal declineMultiplier) {
        public DecisionThresholds {
            Objects.requireNonNull(acceptMultiplier, "accept multiplier is required");
            Objects.requireNonNull(declineMultiplier, "decline multiplier is required");
            if (acceptMultiplier.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("accept multiplier must be positive");
            }
            if (declineMultiplier.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("decline multiplier must be positive");
            }
            if (declineMultiplier.compareTo(acceptMultiplier) >= 0) {
                throw new IllegalArgumentException("decline multiplier must be less than accept multiplier");
            }
        }

        public BigDecimal requiredRate(BigDecimal target) {
            return target.multiply(acceptMultiplier);
        }

        public BigDecimal rejectRate(BigDecimal target) {
            return target.multiply(declineMultiplier);
        }
    }

    public static record CostProfile(BigDecimal deadheadFactor, BigDecimal overheadFactor, BigDecimal defaultCostPerMile) {
        public CostProfile {
            Objects.requireNonNull(deadheadFactor, "deadhead factor is required");
            Objects.requireNonNull(overheadFactor, "overhead factor is required");
            Objects.requireNonNull(defaultCostPerMile, "default cost per mile is required");
            if (deadheadFactor.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("deadhead factor cannot be negative");
            }
            if (overheadFactor.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("overhead factor cannot be negative");
            }
            if (defaultCostPerMile.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("default cost per mile cannot be negative");
            }
        }

        public BigDecimal multiplier() {
            return BigDecimal.ONE.add(deadheadFactor).add(overheadFactor);
        }
    }

    public static record TimeRounding(int minutes) {
        public TimeRounding {
            if (minutes < 0) {
                throw new IllegalArgumentException("rounding minutes cannot be negative");
            }
        }
    }

    public static record StrategyFlags(boolean enableHybridMl, BigDecimal mlConfidenceThreshold) {
        public StrategyFlags {
            Objects.requireNonNull(mlConfidenceThreshold, "ml confidence threshold is required");
            if (mlConfidenceThreshold.compareTo(BigDecimal.ZERO) < 0
                    || mlConfidenceThreshold.compareTo(BigDecimal.ONE) > 0) {
                throw new IllegalArgumentException("ml confidence threshold must be between 0 and 1");
            }
        }
    }
}
