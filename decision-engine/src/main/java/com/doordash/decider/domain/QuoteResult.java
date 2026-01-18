package com.doordash.decider.domain;

import com.doordash.decider.rules.RuleVersion;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

public record QuoteResult(
        Offer offer,
        DriverProfile profile,
        QuoteDecision decision,
        DecisionAction action,
        List<ExplanationNode> explanations,
        String rulesetKey,
        RuleVersion ruleVersion,
        Instant evaluatedAt,
        String strategyName
) {

    public QuoteResult {
        Objects.requireNonNull(offer, "offer is required");
        Objects.requireNonNull(profile, "driver profile is required");
        Objects.requireNonNull(decision, "decision payload is required");
        Objects.requireNonNull(action, "decision action is required");
        Objects.requireNonNull(explanations, "explanations are required");
        Objects.requireNonNull(rulesetKey, "ruleset key is required");
        Objects.requireNonNull(ruleVersion, "rule version is required");
        Objects.requireNonNull(evaluatedAt, "evaluation timestamp is required");
        Objects.requireNonNull(strategyName, "strategy name is required");
    }
}
