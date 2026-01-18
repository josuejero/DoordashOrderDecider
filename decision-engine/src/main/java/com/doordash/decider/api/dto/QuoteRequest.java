package com.doordash.decider.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record QuoteRequest(
        @NotBlank String offerId,
        @NotBlank String rulesetKey,
        @NotBlank String driverId,
        @NotNull @Positive BigDecimal payout,
        @NotNull @PositiveOrZero Double distanceMiles,
        @NotNull @Positive Integer estimatedMinutes,
        @NotNull @Positive BigDecimal targetHourlyRate,
        @NotNull @PositiveOrZero Integer availableMinutes,
        @NotBlank String shiftStartHHMM,
        @NotBlank String finishHHMM,
        @NotNull @PositiveOrZero BigDecimal earnedSoFar,
        @PositiveOrZero BigDecimal bufferMinutes,
        @PositiveOrZero BigDecimal costPerMile,
        String idempotencyKey
) {
}
