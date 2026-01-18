package com.doordash.decider.rules;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Objects;

public record RuleSeed(
        String rulesetKey,
        RuleVersion version,
        String config
) {

    public RuleSeed {
        Objects.requireNonNull(rulesetKey, "rulesetKey is required");
        Objects.requireNonNull(version, "version is required");
        Objects.requireNonNull(config, "config is required");
    }

    public static RuleSeed from(RuleSeedDefinition definition, ObjectMapper objectMapper) {
        try {
            String payload = objectMapper.writeValueAsString(definition.config());
            return new RuleSeed(
                    definition.rulesetKey(),
                    new RuleVersion(definition.ruleVersion(), definition.publishedAt()),
                    payload
            );
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize rule seed config", e);
        }
    }
}
