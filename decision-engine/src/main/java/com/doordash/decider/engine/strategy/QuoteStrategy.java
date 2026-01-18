package com.doordash.decider.engine.strategy;

import com.doordash.decider.domain.DriverProfile;
import com.doordash.decider.domain.Offer;
import com.doordash.decider.rules.MarketRules;

public interface QuoteStrategy {
    QuoteEvaluation evaluate(Offer offer, DriverProfile profile, MarketRules rules);
}
