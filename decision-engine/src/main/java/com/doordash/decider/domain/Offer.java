package com.doordash.decider.domain;

import java.math.BigDecimal;
import java.util.Objects;

public record Offer(
        String id,
        BigDecimal payout,
        double distanceMiles,
        int estimatedMinutes,
        BigDecimal earnedSoFar,
        String shiftStartHHMM,
        String finishHHMM,
        BigDecimal bufferMinutes,
        BigDecimal costPerMile
) {

    public Offer {
        Objects.requireNonNull(id, "offer id is required");
        Objects.requireNonNull(payout, "payout is required");
        Objects.requireNonNull(earnedSoFar, "earnedSoFar is required");
        Objects.requireNonNull(shiftStartHHMM, "shiftStartHHMM is required");
        Objects.requireNonNull(finishHHMM, "finishHHMM is required");
        if (payout.signum() <= 0) {
            throw new IllegalArgumentException("payout must be positive");
        }
        if (distanceMiles < 0) {
            throw new IllegalArgumentException("distance cannot be negative");
        }
        if (estimatedMinutes <= 0) {
            throw new IllegalArgumentException("estimated minutes must be positive");
        }
        bufferMinutes = bufferMinutes == null ? BigDecimal.ZERO : bufferMinutes;
        costPerMile = costPerMile == null ? BigDecimal.ZERO : costPerMile;
    }
}
