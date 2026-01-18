package com.doordash.decider.rules;

import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
public class RulesResolver {

    private final RuleRepository repository;

    public RulesResolver(RuleRepository repository) {
        this.repository = repository;
    }

    public MarketRules resolve(String rulesetKey) {
        Objects.requireNonNull(rulesetKey, "rulesetKey is required");
        return repository.findLatest(rulesetKey)
                .orElseThrow(() -> new RulesetNotFoundException(rulesetKey));
    }
}
