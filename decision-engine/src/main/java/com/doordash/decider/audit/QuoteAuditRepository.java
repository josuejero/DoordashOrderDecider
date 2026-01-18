package com.doordash.decider.audit;

import com.doordash.decider.api.dto.QuoteRequest;
import com.doordash.decider.domain.QuoteResult;

import java.util.Optional;
import java.util.UUID;

public interface QuoteAuditRepository {

    Optional<PersistedQuote> findByIdempotencyKey(String idempotencyKey);

    PersistedQuote persist(
            QuoteRequest request,
            QuoteResult result,
            UUID quoteId,
            UUID correlationId,
            String idempotencyKey
    );
}
