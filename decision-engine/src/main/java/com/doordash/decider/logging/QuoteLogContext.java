package com.doordash.decider.logging;

import com.doordash.decider.audit.PersistedQuote;
import org.slf4j.MDC;

public final class QuoteLogContext implements AutoCloseable {

    private static final String QUOTE_ID_KEY = "quoteId";
    private static final String RULE_VERSION_KEY = "ruleVersion";
    private static final String STRATEGY_KEY = "strategy";

    private QuoteLogContext() {
    }

    public static QuoteLogContext open(PersistedQuote persisted) {
        MDC.put(QUOTE_ID_KEY, persisted.quoteId().toString());
        MDC.put(RULE_VERSION_KEY, persisted.result().ruleVersion().version());
        MDC.put(STRATEGY_KEY, persisted.result().strategyName());
        return new QuoteLogContext();
    }

    @Override
    public void close() {
        MDC.remove(QUOTE_ID_KEY);
        MDC.remove(RULE_VERSION_KEY);
        MDC.remove(STRATEGY_KEY);
    }
}
