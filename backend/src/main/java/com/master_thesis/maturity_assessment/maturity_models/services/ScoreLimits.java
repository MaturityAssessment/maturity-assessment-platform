package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import java.util.List;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;

/** Limits never create a score and only matching, unchanged flag rules can activate them. */
public final class ScoreLimits {
    private ScoreLimits() {}

    public static void validate(List<ScoreLimit> limits, List<ChildStateGatingRule> states,
                                List<ConditionalGatingRule> conditions, String owner) {
        if (limits == null) return;
        if (limits.size() > 100) fail(owner, "supports at most 100 score limits");
        var usedStates = new HashSet<ChildStateGatingRule>();
        var usedConditions = new ArrayList<ConditionalGatingRule>();
        for (var limit : limits) {
            if (!validValues(limit))
                fail(owner, "score limits require floor/ceiling/both and finite normalized bounds from 0 to 1, with floor at or below ceiling");
            if (!linked(limit, states, conditions))
                fail(owner, "a score limit's Flag for Review rule changed or was removed; relink or remove the limit");
            if (limit.childStateRule() != null) {
                if (!usedStates.add(limit.childStateRule()))
                    fail(owner, "each Flag for Review gate supports at most one score limit");
            } else {
                if (usedConditions.stream().anyMatch(rule -> sameConditionalRule(limit.conditionalRule(), rule)))
                    fail(owner, "each Flag for Review gate supports at most one score limit");
                usedConditions.add(limit.conditionalRule());
            }
        }
    }

    private static boolean normalized(Double value) {
        return value != null && Double.isFinite(value) && value >= 0 && value <= 1;
    }

    private static boolean validValues(ScoreLimit limit) {
        return limit != null && Set.of("floor", "ceiling", "both").contains(limit.kind() == null ? "" : limit.kind())
                && normalized(limit.value()) && ("both".equals(limit.kind())
                    ? normalized(limit.upperValue()) && limit.value() <= limit.upperValue()
                    : limit.upperValue() == null);
    }

    public static boolean linked(ScoreLimit limit, List<ChildStateGatingRule> states, List<ConditionalGatingRule> conditions) {
        if (limit == null || (limit.childStateRule() == null) == (limit.conditionalRule() == null)) return false;
        return limit.childStateRule() != null
                ? "flagForReview".equals(limit.childStateRule().effect()) && states != null && states.contains(limit.childStateRule())
                : "flagForReview".equals(limit.conditionalRule().effect()) && conditions != null
                    && conditions.stream().anyMatch(rule -> sameConditionalRule(limit.conditionalRule(), rule));
    }

    private static boolean sameConditionalRule(ConditionalGatingRule expected, ConditionalGatingRule actual) {
        return actual != null && Objects.equals(expected.version(), actual.version())
                && Objects.equals(expected.effect(), actual.effect()) && Objects.equals(expected.name(), actual.name())
                && Objects.equals(expected.description(), actual.description())
                && expected.when() != null && actual.when() != null
                // JSON and JSONB may encode the same number as either 1 or 1.0. Do not use
                // scoring tolerances here: even a small change to the rule needs reapproval.
                && expected.when().equals((left, right) -> left.isNumber() && right.isNumber()
                    ? left.decimalValue().compareTo(right.decimalValue()) : left.equals(right) ? 0 : 1, actual.when());
    }

    public record Bounds(double floor, double ceiling, boolean invalid) {
        public Double apply(Double score) {
            return score == null || invalid ? null : Math.max(floor, Math.min(ceiling, score));
        }
    }

    public static Bounds evaluate(List<ScoreLimit> limits, List<ChildStateGatingRule> states,
                                  List<ConditionalGatingRule> conditions, Predicate<ChildStateGatingRule> stateMatches,
                                  Predicate<ConditionalGatingRule> conditionMatches) {
        double floor = 0, ceiling = 1;
        for (var limit : limits == null ? List.<ScoreLimit>of() : limits) {
            // Defensive handling for legacy/corrupt configuration: never apply an unapproved rule.
            if (!linked(limit, states, conditions) || !validValues(limit))
                return new Bounds(floor, ceiling, true);
            boolean matched = limit.childStateRule() != null ? stateMatches.test(limit.childStateRule()) : conditionMatches.test(limit.conditionalRule());
            if (matched) {
                if ("floor".equals(limit.kind()) || "both".equals(limit.kind())) floor = Math.max(floor, limit.value());
                if ("ceiling".equals(limit.kind())) ceiling = Math.min(ceiling, limit.value());
                if ("both".equals(limit.kind())) ceiling = Math.min(ceiling, limit.upperValue());
            }
        }
        return new Bounds(floor, ceiling, ceiling < floor);
    }

    private static void fail(String owner, String message) {
        throw new IllegalOperationException("INVALID_SCORE_LIMITS", owner + ": " + message + ".");
    }
}
