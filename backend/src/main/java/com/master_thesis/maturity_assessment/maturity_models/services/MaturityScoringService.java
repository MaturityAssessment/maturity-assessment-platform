package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.maturity_models.models.MaturityLevel;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;
import com.master_thesis.maturity_assessment.maturity_models.models.DimensionMappingRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingSelection;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class MaturityScoringService {

    private static final int DEFAULT_MAX_LEVEL_NUMBER = 5;

    public record ChildScore(String code, double score) {
    }

    public double roundAndClampNormalized(double score) {
        if (!Double.isFinite(score)) {
            return 0.0;
        }
        double clamped = Math.max(0.0, Math.min(1.0, score));
        return BigDecimal.valueOf(clamped).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    public double applyGatingRules(
            double aggregatedScore,
            List<ChildScore> childScores,
            List<GatingRule> rules) {
        double current = roundAndClampNormalized(aggregatedScore);
        if (rules == null || rules.isEmpty()) {
            return current;
        }
        List<ChildScore> scoredChildren = childScores == null ? List.of() : childScores.stream()
                .filter(child -> child != null && child.code() != null && Double.isFinite(child.score()))
                .map(child -> new ChildScore(child.code(), roundAndClampNormalized(child.score())))
                .toList();
        for (GatingRule rule : rules.stream()
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(GatingRule::getOrder))
                .toList()) {
            if (!matches(rule, scoredChildren)) {
                continue;
            }
            double value = rule.getValue().doubleValue();
            current = switch (rule.getOperation()) {
                case SET -> value;
                case ADD -> current + value;
                case SUBTRACT -> current - value;
            };
            current = roundAndClampNormalized(current);
        }
        return current;
    }

    private boolean matches(GatingRule rule, List<ChildScore> children) {
        if (children.isEmpty()) {
            return false;
        }
        if (rule.getSelection() == GatingSelection.SPECIFIC_CHILD) {
            return children.stream()
                    .filter(child -> child.code().equalsIgnoreCase(rule.getChildCode()))
                    .findFirst()
                    .map(child -> compare(child.score(), rule))
                    .orElse(false);
        }
        if (rule.getSelection() == GatingSelection.ANY_CHILD) {
            return children.stream().anyMatch(child -> compare(child.score(), rule));
        }
        return children.stream().allMatch(child -> compare(child.score(), rule));
    }

    private boolean compare(double score, GatingRule rule) {
        BigDecimal left = BigDecimal.valueOf(roundAndClampNormalized(score)).setScale(2);
        BigDecimal right = rule.getThreshold().setScale(2, RoundingMode.HALF_UP);
        int comparison = left.compareTo(right);
        return switch (rule.getOperator()) {
            case BELOW -> comparison < 0;
            case BELOW_OR_EQUAL -> comparison <= 0;
            case EQUAL -> comparison == 0;
            case ABOVE_OR_EQUAL -> comparison >= 0;
            case ABOVE -> comparison > 0;
        };
    }

    private static final String[] GLOBAL_LEVEL_NAMES = {
        "Not Implemented",
        "Initial",
        "Managed",
        "Defined",
        "Optimised"
    };

    /**
     * Aggregates scores according to a model rule. A missing rule is treated as
     * weighted average so models created before aggregation rules retain their
     * closest scoring behavior.
     */
    public double aggregate(List<Double> scores, List<Double> weights, AggregationRule rule) {
        if (scores == null || scores.isEmpty()) {
            return 0.0;
        }

        List<Double> finiteScores = new ArrayList<>();
        List<Double> alignedWeights = new ArrayList<>();
        for (int index = 0; index < scores.size(); index++) {
            Double score = scores.get(index);
            if (score == null || !Double.isFinite(score)) {
                continue;
            }
            finiteScores.add(score);
            Double weight = weights != null && index < weights.size() ? weights.get(index) : null;
            alignedWeights.add(weight != null && Double.isFinite(weight) && weight > 0.0 ? weight : 1.0);
        }
        if (finiteScores.isEmpty()) {
            return 0.0;
        }

        AggregationRule resolvedRule = rule != null ? rule : AggregationRule.WEIGHTED_AVERAGE;
        return switch (resolvedRule) {
            case AVERAGE -> finiteScores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            case WEIGHTED_AVERAGE -> weightedAverage(finiteScores, alignedWeights);
            case MINIMUM -> finiteScores.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
            case MAXIMUM -> finiteScores.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
            case SUM -> finiteScores.stream().mapToDouble(Double::doubleValue).sum();
            case MEDIAN -> median(finiteScores);
        };
    }

    private double weightedAverage(List<Double> scores, List<Double> weights) {
        double weightedTotal = 0.0;
        double totalWeight = 0.0;
        for (int index = 0; index < scores.size(); index++) {
            double weight = weights.get(index);
            weightedTotal += scores.get(index) * weight;
            totalWeight += weight;
        }
        return totalWeight > 0.0 ? weightedTotal / totalWeight : 0.0;
    }

    private double median(List<Double> scores) {
        List<Double> sorted = scores.stream().sorted().toList();
        int middle = sorted.size() / 2;
        if (sorted.size() % 2 == 1) {
            return sorted.get(middle);
        }
        return (sorted.get(middle - 1) + sorted.get(middle)) / 2.0;
    }

    /**
     * Legacy default when no model levels are loaded (should be rare after DB backfill).
     */
    public int getMaxLevelNumber() {
        return DEFAULT_MAX_LEVEL_NUMBER;
    }

    /**
     * Highest level number from the model's scale, or 5 if none are defined.
     */
    public int resolveMaxLevelNumber(List<MaturityLevel> levels) {
        if (levels == null || levels.isEmpty()) {
            return DEFAULT_MAX_LEVEL_NUMBER;
        }
        return levels.stream()
                .map(MaturityLevel::getNumber)
                .filter(n -> n != null && n > 0)
                .max(Integer::compareTo)
                .orElse(DEFAULT_MAX_LEVEL_NUMBER);
    }

    /**
     * Converts a weighted average score (1-N scale) to a 0-100 percentage.
     *
     * @param averageScore   the weighted average on the 1-N scale
     * @param maxLevelNumber the highest maturity level number in the model (e.g. 5)
     * @return percentage score clamped to 0-100
     */
    public double normalizeToPercentage(double averageScore, int maxLevelNumber) {
        if (maxLevelNumber <= 1) {
            return 0.0;
        }
        double percentage = (averageScore - 1.0) / (maxLevelNumber - 1.0) * 100.0;
        percentage = Math.max(0.0, Math.min(100.0, percentage));
        return Math.round(percentage * 10.0) / 10.0;
    }

    /**
     * Maps a 0-100 percentage to a level index 1..n using equal-width bands.
     * <p>
     * {@code level = min(n, max(1, ceil(p/100 * n)))} with 0% mapping to level 1.
     */
    public int mapScoreToLevel(double percentageScore, int n) {
        if (n <= 1) {
            return 1;
        }
        double clamped = Math.max(0.0, Math.min(100.0, percentageScore));
        int raw = (int) Math.ceil(clamped / 100.0 * n);
        if (raw < 1) {
            raw = 1;
        }
        return Math.min(n, raw);
    }

    /**
     * Applies a dimension's configurable minimum-score thresholds. The rule with
     * the greatest threshold not exceeding the normalized score wins.
     * Missing rules retain the legacy equal-width behavior.
     */
    public int mapNormalizedScoreToLevel(
            double normalizedScore,
            List<DimensionMappingRule> mappingRules,
            int levelCount) {
        if (mappingRules == null || mappingRules.isEmpty()) {
            return mapScoreToLevel(Math.max(0.0, Math.min(1.0, normalizedScore)) * 100.0, levelCount);
        }
        double clamped = Math.max(0.0, Math.min(1.0, normalizedScore));
        return mappingRules.stream()
                .filter(rule -> rule.getLevelNumber() != null
                        && rule.getMinimumScore() != null
                        && Double.isFinite(rule.getMinimumScore())
                        && rule.getMinimumScore() <= clamped)
                .max(Comparator.comparingDouble(DimensionMappingRule::getMinimumScore))
                .map(DimensionMappingRule::getLevelNumber)
                .orElse(1);
    }

    /**
     * @deprecated Use {@link #mapScoreToLevel(double, int)} with the model's level count.
     */
    @Deprecated
    public int mapScoreToLevel(double percentageScore) {
        return mapScoreToLevel(percentageScore, DEFAULT_MAX_LEVEL_NUMBER);
    }

    /**
     * Looks up the maturity level name by level number from global defaults.
     */
    public String getLevelName(int levelNumber) {
        if (levelNumber >= 1 && levelNumber <= GLOBAL_LEVEL_NAMES.length) {
            return GLOBAL_LEVEL_NAMES[levelNumber - 1];
        }
        return "Level " + levelNumber;
    }

    /**
     * Looks up the maturity level name from the model's levels when possible.
     */
    public String getLevelName(int levelNumber, List<MaturityLevel> levels) {
        if (levels != null && !levels.isEmpty()) {
            Optional<MaturityLevel> levelOpt = levels.stream()
                    .filter(level -> matchesLevelNumber(level, levelNumber))
                    .findFirst();
            if (levelOpt.isPresent() && levelOpt.get().getName() != null && !levelOpt.get().getName().isBlank()) {
                return levelOpt.get().getName();
            }
        }
        return getLevelName(levelNumber);
    }

    private boolean matchesLevelNumber(MaturityLevel level, int levelNumber) {
        if (level.getNumber() != null && level.getNumber().equals(levelNumber)) {
            return true;
        }
        return level.getLevelNumber() != null && level.getLevelNumber().equals(levelNumber);
    }

    /**
     * Sorted copy of levels by {@code number} (for stable display / lookup).
     */
    public List<MaturityLevel> sortedLevels(List<MaturityLevel> levels) {
        if (levels == null || levels.isEmpty()) {
            return List.of();
        }
        return levels.stream()
                .sorted(Comparator.comparing(MaturityLevel::getNumber, Comparator.nullsLast(Integer::compareTo)))
                .toList();
    }
}
