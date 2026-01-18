package com.doordash.decider.engine;

import com.doordash.decider.domain.DriverProfile;
import com.doordash.decider.domain.ExplanationNode;
import com.doordash.decider.domain.Offer;
import com.doordash.decider.domain.QuoteResult;
import com.doordash.decider.engine.strategy.QuoteEvaluation;
import com.doordash.decider.engine.strategy.QuoteStrategy;
import com.doordash.decider.metrics.QuoteMetrics;
import com.doordash.decider.rules.MarketRules;
import com.doordash.decider.rules.RulesResolver;
import com.doordash.decider.rules.RuleVersion;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public class DefaultDecisionEngine implements DecisionStrategy {

    private final QuoteStrategy quoteStrategy;
    private final RulesResolver rulesResolver;
    private final Clock clock;
    private final QuoteMetrics quoteMetrics;

    public DefaultDecisionEngine(
            QuoteStrategy quoteStrategy,
            RulesResolver rulesResolver,
            Clock clock,
            QuoteMetrics quoteMetrics
    ) {
        this.quoteStrategy = quoteStrategy;
        this.rulesResolver = rulesResolver;
        this.clock = clock;
        this.quoteMetrics = quoteMetrics;
    }

    @Override
    public QuoteResult evaluate(Offer offer, DriverProfile profile, String rulesetKey) {
        String strategyName = quoteStrategy.getClass().getSimpleName();
        Timer.Sample timer = quoteMetrics.startQuoteComputeTimer();
        try {
            MarketRules rules = rulesResolver.resolve(rulesetKey);
            QuoteEvaluation evaluation = quoteStrategy.evaluate(offer, profile, rules);
            RuleVersion ruleVersion = rules.version();
            List<ExplanationNode> explanations = new ArrayList<>(evaluation.explanations());
            explanations.add(buildRuleVersionNode(ruleVersion, rules.rulesetKey()));
            return new QuoteResult(
                    offer,
                    profile,
                    evaluation.decision(),
                    evaluation.action(),
                    List.copyOf(explanations),
                    rules.rulesetKey(),
                    ruleVersion,
                    Instant.now(clock),
                    strategyName
            );
        } finally {
            quoteMetrics.recordQuoteComputeLatency(timer);
            quoteMetrics.recordStrategySelection(strategyName);
        }
    }

    private ExplanationNode buildRuleVersionNode(RuleVersion version, String rulesetKey) {
        return ExplanationNode.of(
                "Rule set",
                null,
                List.of(
                        ExplanationNode.leaf("Ruleset", rulesetKey),
                        ExplanationNode.leaf("Version", version.version()),
                        ExplanationNode.leaf("Published at", version.publishedAt())
                )
        );
    }
}
