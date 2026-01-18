package com.doordash.decider.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@SpringBootTest(webEnvironment = RANDOM_PORT)
class QuoteControllerIntegrationTest extends PostgresIntegrationTest {

    private static final String REQUEST_FIXTURE = "fixtures/quote/golden-request.json";
    private static final String RESPONSE_FIXTURE = "fixtures/quote/expected-response.json";

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void quoteEndpointPersistsGoldenRequestAndResponse() throws IOException {
        JsonNode requestPayload = loadFixture(REQUEST_FIXTURE);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                "/quote",
                new HttpEntity<>(requestPayload, headers),
                JsonNode.class
        );

        assertEquals(200, response.getStatusCodeValue());
        JsonNode body = response.getBody();
        assertNotNull(body);
        JsonNode expected = loadFixture(RESPONSE_FIXTURE);

        assertEquals(expected.get("decision").asText(), body.get("decision").asText());
        assertEquals(expected.get("rulesetKey").asText(), body.get("rulesetKey").asText());
        assertEquals(expected.get("ruleVersion").asText(), body.get("ruleVersion").get("version").asText());

        JsonNode expectedDecision = expected.get("quoteDecision");
        JsonNode actualDecision = body.get("quoteDecision");
        assertDecimalEquals(expectedDecision.get("netPayout"), actualDecision.get("netPayout"));
        assertDecimalEquals(expectedDecision.get("requiredDollars"), actualDecision.get("requiredDollars"));
        assertDecimalEquals(expectedDecision.get("projectedNetPerHour"), actualDecision.get("projectedNetPerHour"));

        UUID quoteId = UUID.fromString(body.get("quoteId").asText());
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM quote_requests WHERE quote_id = ?",
                Integer.class,
                quoteId
        ));
        Map<String, Object> resultRow = jdbcTemplate.queryForMap(
                "SELECT ruleset_key, rule_version FROM quote_results WHERE quote_id = ?",
                quoteId
        );
        assertEquals("default", resultRow.get("ruleset_key"));
        assertEquals("v1.0.0", resultRow.get("rule_version"));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM quote_results WHERE quote_id = ?",
                Integer.class,
                quoteId
        ));
        assertEquals(29, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM quote_assumptions WHERE quote_id = ?",
                Integer.class,
                quoteId
        ));
    }

    private void assertDecimalEquals(JsonNode expected, JsonNode actual) {
        BigDecimal expectedValue = expected.decimalValue();
        BigDecimal actualValue = actual.decimalValue();
        assertEquals(0, expectedValue.compareTo(actualValue),
                () -> "expected " + expectedValue + " but got " + actualValue);
    }

    private JsonNode loadFixture(String path) throws IOException {
        try (var stream = new ClassPathResource(path).getInputStream()) {
            return objectMapper.readTree(stream);
        }
    }
}
