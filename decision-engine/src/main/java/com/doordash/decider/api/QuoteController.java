package com.doordash.decider.api;

import com.doordash.decider.api.dto.QuoteRequest;
import com.doordash.decider.api.dto.QuoteRequestConverter;
import com.doordash.decider.api.dto.QuoteResponse;
import com.doordash.decider.audit.PersistedQuote;
import com.doordash.decider.audit.QuoteAuditMetrics;
import com.doordash.decider.audit.QuoteAuditRepository;
import com.doordash.decider.domain.DriverProfile;
import com.doordash.decider.domain.Offer;
import com.doordash.decider.domain.QuoteResult;
import com.doordash.decider.engine.DecisionStrategy;
import com.doordash.decider.logging.QuoteLogContext;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.MDC;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/quote")
public class QuoteController {

    private static final String IDEMPOTENCY_HEADER = "Idempotency-Key";
    private static final String CORRELATION_HEADER = "X-Correlation-Id";
    private static final String MDC_CORRELATION_ID_KEY = "correlationId";
    private static final Logger log = LoggerFactory.getLogger(QuoteController.class);

    private final DecisionStrategy decisionStrategy;
    private final QuoteAuditRepository auditRepository;
    private final QuoteAuditMetrics auditMetrics;

    public QuoteController(
            DecisionStrategy decisionStrategy,
            QuoteAuditRepository auditRepository,
            QuoteAuditMetrics auditMetrics
    ) {
        this.decisionStrategy = decisionStrategy;
        this.auditRepository = auditRepository;
        this.auditMetrics = auditMetrics;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    public QuoteResponse quote(
            @Valid @RequestBody QuoteRequest request,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyHeader,
            @RequestHeader(value = CORRELATION_HEADER, required = false) String correlationHeader,
            HttpServletResponse response
    ) {
        String idempotencyKey = normalize(idempotencyHeader, request.idempotencyKey());
        UUID correlationId = parseCorrelation(correlationHeader);
        response.setHeader(CORRELATION_HEADER, correlationId.toString());
        MDC.put(MDC_CORRELATION_ID_KEY, correlationId.toString());
        try {
            if (idempotencyKey != null) {
                Optional<PersistedQuote> existing = auditRepository.findByIdempotencyKey(idempotencyKey);
                if (existing.isPresent()) {
                    auditMetrics.recordIdempotencyHit();
                    logQuote("returned (idempotent)", correlationId, existing.get());
                    return QuoteResponse.from(existing.get(), correlationId);
                }
            }

            Offer offer = QuoteRequestConverter.toOffer(request);
            DriverProfile profile = QuoteRequestConverter.toDriverProfile(request);
            QuoteResult result = decisionStrategy.evaluate(offer, profile, request.rulesetKey());
            UUID quoteId = UUID.randomUUID();

            PersistedQuote persisted = auditRepository.persist(
                    request,
                    result,
                    quoteId,
                    correlationId,
                    idempotencyKey
            );
            logQuote("evaluated", correlationId, persisted);
            return QuoteResponse.from(persisted, correlationId);
        } finally {
            MDC.remove(MDC_CORRELATION_ID_KEY);
        }
    }

    private void logQuote(String label, UUID correlationId, PersistedQuote persisted) {
        try (QuoteLogContext context = QuoteLogContext.open(persisted)) {
            QuoteResult result = persisted.result();
            log.info(
                    "Quote {} {} action={} ruleVersion={} strategy={} correlationId={}",
                    persisted.quoteId(),
                    label,
                    result.action(),
                    result.ruleVersion().version(),
                    result.strategyName(),
                    correlationId
            );
        }
    }

    private static String normalize(String header, String bodyValue) {
        String candidate = firstNonEmpty(header, bodyValue);
        return (candidate == null || candidate.isBlank()) ? null : candidate;
    }

    private static String firstNonEmpty(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private static UUID parseCorrelation(String header) {
        if (header == null || header.isBlank()) {
            return UUID.randomUUID();
        }
        try {
            return UUID.fromString(header);
        } catch (IllegalArgumentException ex) {
            return UUID.randomUUID();
        }
    }
}
