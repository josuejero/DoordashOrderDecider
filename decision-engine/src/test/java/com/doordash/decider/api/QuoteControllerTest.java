package com.doordash.decider.api;

import com.doordash.decider.api.dto.QuoteRequest;
import com.doordash.decider.api.dto.QuoteRequestConverter;
import com.doordash.decider.audit.PersistedQuote;
import com.doordash.decider.audit.QuoteAuditMetrics;
import com.doordash.decider.audit.QuoteAuditRepository;
import com.doordash.decider.domain.DecisionAction;
import com.doordash.decider.domain.ExplanationNode;
import com.doordash.decider.domain.QuoteDecision;
import com.doordash.decider.domain.QuoteResult;
import com.doordash.decider.rules.RuleVersion;
import com.doordash.decider.engine.DecisionStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.any;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuoteControllerTest {

    @Mock
    private DecisionStrategy decisionStrategy;
    @Mock
    private QuoteAuditRepository auditRepository;
    @Mock
    private QuoteAuditMetrics auditMetrics;

    private QuoteController controller;

    @BeforeEach
    void setUp() {
        controller = new QuoteController(decisionStrategy, auditRepository, auditMetrics);
    }

    @Test
    void returnsPersistedQuoteWhenIdempotencyKeyExists() {
        QuoteRequest request = createRequest();
        QuoteResult result = createResult(request);
        PersistedQuote persisted = new PersistedQuote(UUID.randomUUID(), result, "persisted-key");

        when(auditRepository.findByIdempotencyKey("persisted-key")).thenReturn(Optional.of(persisted));

        controller.quote(request, "persisted-key", "6d9f1b4f-4d23-4f3c-9286-9e663e6a0c3b");

        verify(decisionStrategy, never()).evaluate(any(), any(), anyString());
        verify(auditRepository, never()).persist(any(), any(), any(), any(), any());
        verify(auditMetrics).recordIdempotencyHit();
    }

    private QuoteRequest createRequest() {
        return new QuoteRequest(
                "offer-123",
                "default",
                "driver-1",
                BigDecimal.valueOf(32),
                4.5,
                15,
                BigDecimal.valueOf(28),
                60,
                "09:00",
                "10:00",
                BigDecimal.valueOf(100),
                BigDecimal.ZERO,
                BigDecimal.valueOf(0.8),
                null
        );
    }

    private QuoteResult createResult(QuoteRequest request) {
        QuoteDecision decision = new QuoteDecision(
                BigDecimal.valueOf(26),
                BigDecimal.valueOf(22),
                BigDecimal.valueOf(48),
                BigDecimal.valueOf(46.2),
                null
        );
        List<ExplanationNode> explanation = List.of(
                ExplanationNode.leaf("Reason", "rate target reached")
        );
        return new QuoteResult(
                QuoteRequestConverter.toOffer(request),
                QuoteRequestConverter.toDriverProfile(request),
                decision,
                DecisionAction.ACCEPT,
                explanation,
                request.rulesetKey(),
                new RuleVersion("v1.0.0", Instant.now(Clock.systemUTC())),
                Instant.now(Clock.systemUTC()),
                "test-strategy"
        );
    }
}
