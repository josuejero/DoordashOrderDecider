package com.doordash.decider.rules;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class RulesetNotFoundException extends RuntimeException {

    public RulesetNotFoundException(String rulesetKey) {
        super("Ruleset not found: " + rulesetKey);
    }
}
