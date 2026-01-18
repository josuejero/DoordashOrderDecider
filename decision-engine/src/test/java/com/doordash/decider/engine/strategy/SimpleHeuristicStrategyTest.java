package com.doordash.decider.engine.strategy;

import com.doordash.decider.domain.DecisionAction;
import com.doordash.decider.domain.DriverProfile;
import com.doordash.decider.domain.Offer;
import com.doordash.decider.domain.QuoteDecision;
import com.doordash.decider.rules.MarketRules;
import com.doordash.decider.rules.RuleVersion;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class SimpleHeuristicStrategyTest {

    private final Clock clock = Clock.fixed(Instant.parse("2024-01-01T00:00:00Z"), ZoneOffset.UTC);
    private final SimpleHeuristicStrategy strategy = new SimpleHeuristicStrategy(clock);
    private final MarketRules rules = createRules();

    @Test
    void acceptsWhenNetMeetsTarget() {
        QuoteEvaluation evaluation = strategy.evaluate(
                new Offer(
                        "offer-1",
                        BigDecimal.valueOf(30),
                        1.0,
                        60,
                        BigDecimal.ZERO,
                        "18:00",
                        "19:00",
                        BigDecimal.ZERO,
                        BigDecimal.ZERO
                ),
                new DriverProfile("driver-1", BigDecimal.valueOf(25), 120),
                rules
        );
        QuoteDecision decision = evaluation.decision();

        assertEquals(DecisionAction.ACCEPT, evaluation.action());
        assertEquals(BigDecimal.valueOf(30).setScale(2), decision.netPayout());
        assertEquals(BigDecimal.valueOf(25).setScale(2), decision.requiredDollars());
        assertEquals(BigDecimal.valueOf(30).setScale(2), decision.projectedNetPerHour());
        assertEquals(BigDecimal.valueOf(30).setScale(2), decision.projectedGrossPerHour());
        assertNull(decision.finishIso());
    }

    @Test
    void buffersExtendWindowAndRaiseRequiredDollars() {
        QuoteEvaluation evaluation = strategy.evaluate(
                new Offer(
                        "offer-2",
                        BigDecimal.valueOf(30),
                        1.0,
                        60,
                        BigDecimal.ZERO,
                        "10:00",
                        "11:00",
                        BigDecimal.valueOf(30),
                        BigDecimal.ZERO
                ),
                new DriverProfile("driver-2", BigDecimal.valueOf(30), 180),
                rules
        );
        QuoteDecision decision = evaluation.decision();

        assertEquals(DecisionAction.REJECT, evaluation.action());
        assertEquals(BigDecimal.valueOf(45).setScale(2), decision.requiredDollars());
    }

    @Test
    void reportsFinishIsoWhenCrossingMidnight() {
        QuoteEvaluation evaluation = strategy.evaluate(
                new Offer(
                        "offer-3",
                        BigDecimal.valueOf(10),
                        1.0,
                        60,
                        BigDecimal.ZERO,
                        "23:30",
                        "00:15",
                        BigDecimal.valueOf(15),
                        BigDecimal.ZERO
                ),
                new DriverProfile("driver-3", BigDecimal.TEN, 120),
                rules
        );
        QuoteDecision decision = evaluation.decision();

        assertEquals(DecisionAction.ACCEPT, evaluation.action());
        assertNotNull(decision.finishIso());
        assertEquals(Instant.parse("2024-01-02T00:30:00Z"), decision.finishIso());
    }

    private MarketRules createRules() {
        return new MarketRules(
                "default",
                new RuleVersion("v1.0.0", Instant.parse("2025-01-01T00:00:00Z")),
                new MarketRules.DecisionThresholds(BigDecimal.ONE, BigDecimal.valueOf(0.9)),
                new MarketRules.CostProfile(BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.05), BigDecimal.valueOf(0.75)),
                new MarketRules.TimeRounding(5),
                new MarketRules.StrategyFlags(false, BigDecimal.valueOf(0.8))
        );
    }
}
