package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.maturity_models.models.MaturityLevel;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;
import com.master_thesis.maturity_assessment.maturity_models.models.DimensionMappingRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingComparisonOperator;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingScoreOperation;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingSelection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class MaturityScoringServiceTest {

    private MaturityScoringService scoringService;

    @BeforeEach
    void setUp() {
        scoringService = new MaturityScoringService();
    }

    @Test
    @DisplayName("aggregate supports every predefined aggregation rule")
    void aggregate_supportsEveryRule() {
        List<Double> scores = List.of(1.0, 3.0, 8.0, 10.0);
        List<Double> weights = List.of(1.0, 1.0, 2.0, 6.0);

        assertEquals(5.5, scoringService.aggregate(scores, weights, AggregationRule.AVERAGE));
        assertEquals(8.0, scoringService.aggregate(scores, weights, AggregationRule.WEIGHTED_AVERAGE));
        assertEquals(1.0, scoringService.aggregate(scores, weights, AggregationRule.MINIMUM));
        assertEquals(10.0, scoringService.aggregate(scores, weights, AggregationRule.MAXIMUM));
        assertEquals(22.0, scoringService.aggregate(scores, weights, AggregationRule.SUM));
        assertEquals(5.5, scoringService.aggregate(scores, weights, AggregationRule.MEDIAN));
    }

    @Test
    @DisplayName("aggregate defaults legacy null rules to weighted average")
    void aggregate_nullRuleUsesLegacyDefault() {
        assertEquals(
                4.0,
                scoringService.aggregate(List.of(2.0, 5.0), List.of(1.0, 2.0), null)
        );
    }

    // ============================================================
    // normalizeToPercentage tests
    // ============================================================

    @Test
    @DisplayName("normalizeToPercentage: score 1 on 1-5 scale should return 0%")
    void normalizeToPercentage_minScore() {
        assertEquals(0.0, scoringService.normalizeToPercentage(1.0, 5));
    }

    @Test
    @DisplayName("normalizeToPercentage: score 5 on 1-5 scale should return 100%")
    void normalizeToPercentage_maxScore() {
        assertEquals(100.0, scoringService.normalizeToPercentage(5.0, 5));
    }

    @Test
    @DisplayName("normalizeToPercentage: score 3 on 1-5 scale should return 50%")
    void normalizeToPercentage_midScore() {
        assertEquals(50.0, scoringService.normalizeToPercentage(3.0, 5));
    }

    @Test
    @DisplayName("normalizeToPercentage: score 2.0 on 1-3 scale should return 50%")
    void normalizeToPercentage_threeScaleMiddle() {
        assertEquals(50.0, scoringService.normalizeToPercentage(2.0, 3));
    }

    @Test
    @DisplayName("normalizeToPercentage: score 1 on 1-10 scale should return 0%")
    void normalizeToPercentage_tenScaleMin() {
        assertEquals(0.0, scoringService.normalizeToPercentage(1.0, 10));
    }

    @Test
    @DisplayName("normalizeToPercentage: score 10 on 1-10 scale should return 100%")
    void normalizeToPercentage_tenScaleMax() {
        assertEquals(100.0, scoringService.normalizeToPercentage(10.0, 10));
    }

    @Test
    @DisplayName("normalizeToPercentage: score below 1 should clamp to 0%")
    void normalizeToPercentage_belowMinClamp() {
        assertEquals(0.0, scoringService.normalizeToPercentage(0.0, 5));
    }

    @Test
    @DisplayName("normalizeToPercentage: score above max should clamp to 100%")
    void normalizeToPercentage_aboveMaxClamp() {
        assertEquals(100.0, scoringService.normalizeToPercentage(6.0, 5));
    }

    @Test
    @DisplayName("normalizeToPercentage: maxLevelNumber 1 should return 0%")
    void normalizeToPercentage_maxLevelOne() {
        assertEquals(0.0, scoringService.normalizeToPercentage(1.0, 1));
    }

    // ============================================================
    // mapScoreToLevel equal-width bands
    // ============================================================

    @Test
    @DisplayName("mapScoreToLevel(N=5): 0% -> level 1")
    void mapScoreToLevel_n5_zero() {
        assertEquals(1, scoringService.mapScoreToLevel(0.0, 5));
    }

    @Test
    @DisplayName("mapScoreToLevel(N=5): 20% -> level 1")
    void mapScoreToLevel_n5_twenty() {
        assertEquals(1, scoringService.mapScoreToLevel(20.0, 5));
    }

    @Test
    @DisplayName("mapScoreToLevel(N=5): 21% -> level 2")
    void mapScoreToLevel_n5_twentyOne() {
        assertEquals(2, scoringService.mapScoreToLevel(21.0, 5));
    }

    @Test
    @DisplayName("mapScoreToLevel(N=5): 100% -> level 5")
    void mapScoreToLevel_n5_hundred() {
        assertEquals(5, scoringService.mapScoreToLevel(100.0, 5));
    }

    @Test
    @DisplayName("mapScoreToLevel(N=3): bands")
    void mapScoreToLevel_n3() {
        assertEquals(1, scoringService.mapScoreToLevel(0.0, 3));
        assertEquals(1, scoringService.mapScoreToLevel(33.0, 3));
        assertEquals(2, scoringService.mapScoreToLevel(34.0, 3));
        assertEquals(3, scoringService.mapScoreToLevel(100.0, 3));
    }

    @Test
    @DisplayName("mapScoreToLevel: negative score clamps to 0% -> level 1")
    void mapScoreToLevel_negativeScore() {
        assertEquals(1, scoringService.mapScoreToLevel(-10.0, 5));
    }

    @Test
    @DisplayName("mapScoreToLevel: score > 100 clamps to top level")
    void mapScoreToLevel_scoreAbove100() {
        assertEquals(5, scoringService.mapScoreToLevel(150.0, 5));
    }

    @Test
    @DisplayName("mapScoreToLevel: n <= 1 returns 1")
    void mapScoreToLevel_nOne() {
        assertEquals(1, scoringService.mapScoreToLevel(50.0, 1));
    }

    @Test
    @DisplayName("mapScoreToLevel() no-arg delegates to N=5")
    void mapScoreToLevel_legacyNoArg() {
        assertEquals(scoringService.mapScoreToLevel(50.0, 5), scoringService.mapScoreToLevel(50.0));
    }

    @Test
    @DisplayName("dimension mapping uses configurable inclusive minimum thresholds")
    void mapNormalizedScoreToLevel_customThresholds() {
        List<DimensionMappingRule> rules = List.of(
                mappingRule(1, 0.0),
                mappingRule(2, 0.35),
                mappingRule(3, 0.8)
        );

        assertEquals(1, scoringService.mapNormalizedScoreToLevel(0.34, rules, 3));
        assertEquals(2, scoringService.mapNormalizedScoreToLevel(0.35, rules, 3));
        assertEquals(2, scoringService.mapNormalizedScoreToLevel(0.79, rules, 3));
        assertEquals(3, scoringService.mapNormalizedScoreToLevel(0.8, rules, 3));
        assertEquals(3, scoringService.mapNormalizedScoreToLevel(2.0, rules, 3));
    }

    @Test
    @DisplayName("dimension mapping falls back to equal-width bands for legacy models")
    void mapNormalizedScoreToLevel_missingRulesUsesLegacyBands() {
        assertEquals(1, scoringService.mapNormalizedScoreToLevel(0.2, null, 5));
        assertEquals(2, scoringService.mapNormalizedScoreToLevel(0.21, List.of(), 5));
    }

    @Test
    void gatingRules_supportSelectionsComparisonsAndSequentialEffects() {
        List<MaturityScoringService.ChildScore> children = List.of(
                new MaturityScoringService.ChildScore("P1", 0.39),
                new MaturityScoringService.ChildScore("P2", 0.80));
        List<GatingRule> rules = List.of(
                gatingRule(0, GatingSelection.ANY_CHILD, null,
                        GatingComparisonOperator.BELOW, 0.40,
                        GatingScoreOperation.SET, 0.40),
                gatingRule(1, GatingSelection.SPECIFIC_CHILD, "p2",
                        GatingComparisonOperator.ABOVE_OR_EQUAL, 0.80,
                        GatingScoreOperation.ADD, 0.10),
                gatingRule(2, GatingSelection.ALL_CHILDREN, null,
                        GatingComparisonOperator.ABOVE, 0.20,
                        GatingScoreOperation.SUBTRACT, 0.05));

        assertEquals(0.45, scoringService.applyGatingRules(0.72, children, rules));
    }

    @Test
    void gatingRules_roundHalfUpClampAndTreatEmptySelectionsAsFalse() {
        assertEquals(0.35, scoringService.roundAndClampNormalized(0.345));
        assertEquals(1.0, scoringService.applyGatingRules(
                0.96,
                List.of(new MaturityScoringService.ChildScore("Q1", 0.5)),
                List.of(gatingRule(0, GatingSelection.ALL_CHILDREN, null,
                        GatingComparisonOperator.EQUAL, 0.50,
                        GatingScoreOperation.ADD, 0.10))));
        assertEquals(0.25, scoringService.applyGatingRules(
                0.25,
                List.of(),
                List.of(gatingRule(0, GatingSelection.ALL_CHILDREN, null,
                        GatingComparisonOperator.ABOVE_OR_EQUAL, 0.0,
                        GatingScoreOperation.SET, 1.0))));
        assertEquals(0.0, scoringService.applyGatingRules(
                0.03,
                List.of(new MaturityScoringService.ChildScore("Q1", 0.5)),
                List.of(gatingRule(0, GatingSelection.SPECIFIC_CHILD, "Q1",
                        GatingComparisonOperator.BELOW_OR_EQUAL, 0.50,
                        GatingScoreOperation.SUBTRACT, 0.10))));
    }

    private GatingRule gatingRule(
            int order,
            GatingSelection selection,
            String childCode,
            GatingComparisonOperator operator,
            double threshold,
            GatingScoreOperation operation,
            double value) {
        GatingRule rule = new GatingRule();
        rule.setOrder(order);
        rule.setSelection(selection);
        rule.setChildCode(childCode);
        rule.setOperator(operator);
        rule.setThreshold(BigDecimal.valueOf(threshold));
        rule.setOperation(operation);
        rule.setValue(BigDecimal.valueOf(value));
        return rule;
    }

    private DimensionMappingRule mappingRule(int level, double minimumScore) {
        DimensionMappingRule rule = new DimensionMappingRule();
        rule.setLevelNumber(level);
        rule.setMinimumScore(minimumScore);
        return rule;
    }

    // ============================================================
    // resolveMaxLevelNumber
    // ============================================================

    @Test
    @DisplayName("resolveMaxLevelNumber: null or empty -> 5")
    void resolveMaxLevelNumber_defaults() {
        assertEquals(5, scoringService.resolveMaxLevelNumber(null));
        assertEquals(5, scoringService.resolveMaxLevelNumber(List.of()));
    }

    @Test
    @DisplayName("resolveMaxLevelNumber: uses max number")
    void resolveMaxLevelNumber_fromList() {
        MaturityLevel a = new MaturityLevel();
        a.setNumber(1);
        MaturityLevel b = new MaturityLevel();
        b.setNumber(4);
        assertEquals(4, scoringService.resolveMaxLevelNumber(List.of(a, b)));
    }

    // ============================================================
    // getLevelName tests
    // ============================================================

    @Test
    @DisplayName("getLevelName: should return name from provided levels")
    void getLevelName_fromList() {
        List<MaturityLevel> levels = new ArrayList<>();
        MaturityLevel ml = new MaturityLevel();
        ml.setNumber(3);
        ml.setName("Defined Process");
        levels.add(ml);

        assertEquals("Defined Process", scoringService.getLevelName(3, levels));
    }

    @Test
    @DisplayName("getLevelName: should fallback to default names when levels is null")
    void getLevelName_nullLevels() {
        assertEquals("Not Implemented", scoringService.getLevelName(1, null));
        assertEquals("Initial", scoringService.getLevelName(2, null));
        assertEquals("Managed", scoringService.getLevelName(3, null));
        assertEquals("Defined", scoringService.getLevelName(4, null));
        assertEquals("Optimised", scoringService.getLevelName(5, null));
    }

    @Test
    @DisplayName("getLevelName: should fallback to 'Level N' for unknown levels")
    void getLevelName_unknownLevel() {
        assertEquals("Level 99", scoringService.getLevelName(99, null));
    }

    @Test
    @DisplayName("getLevelName: should fallback when level not found in list")
    void getLevelName_notInList() {
        List<MaturityLevel> levels = new ArrayList<>();
        MaturityLevel ml = new MaturityLevel();
        ml.setNumber(1);
        ml.setName("Beginner");
        levels.add(ml);

        assertEquals("Managed", scoringService.getLevelName(3, levels));
    }

    // ============================================================
    // Integration-style tests: normalize + map
    // ============================================================

    @Test
    @DisplayName("End-to-end: average 1.0 on 5-scale should map to level 1")
    void endToEnd_minAverage() {
        double pct = scoringService.normalizeToPercentage(1.0, 5);
        int level = scoringService.mapScoreToLevel(pct, 5);
        assertEquals(0.0, pct);
        assertEquals(1, level);
    }

    @Test
    @DisplayName("End-to-end: average 3.0 on 5-scale should map to level 3 (50% band)")
    void endToEnd_midAverage() {
        double pct = scoringService.normalizeToPercentage(3.0, 5);
        int level = scoringService.mapScoreToLevel(pct, 5);
        assertEquals(50.0, pct);
        assertEquals(3, level);
    }

    @Test
    @DisplayName("End-to-end: average 5.0 on 5-scale should map to level 5")
    void endToEnd_maxAverage() {
        double pct = scoringService.normalizeToPercentage(5.0, 5);
        int level = scoringService.mapScoreToLevel(pct, 5);
        assertEquals(100.0, pct);
        assertEquals(5, level);
    }
}
