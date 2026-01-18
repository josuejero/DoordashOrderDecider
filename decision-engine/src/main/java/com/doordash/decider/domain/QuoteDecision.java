package com.doordash.decider.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

public record QuoteDecision(
        BigDecimal netPayout,
        BigDecimal requiredDollars,
        BigDecimal projectedGrossPerHour,
        BigDecimal projectedNetPerHour,
        Instant finishIso
) {

    public QuoteDecision {
        Objects.requireNonNull(netPayout, "net payout is required");
        Objects.requireNonNull(requiredDollars, "required dollars is required");
        Objects.requireNonNull(projectedGrossPerHour, "projected gross per hour is required");
        Objects.requireNonNull(projectedNetPerHour, "projected net per hour is required");
    }
}
