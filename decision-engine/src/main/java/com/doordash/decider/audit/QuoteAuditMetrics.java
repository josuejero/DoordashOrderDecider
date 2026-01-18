package com.doordash.decider.audit;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class QuoteAuditMetrics {

    private final Counter idempotencyHitCounter;

    public QuoteAuditMetrics(MeterRegistry meterRegistry) {
        this.idempotencyHitCounter = Counter.builder("decision_engine.quote.idempotency_hits")
                .description("Duplicate quote requests detected by idempotency key")
                .register(meterRegistry);
    }

    public void recordIdempotencyHit() {
        idempotencyHitCounter.increment();
    }
}
