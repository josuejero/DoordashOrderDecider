ALTER TABLE quote_results
    ADD COLUMN strategy_name VARCHAR(128) NOT NULL DEFAULT 'unknown';
