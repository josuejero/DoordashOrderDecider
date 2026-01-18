package com.doordash.decider.rules;

import java.util.Optional;

public interface RuleRepository {

    Optional<MarketRules> findLatest(String rulesetKey);

    void save(RuleSeed seed);
}
