package com.doordash.decider.rules;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcRuleRepository implements RuleRepository {

    private static final String SELECT_LATEST_SQL = """
            SELECT ruleset_key, rule_version, published_at, config
            FROM rule_versions
            WHERE ruleset_key = ?
              AND enabled = TRUE
            ORDER BY published_at DESC
            LIMIT 1
            """;

    private static final String INSERT_SQL = """
            INSERT INTO rule_versions (ruleset_key, rule_version, published_at, config)
            VALUES (?, ?, ?, ?)
            """;
    private static final String EXISTENCE_SQL = """
            SELECT COUNT(*) FROM rule_versions
            WHERE ruleset_key = ?
              AND rule_version = ?
            """;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public JdbcRuleRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<MarketRules> findLatest(String rulesetKey) {
        List<MarketRules> matches = jdbcTemplate.query(
                SELECT_LATEST_SQL,
                new Object[]{rulesetKey},
                this::mapRow
        );
        return matches.stream().findFirst();
    }

    @Override
    public void save(RuleSeed seed) {
        Integer count = jdbcTemplate.queryForObject(
                EXISTENCE_SQL,
                Integer.class,
                seed.rulesetKey(),
                seed.version().version()
        );
        if (count == null || count == 0) {
            jdbcTemplate.update(
                    INSERT_SQL,
                    seed.rulesetKey(),
                    seed.version().version(),
                    Timestamp.from(seed.version().publishedAt()),
                    seed.config()
            );
        }
    }

    private MarketRules mapRow(ResultSet rs, int rowNum) throws SQLException {
        String rulesetKey = rs.getString("ruleset_key");
        String ruleVersion = rs.getString("rule_version");
        Timestamp publishedAt = rs.getTimestamp("published_at");
        String configPayload = rs.getString("config");
        RuleVersion version = new RuleVersion(ruleVersion, publishedAt.toInstant());
        MarketRulesConfig config = parseConfig(configPayload);
        return MarketRules.fromConfig(rulesetKey, version, config);
    }

    private MarketRulesConfig parseConfig(String payload) {
        try {
            return objectMapper.readValue(payload, MarketRulesConfig.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to parse market rules payload", e);
        }
    }
}
