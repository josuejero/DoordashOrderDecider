COMMENT ON SCHEMA public IS 'Schema for decision engine artifacts';

CREATE TABLE IF NOT EXISTS rule_versions (
    id SERIAL PRIMARY KEY,
    ruleset_key VARCHAR(64) NOT NULL,
    rule_version VARCHAR(64) NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    config JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ruleset_key, rule_version)
);

CREATE INDEX IF NOT EXISTS idx_rule_versions_key ON rule_versions (ruleset_key);

CREATE TABLE IF NOT EXISTS quote_requests (
    quote_id UUID PRIMARY KEY,
    ruleset_key VARCHAR(64) NOT NULL,
    driver_id UUID NOT NULL,
    offer_id VARCHAR(64) NOT NULL,
    correlation_id UUID,
    idempotency_key VARCHAR(255),
    request_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_requests_idempotency_key
    ON quote_requests (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS quote_results (
    quote_id UUID PRIMARY KEY REFERENCES quote_requests(quote_id) ON DELETE CASCADE,
    ruleset_key VARCHAR(64) NOT NULL,
    rule_version VARCHAR(64) NOT NULL,
    rule_published_at TIMESTAMPTZ NOT NULL,
    decision_action VARCHAR(16) NOT NULL,
    decision_payload JSONB NOT NULL,
    explanation_payload JSONB NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (ruleset_key, rule_version) REFERENCES rule_versions (ruleset_key, rule_version)
);

CREATE TABLE IF NOT EXISTS quote_assumptions (
    id SERIAL PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quote_results(quote_id) ON DELETE CASCADE,
    source TEXT,
    assumption_key TEXT NOT NULL,
    assumption_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_assumptions_quote_id ON quote_assumptions (quote_id);
