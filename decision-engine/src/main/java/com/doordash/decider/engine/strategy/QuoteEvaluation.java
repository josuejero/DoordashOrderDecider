package com.doordash.decider.engine.strategy;

import com.doordash.decider.domain.DecisionAction;
import com.doordash.decider.domain.ExplanationNode;
import com.doordash.decider.domain.QuoteDecision;

import java.util.List;
import java.util.Objects;

public record QuoteEvaluation(
        DecisionAction action,
        QuoteDecision decision,
        List<ExplanationNode> explanations
) {

    public QuoteEvaluation {
        Objects.requireNonNull(action, "decision action is required");
        Objects.requireNonNull(decision, "quote decision is required");
        Objects.requireNonNull(explanations, "explanations are required");
        explanations = List.copyOf(explanations);
    }
}
