package com.doordash.decider.engine;

import com.doordash.decider.domain.DriverProfile;
import com.doordash.decider.domain.Offer;
import com.doordash.decider.domain.QuoteResult;

public interface DecisionStrategy {
    QuoteResult evaluate(Offer offer, DriverProfile profile, String rulesetKey);
}
