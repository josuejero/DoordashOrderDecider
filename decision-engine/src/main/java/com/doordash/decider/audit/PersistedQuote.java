package com.doordash.decider.audit;

import com.doordash.decider.domain.QuoteResult;

import java.util.UUID;

public record PersistedQuote(
        UUID quoteId,
        QuoteResult result,
        String idempotencyKey
) {
}
