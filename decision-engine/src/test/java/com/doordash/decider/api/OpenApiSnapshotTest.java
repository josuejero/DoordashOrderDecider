package com.doordash.decider.api;

import com.doordash.decider.audit.PersistedQuote;
import com.doordash.decider.audit.QuoteAuditRepository;
import com.doordash.decider.api.dto.QuoteRequest;
import com.doordash.decider.domain.DecisionAction;
import com.doordash.decider.domain.ExplanationNode;
import com.doordash.decider.domain.QuoteDecision;
import com.doordash.decider.domain.QuoteResult;
import com.doordash.decider.engine.DecisionStrategy;
import com.doordash.decider.rules.MarketRuleSeedLoader;
import com.doordash.decider.rules.RuleVersion;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.ResponseEntity;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@SpringBootTest(webEnvironment = RANDOM_PORT)
@MockBean(MarketRuleSeedLoader.class)
@TestPropertySource(properties = "spring.flyway.enabled=false")
class OpenApiSnapshotTest {

    private static final String SNAPSHOT = "openapi-golden.json";

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void apiDocsMatchesSnapshot() throws IOException {
        ResponseEntity<JsonNode> response = restTemplate.getForEntity("/v3/api-docs", JsonNode.class);
        assertEquals(200, response.getStatusCodeValue());
        JsonNode actual = sanitize(response.getBody());
        JsonNode expected = sanitize(loadFixture(SNAPSHOT));
        assertEquals(expected, actual);
    }

    private JsonNode loadFixture(String path) throws IOException {
        try (var stream = getClass().getClassLoader().getResourceAsStream(path)) {
            if (stream == null) {
                throw new IOException("Missing fixture: " + path);
            }
            return objectMapper.readTree(stream);
        }
    }

    private JsonNode sanitize(JsonNode source) throws IOException {
        if (source == null) {
            throw new IOException("OpenAPI response was empty");
        }
        JsonNode clone = objectMapper.readTree(objectMapper.writeValueAsString(source));
        if (clone instanceof ObjectNode objectNode) {
            objectNode.remove("servers");
        }
        return clone;
    }

    @TestConfiguration
    static class OpenApiTestConfig {

        @Bean
        MeterRegistry meterRegistry() {
            return new SimpleMeterRegistry();
        }

        @Bean
        @Primary
        DecisionStrategy decisionStrategy() {
            return (offer, profile, rulesetKey) -> {
                QuoteDecision decision = new QuoteDecision(
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        null
                );
                return new QuoteResult(
                        offer,
                        profile,
                        decision,
                        DecisionAction.ACCEPT,
                        List.of(ExplanationNode.leaf("openapi", "snapshot")),
                        rulesetKey,
                        new RuleVersion("v0.0.0", Instant.EPOCH),
                        Instant.EPOCH,
                        "test-strategy"
                );
            };
        }

        @Bean
        @Primary
        QuoteAuditRepository quoteAuditRepository() {
            return new QuoteAuditRepository() {
                @Override
                public Optional<PersistedQuote> findByIdempotencyKey(String idempotencyKey) {
                    return Optional.empty();
                }

                @Override
                public PersistedQuote persist(QuoteRequest request, QuoteResult result, UUID quoteId, UUID correlationId, String idempotencyKey) {
                    return new PersistedQuote(quoteId, result, idempotencyKey);
                }
            };
        }
    }
}
