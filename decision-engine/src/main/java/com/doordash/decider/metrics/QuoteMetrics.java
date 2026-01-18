package com.doordash.decider.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

@Component
public class QuoteMetrics {

    private final MeterRegistry meterRegistry;
    private final Timer quoteComputeTimer;

    public QuoteMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.quoteComputeTimer = Timer.builder("decision_engine.quote.compute_latency")
                .description("Duration spent computing a quote decision")
                .register(meterRegistry);
    }

    public Timer.Sample startQuoteComputeTimer() {
        return Timer.start(meterRegistry);
    }

    public void recordQuoteComputeLatency(Timer.Sample sample) {
        sample.stop(quoteComputeTimer);
    }

    public void recordStrategySelection(String strategyName) {
        meterRegistry.counter("decision_engine.quote.strategy_selection", "strategy", strategyName).increment();
    }
}
