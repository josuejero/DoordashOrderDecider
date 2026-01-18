package com.doordash.decider.engine.strategy;

import com.doordash.decider.domain.DecisionAction;
import com.doordash.decider.domain.DriverProfile;
import com.doordash.decider.domain.ExplanationNode;
import com.doordash.decider.domain.Offer;
import com.doordash.decider.domain.QuoteDecision;
import com.doordash.decider.rules.MarketRules;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class SimpleHeuristicStrategy implements QuoteStrategy {

    private static final Pattern HHMM_PATTERN = Pattern.compile("([01]?\\d|2[0-3]):([0-5]\\d)");
    private static final BigDecimal MINUTES_PER_HOUR = BigDecimal.valueOf(60);

    private final Clock clock;

    public SimpleHeuristicStrategy(Clock clock) {
        this.clock = clock;
    }

    @Override
    public QuoteEvaluation evaluate(Offer offer, DriverProfile profile, MarketRules rules) {
        int startMinutes = parseHHMM(offer.shiftStartHHMM());
        int finishMinutes = parseHHMM(offer.finishHHMM());
        boolean crossesMidnight = finishMinutes < startMinutes;
        int adjustedFinish = crossesMidnight ? finishMinutes + 24 * 60 : finishMinutes;
        int bufferMinutes = clampBufferMinutes(offer.bufferMinutes());
        int totalMinutes = adjustedFinish - startMinutes + bufferMinutes;
        if (totalMinutes < 1) {
            totalMinutes = 1;
        }
        int roundingInterval = rules.rounding().minutes();
        int roundedMinutes = applyRounding(totalMinutes, roundingInterval);
        if (roundedMinutes < 1) {
            roundedMinutes = 1;
        }
        BigDecimal hours = BigDecimal.valueOf(roundedMinutes).divide(MINUTES_PER_HOUR, 8, RoundingMode.HALF_UP);
        BigDecimal payout = clampNonNegative(offer.payout());
        BigDecimal earnedSoFar = clampNonNegative(offer.earnedSoFar());
        BigDecimal recordedCost = offer.costPerMile();
        BigDecimal costPerMile = recordedCost == null
                ? rules.costs().defaultCostPerMile()
                : clampNonNegative(recordedCost);
        BigDecimal distance = BigDecimal.valueOf(offer.distanceMiles());
        BigDecimal variableCost = distance.multiply(costPerMile).multiply(rules.costs().multiplier());
        BigDecimal netPayout = payout.subtract(variableCost);
        if (netPayout.compareTo(BigDecimal.ZERO) < 0) {
            netPayout = BigDecimal.ZERO;
        }
        BigDecimal targetRate = clampNonNegative(profile.targetHourlyRate());
        BigDecimal requiredHourlyRate = rules.thresholds().requiredRate(targetRate);
        BigDecimal rejectionRate = rules.thresholds().rejectRate(targetRate);
        BigDecimal requiredDollars = requiredHourlyRate.multiply(hours).subtract(earnedSoFar);
        if (requiredDollars.compareTo(BigDecimal.ZERO) < 0) {
            requiredDollars = BigDecimal.ZERO;
        }
        BigDecimal projectedGrossPerHour =
                earnedSoFar.add(payout).divide(hours, 8, RoundingMode.HALF_UP);
        BigDecimal projectedNetPerHour =
                earnedSoFar.add(netPayout).divide(hours, 8, RoundingMode.HALF_UP);
        BigDecimal roundedNet = round2(netPayout);
        BigDecimal roundedRequired = round2(requiredDollars);
        BigDecimal roundedGross = round2(projectedGrossPerHour);
        BigDecimal roundedNetRate = round2(projectedNetPerHour);
        Instant finishIso = crossesMidnight ? computeFinishIso(startMinutes, roundedMinutes) : null;
        QuoteDecision decision = new QuoteDecision(
                roundedNet,
                roundedRequired,
                roundedGross,
                roundedNetRate,
                finishIso
        );
        DecisionAction action;
        if (roundedNetRate.compareTo(requiredHourlyRate) >= 0) {
            action = DecisionAction.ACCEPT;
        } else if (roundedNetRate.compareTo(rejectionRate) < 0) {
            action = DecisionAction.REJECT;
        } else {
            action = roundedNet.compareTo(roundedRequired) >= 0 ? DecisionAction.ACCEPT : DecisionAction.REJECT;
        }
        List<ExplanationNode> explanations = buildExplanationTree(
                offer,
                profile,
                hours,
                roundedMinutes,
                bufferMinutes,
                roundingInterval,
                crossesMidnight,
                finishIso,
                costPerMile,
                variableCost,
                roundedNet,
                roundedRequired,
                roundedGross,
                roundedNetRate,
                earnedSoFar,
                rules,
                requiredHourlyRate,
                rejectionRate
        );
        return new QuoteEvaluation(action, decision, explanations);
    }

    private List<ExplanationNode> buildExplanationTree(
            Offer offer,
            DriverProfile profile,
            BigDecimal hours,
            int totalMinutes,
            int bufferMinutes,
            int roundingInterval,
            boolean crossesMidnight,
            Instant finishIso,
            BigDecimal costPerMile,
            BigDecimal variableCost,
            BigDecimal net,
            BigDecimal required,
            BigDecimal projectedGross,
            BigDecimal projectedNet,
            BigDecimal earnedSoFar,
            MarketRules rules,
            BigDecimal requiredHourlyRate,
            BigDecimal rejectionRate
    ) {
        List<ExplanationNode> tree = new ArrayList<>();
        tree.add(buildTimeWindowNode(offer, totalMinutes, bufferMinutes, roundingInterval, crossesMidnight, finishIso));
        tree.add(buildCostNode(offer, costPerMile, variableCost, net, rules));
        tree.add(buildPacingNode(
                profile,
                hours,
                earnedSoFar,
                required,
                net,
                projectedGross,
                projectedNet,
                rules,
                requiredHourlyRate,
                rejectionRate
        ));
        tree.add(buildStrategyNode(rules));
        return List.copyOf(tree);
    }

    private ExplanationNode buildTimeWindowNode(
            Offer offer,
            int totalMinutes,
            int bufferMinutes,
            int roundingInterval,
            boolean crossesMidnight,
            Instant finishIso
    ) {
        List<ExplanationNode> children = new ArrayList<>();
        children.add(ExplanationNode.leaf("Shift start", offer.shiftStartHHMM()));
        children.add(ExplanationNode.leaf("Finish target", offer.finishHHMM()));
        children.add(ExplanationNode.leaf("Buffer minutes", bufferMinutes));
        children.add(ExplanationNode.leaf("Window minutes", totalMinutes));
        children.add(ExplanationNode.leaf("Rounding interval", roundingInterval));
        children.add(ExplanationNode.leaf("Crosses midnight", crossesMidnight));
        if (finishIso != null) {
            children.add(ExplanationNode.leaf("Estimated finish", finishIso));
        }
        return ExplanationNode.of("Time window", null, List.copyOf(children));
    }

    private ExplanationNode buildCostNode(
            Offer offer,
            BigDecimal costPerMile,
            BigDecimal variableCost,
            BigDecimal net,
            MarketRules rules
    ) {
        List<ExplanationNode> children = List.of(
                ExplanationNode.leaf("Payout", offer.payout()),
                ExplanationNode.leaf("Distance (miles)", offer.distanceMiles()),
                ExplanationNode.leaf("Cost per mile", costPerMile),
                ExplanationNode.leaf("Deadhead factor", rules.costs().deadheadFactor()),
                ExplanationNode.leaf("Overhead factor", rules.costs().overheadFactor()),
                ExplanationNode.leaf("Variable cost", round2(variableCost)),
                ExplanationNode.leaf("Net payout", net)
        );
        return ExplanationNode.of("Costs", null, children);
    }

    private ExplanationNode buildPacingNode(
            DriverProfile profile,
            BigDecimal hours,
            BigDecimal earnedSoFar,
            BigDecimal required,
            BigDecimal net,
            BigDecimal projectedGross,
            BigDecimal projectedNet,
            MarketRules rules,
            BigDecimal requiredHourlyRate,
            BigDecimal rejectionRate
    ) {
        List<ExplanationNode> children = List.of(
                ExplanationNode.leaf("Target rate", profile.targetHourlyRate()),
                ExplanationNode.leaf("Acceptance multiplier", rules.thresholds().acceptMultiplier()),
                ExplanationNode.leaf("Rejection multiplier", rules.thresholds().declineMultiplier()),
                ExplanationNode.leaf("Required net rate", requiredHourlyRate),
                ExplanationNode.leaf("Reject net rate", rejectionRate),
                ExplanationNode.leaf("Window hours", round2(hours)),
                ExplanationNode.leaf("Earned so far", earnedSoFar),
                ExplanationNode.leaf("Required dollars", required),
                ExplanationNode.leaf("Net meets required", net.compareTo(required) >= 0),
                ExplanationNode.leaf("Projected gross per hour", projectedGross),
                ExplanationNode.leaf("Projected net per hour", projectedNet)
        );
        return ExplanationNode.of("Pacing", null, children);
    }

    private ExplanationNode buildStrategyNode(MarketRules rules) {
        List<ExplanationNode> children = List.of(
                ExplanationNode.leaf("Hybrid ML enabled", rules.strategy().enableHybridMl()),
                ExplanationNode.leaf("ML confidence threshold", rules.strategy().mlConfidenceThreshold())
        );
        return ExplanationNode.of("Strategy flags", null, children);
    }

    private int parseHHMM(String hhmm) {
        Matcher matcher = HHMM_PATTERN.matcher(hhmm);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Invalid time: " + hhmm);
        }
        int hours = Integer.parseInt(matcher.group(1));
        int minutes = Integer.parseInt(matcher.group(2));
        return hours * 60 + minutes;
    }

    private int clampBufferMinutes(BigDecimal raw) {
        if (raw == null) {
            return 0;
        }
        int clamped = raw.setScale(0, RoundingMode.FLOOR).intValue();
        return Math.max(clamped, 0);
    }

    private BigDecimal clampNonNegative(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        return value.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : value;
    }

    private int applyRounding(int totalMinutes, int interval) {
        if (interval <= 0) {
            return totalMinutes;
        }
        int remainder = totalMinutes % interval;
        if (remainder == 0) {
            return totalMinutes;
        }
        return totalMinutes + interval - remainder;
    }

    private BigDecimal round2(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private Instant computeFinishIso(int startMinutes, int totalMinutes) {
        LocalDate now = LocalDate.now(clock);
        LocalTime startTime = LocalTime.of(startMinutes / 60, startMinutes % 60);
        ZonedDateTime startDateTime = ZonedDateTime.of(now, startTime, clock.getZone());
        return startDateTime.plusMinutes(totalMinutes).toInstant();
    }
}
