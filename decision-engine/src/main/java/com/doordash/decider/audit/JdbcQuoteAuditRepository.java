package com.doordash.decider.audit;

import com.doordash.decider.api.dto.QuoteRequest;
import com.doordash.decider.api.dto.QuoteRequestConverter;
import com.doordash.decider.domain.DecisionAction;
import com.doordash.decider.domain.ExplanationNode;
import com.doordash.decider.domain.QuoteDecision;
import com.doordash.decider.domain.QuoteResult;
import com.doordash.decider.rules.RuleVersion;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcQuoteAuditRepository implements QuoteAuditRepository {

    private static final String INSERT_REQUEST_SQL = """
            INSERT INTO quote_requests (
                quote_id,
                ruleset_key,
                driver_id,
                offer_id,
                correlation_id,
                idempotency_key,
                request_payload,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private static final String INSERT_RESULT_SQL = """
            INSERT INTO quote_results (
                quote_id,
                ruleset_key,
                rule_version,
                rule_published_at,
                decision_action,
                decision_payload,
                explanation_payload,
                evaluated_at,
                strategy_name,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private static final String INSERT_ASSUMPTION_SQL = """
            INSERT INTO quote_assumptions (quote_id, source, assumption_key, assumption_value, created_at)
            VALUES (?, ?, ?, ?, ?)
            """;

    private static final String SELECT_BY_IDEMPOTENCY_KEY = """
            SELECT
                qr.quote_id,
                qr.idempotency_key,
                qr.request_payload,
                res.ruleset_key,
                res.rule_version,
                res.rule_published_at,
                res.decision_action,
                res.decision_payload,
                res.explanation_payload,
                res.strategy_name,
                res.evaluated_at
            FROM quote_requests qr
            JOIN quote_results res ON res.quote_id = qr.quote_id
            WHERE qr.idempotency_key = ?
            ORDER BY qr.created_at DESC
            LIMIT 1
            """;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final QuoteAuditMetrics metrics;

    public JdbcQuoteAuditRepository(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            Clock clock,
            QuoteAuditMetrics metrics
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.metrics = metrics;
    }

    @Override
    public Optional<PersistedQuote> findByIdempotencyKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(
                    jdbcTemplate.queryForObject(SELECT_BY_IDEMPOTENCY_KEY, new Object[]{idempotencyKey}, this::mapRow)
            );
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public PersistedQuote persist(
            QuoteRequest request,
            QuoteResult result,
            UUID quoteId,
            UUID correlationId,
            String idempotencyKey
    ) {
        String requestPayload = serialize(request);
        String decisionPayload = serialize(result.decision());
        String explanationPayload = serialize(result.explanations());
        Timestamp now = Timestamp.from(clock.instant());
        try {
            jdbcTemplate.update(INSERT_REQUEST_SQL, ps -> {
                ps.setObject(1, quoteId);
                ps.setString(2, request.rulesetKey());
                ps.setObject(3, UUID.fromString(request.driverId()));
                ps.setString(4, request.offerId());
                ps.setObject(5, correlationId);
                ps.setString(6, idempotencyKey);
                ps.setString(7, requestPayload);
                ps.setTimestamp(8, now);
            });
            jdbcTemplate.update(INSERT_RESULT_SQL, ps -> {
                ps.setObject(1, quoteId);
                ps.setString(2, result.rulesetKey());
                ps.setString(3, result.ruleVersion().version());
                ps.setTimestamp(4, Timestamp.from(result.ruleVersion().publishedAt()));
                ps.setString(5, result.action().name());
                ps.setString(6, decisionPayload);
                ps.setString(7, explanationPayload);
                ps.setTimestamp(8, Timestamp.from(result.evaluatedAt()));
                ps.setString(9, result.strategyName());
                ps.setTimestamp(10, now);
            });
            persistAssumptions(quoteId, now, result.explanations());
            return new PersistedQuote(quoteId, result, idempotencyKey);
        } catch (DuplicateKeyException ex) {
            if (idempotencyKey == null) {
                throw ex;
            }
            metrics.recordIdempotencyHit();
            return findByIdempotencyKey(idempotencyKey)
                    .orElseThrow(() -> new IllegalStateException("Unable to load idempotent quote", ex));
        }
    }

    private void persistAssumptions(UUID quoteId, Timestamp now, List<ExplanationNode> explanations) {
        List<AssumptionEntry> assumptions = flatten(explanations);
        if (assumptions.isEmpty()) {
            return;
        }
        jdbcTemplate.batchUpdate(INSERT_ASSUMPTION_SQL, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                AssumptionEntry entry = assumptions.get(i);
                ps.setObject(1, quoteId);
                ps.setString(2, entry.source());
                ps.setString(3, entry.key());
                ps.setString(4, entry.value());
                ps.setTimestamp(5, now);
            }

            @Override
            public int getBatchSize() {
                return assumptions.size();
            }
        });
    }

    private PersistedQuote mapRow(ResultSet rs, int rowNum) throws SQLException {
        UUID quoteId = rs.getObject("quote_id", UUID.class);
        String idempotencyKey = rs.getString("idempotency_key");
        QuoteRequest request = deserialize(rs.getString("request_payload"), QuoteRequest.class);
        QuoteDecision decision = deserialize(rs.getString("decision_payload"), QuoteDecision.class);
        List<ExplanationNode> explanations = deserializeExplanations(rs.getString("explanation_payload"));
        RuleVersion ruleVersion = new RuleVersion(
                rs.getString("rule_version"),
                rs.getTimestamp("rule_published_at").toInstant()
        );
        DecisionAction action = DecisionAction.valueOf(rs.getString("decision_action"));
        String strategyName = rs.getString("strategy_name");
        Instant evaluatedAt = rs.getTimestamp("evaluated_at").toInstant();
        QuoteResult result = new QuoteResult(
                QuoteRequestConverter.toOffer(request),
                QuoteRequestConverter.toDriverProfile(request),
                decision,
                action,
                explanations,
                rs.getString("ruleset_key"),
                ruleVersion,
                evaluatedAt,
                strategyName
        );
        return new PersistedQuote(quoteId, result, idempotencyKey);
    }

    private <T> T deserialize(String payload, Class<T> type) {
        try {
            return objectMapper.readValue(payload, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to read persisted JSON payload", e);
        }
    }

    private List<ExplanationNode> deserializeExplanations(String payload) {
        try {
            return objectMapper.readValue(payload, new TypeReference<List<ExplanationNode>>() {
            });
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to read explanation payload", e);
        }
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize quote payload", e);
        }
    }

    private List<AssumptionEntry> flatten(List<ExplanationNode> nodes) {
        List<AssumptionEntry> entries = new ArrayList<>();
        for (ExplanationNode node : nodes) {
            collectAssumptions(node, new ArrayList<>(), entries);
        }
        return entries;
    }

    private void collectAssumptions(
            ExplanationNode node,
            List<String> ancestors,
            List<AssumptionEntry> entries
    ) {
        if (node.children().isEmpty()) {
            String source = ancestors.isEmpty() ? null : String.join(" > ", ancestors);
            entries.add(new AssumptionEntry(source, node.title(), serializeAssumptionValue(node.value())));
            return;
        }
        List<String> nextAncestors = new ArrayList<>(ancestors);
        nextAncestors.add(node.title());
        for (ExplanationNode child : node.children()) {
            collectAssumptions(child, nextAncestors, entries);
        }
    }

    private String serializeAssumptionValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            return text;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return value.toString();
        }
    }

    private record AssumptionEntry(String source, String key, String value) {
    }
}
