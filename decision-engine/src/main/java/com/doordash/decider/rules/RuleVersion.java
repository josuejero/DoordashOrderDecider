package com.doordash.decider.rules;

import java.time.Instant;
import java.util.Objects;

public record RuleVersion(String version, Instant publishedAt) {

    public RuleVersion {
        Objects.requireNonNull(version, "version is required");
        Objects.requireNonNull(publishedAt, "publishedAt is required");
    }
}
