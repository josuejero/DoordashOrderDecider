package com.doordash.decider.engine.strategy;

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

class SimpleHeuristicStrategyMathTest {

    private final Clock clock = Clock.fixed(Instant.parse("2025-01-01T00:00:00Z"), ZoneOffset.UTC);
    private final SimpleHeuristicStrategy strategy = new SimpleHeuristicStrategy(clock);

    @Test
    void handlesZeroDistanceByTreatingVariableCostAsZero() {
        MarketRules rules = baseRules();
        QuoteDecision decision = strategy.evaluate(
                new Offer(
                        "offer-zero",
                        BigDecimal.valueOf(20),
                        0.0,
                        10,
                        BigDecimal.ZERO,
                        "12:00",
                        "12:10",
                        BigDecimal.ZERO,
                        BigDecimal.ZERO
                ),
                new DriverProfile("driver-zero", BigDecimal.valueOf(25), 60),
                rules
        ).decision();

        assertEquals(BigDecimal.valueOf(20).setScale(2), decision.netPayout());
        assertEquals(BigDecimal.valueOf(120).setScale(2), decision.projectedNetPerHour());
    }

    @Test
    void roundsVeryShortWindowsUpToTheConfiguredInterval() {
        MarketRules rules = new MarketRules(
                "rounded",
                new RuleVersion("v-rounded", Instant.parse("2025-01-01T00:00:00Z")),
                new MarketRules.DecisionThresholds(BigDecimal.ONE, BigDecimal.valueOf(0.9)),
                new MarketRules.CostProfile(BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.05), BigDecimal.valueOf(0.75)),
                new MarketRules.TimeRounding(15),
                new MarketRules.StrategyFlags(false, BigDecimal.valueOf(0.8))
        );
        QuoteDecision decision = strategy.evaluate(
                new Offer(
                        "offer-short",
                        BigDecimal.valueOf(5),
                        1.0,
                        1,
                        BigDecimal.ZERO,
                        "08:00",
                        "08:01",
                        BigDecimal.ZERO,
                        BigDecimal.ZERO
                ),
                new DriverProfile("driver-short", BigDecimal.valueOf(30), 10),
                rules
        ).decision();

        assertEquals(BigDecimal.valueOf(20).setScale(2), decision.projectedNetPerHour());
        assertEquals(BigDecimal.valueOf(7.50).setScale(2), decision.requiredDollars());
    }

    @Test
    void rejectsWhenNetRateFallsBelowTheRejectionThreshold() {
        MarketRules rules = new MarketRules(
                "low-rate",
                new RuleVersion("v-low", Instant.parse("2025-01-01T00:00:00Z")),
                new MarketRules.DecisionThresholds(BigDecimal.ONE, BigDecimal.valueOf(0.5)),
                new MarketRules.CostProfile(BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.05), BigDecimal.valueOf(0.75)),
                new MarketRules.TimeRounding(5),
                new MarketRules.StrategyFlags(false, BigDecimal.valueOf(0.8))
        );
        QuoteDecision decision = strategy.evaluate(
                new Offer(
                        "offer-low",
                        BigDecimal.valueOf(5),
                        5.0,
                        30,
                        BigDecimal.ZERO,
                        "09:00",
                        "09:30",
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(1)
                ),
                new DriverProfile("driver-low", BigDecimal.valueOf(30), 30),
                rules
        ).decision();

        assertEquals(BigDecimal.ZERO.setScale(2), decision.netPayout());
        assertEquals(BigDecimal.ZERO.setScale(2), decision.projectedNetPerHour());
    }

    @Test
    void clampsNegativeNetPayoutWhenCostPerMileIsUnrealisticallyHigh() {
        MarketRules rules = baseRules();
        QuoteDecision decision = strategy.evaluate(
                new Offer(
                        "offer-costy",
                        BigDecimal.valueOf(10),
                        2.0,
                        20,
                        BigDecimal.ZERO,
                        "23:50",
                        "00:10",
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(20)
                ),
                new DriverProfile("driver-costy", BigDecimal.valueOf(40), 40),
                rules
        ).decision();

        assertEquals(BigDecimal.ZERO.setScale(2), decision.netPayout());
        assertNotNull(decision.finishIso());
    }

    private MarketRules baseRules() {
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
