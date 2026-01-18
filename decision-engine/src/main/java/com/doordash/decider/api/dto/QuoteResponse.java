package com.doordash.decider.api.dto;

import com.doordash.decider.audit.PersistedQuote;
import com.doordash.decider.domain.DecisionAction;
import com.doordash.decider.domain.ExplanationNode;
import com.doordash.decider.domain.QuoteDecision;
import com.doordash.decider.domain.QuoteResult;
import com.doordash.decider.rules.RuleVersion;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QuoteResponse(
        UUID quoteId,
        String offerId,
        String driverId,
        String rulesetKey,
        DecisionAction decision,
        QuoteDecision quoteDecision,
        RuleVersion ruleVersion,
        Instant evaluatedAt,
        List<ExplanationNode> explanations,
        UUID correlationId
) {

    public static QuoteResponse from(QuoteResult result, UUID quoteId, UUID correlationId) {
        return new QuoteResponse(
                quoteId,
                result.offer().id(),
                result.profile().id(),
                result.rulesetKey(),
                result.action(),
                result.decision(),
                result.ruleVersion(),
                result.evaluatedAt(),
                result.explanations(),
                correlationId
        );
    }

    public static QuoteResponse from(PersistedQuote persisted, UUID correlationId) {
        return from(persisted.result(), persisted.quoteId(), correlationId);
    }
}
