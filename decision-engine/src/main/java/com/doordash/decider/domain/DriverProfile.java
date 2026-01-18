package com.doordash.decider.domain;

import java.math.BigDecimal;
import java.util.Objects;

public record DriverProfile(String id, BigDecimal targetHourlyRate, int availableMinutes) {

    public DriverProfile {
        Objects.requireNonNull(id, "driver id is required");
        Objects.requireNonNull(targetHourlyRate, "target hourly rate is required");
        if (targetHourlyRate.signum() <= 0) {
            throw new IllegalArgumentException("target hourly rate must be positive");
        }
        if (availableMinutes < 0) {
            throw new IllegalArgumentException("available minutes cannot be negative");
        }
    }
}
