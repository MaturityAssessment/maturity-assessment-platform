package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ScoreLimitsTest {
    private final ChildStateGatingRule flag = new ChildStateGatingRule("any", "computed", "flagForReview", "Check", null);
    private ScoreLimit limit(String kind, double value) { return new ScoreLimit(kind, value, flag, null); }
    private ScoreLimits.Bounds bounds(List<ScoreLimit> limits, boolean matches) {
        return ScoreLimits.evaluate(limits, List.of(flag), List.of(), rule -> matches, rule -> false);
    }

    @Test void strongestMatchingBoundsWinInEitherOrderAndEqualBoundsAreValid() {
        var limits = new ArrayList<>(List.of(limit("floor", 0.2), limit("floor", 0.4), limit("ceiling", 0.8), limit("ceiling", 0.6)));
        for (int order = 0; order < 2; order++) {
            var bounds = bounds(limits, true);
            assertEquals(0.4, bounds.apply(0.1)); assertEquals(0.6, bounds.apply(0.9));
            assertEquals(0.5, bounds.apply(0.5)); assertNull(bounds.apply(null)); assertFalse(bounds.invalid());
            Collections.reverse(limits);
        }
        var equal = bounds(List.of(limit("floor", 0.555), limit("ceiling", 0.555)), true);
        assertFalse(equal.invalid()); assertEquals(0.555, equal.apply(0.9));
    }

    @Test void onlyActiveBoundsCanConflict() {
        var limits = List.of(limit("floor", 0.8), limit("ceiling", 0.2));
        assertTrue(bounds(limits, true).invalid()); assertNull(bounds(limits, true).apply(0.5));
        assertFalse(bounds(limits, false).invalid()); assertEquals(0.5, bounds(limits, false).apply(0.5));
    }

    @Test void linksRequireExactlyOneUnchangedExistingFlagRuleButIgnoreRuleOrder() throws Exception {
        var original = limit("floor", 0.4);
        var other = new ChildStateGatingRule("no", "withheld", "flagForReview");
        assertDoesNotThrow(() -> ScoreLimits.validate(List.of(original), List.of(other, flag), List.of(), "D"));
        assertFalse(ScoreLimits.linked(original, List.of(), List.of()));
        assertFalse(ScoreLimits.linked(original, List.of(new ChildStateGatingRule("every", "computed", "flagForReview", "Check", null)), List.of()));
        assertFalse(ScoreLimits.linked(original, List.of(new ChildStateGatingRule("any", "computed", "flagForReview", "Renamed", null)), List.of()));
        var mapper = new ObjectMapper();
        var conditional = mapper.readValue("""
            {"version":1,"effect":"flagForReview","when":{"kind":"and","conditions":[]}}
            """, ConditionalGatingRule.class);
        var linked = new ScoreLimit("ceiling", 0.7, null, conditional);
        assertTrue(ScoreLimits.linked(linked, List.of(), List.of(conditional)));
        assertFalse(ScoreLimits.linked(new ScoreLimit("ceiling", 0.7, flag, conditional), List.of(flag), List.of(conditional)));
        assertEquals(linked, mapper.readValue(mapper.writeValueAsBytes(linked), ScoreLimit.class));
        assertEquals(0.7, ScoreLimits.evaluate(List.of(linked), List.of(), List.of(conditional), r -> false, r -> true).apply(1.0));
    }

    @Test void malformedValuesStaleLinksAndWithholdLinksAreRejected() {
        var withheld = new ChildStateGatingRule("any", "computed", "withheld");
        var invalid = new ArrayList<>(Arrays.asList(null,
                new ScoreLimit(null, 0.5, flag, null), new ScoreLimit("cap", 0.5, flag, null),
                new ScoreLimit("floor", null, flag, null), new ScoreLimit("floor", 0.5, null, null),
                new ScoreLimit("floor", 0.5, withheld, null)));
        for (double value : new double[]{-0.1, 1.1, Double.NaN, Double.POSITIVE_INFINITY}) invalid.add(limit("floor", value));
        for (var entry : invalid) {
            var error = assertThrows(IllegalOperationException.class,
                    () -> ScoreLimits.validate(Collections.singletonList(entry), List.of(flag, withheld), List.of(), "D"));
            assertEquals("INVALID_SCORE_LIMITS", error.getErrorCode());
        }
        assertThrows(IllegalOperationException.class, () -> ScoreLimits.validate(List.of(limit("floor", 0.5)), List.of(), List.of(), "D"));
        assertTrue(ScoreLimits.evaluate(List.of(limit("floor", 0.5)), List.of(), List.of(), r -> true, r -> true).invalid());
        assertThrows(IllegalOperationException.class, () -> ScoreLimits.validate(Collections.nCopies(101, limit("floor", 0.5)), List.of(flag), List.of(), "D"));
    }

    @Test void conditionalLinksCompareNumericValuesRatherThanTheirJsonEncoding() throws Exception {
        var mapper = new ObjectMapper();
        String json = """
            {"version":1,"effect":"flagForReview","when":{"kind":"and","conditions":[
              {"kind":"children","quantifier":"any","selection":{"codes":["D.M"]},
               "where":{"kind":"and","conditions":[
                 {"kind":"comparison","field":"score","operator":"<","right":{"kind":"literal","value":1}}
               ]}}
            ]}}
            """;
        var rule = mapper.readValue(json, ConditionalGatingRule.class);
        var snapshot = mapper.readValue(json.replace("\"value\":1", "\"value\":1.0"), ConditionalGatingRule.class);
        ConditionalGating.validate(List.of(rule), Map.of("D.M", new ConditionalGating.Definition(null)), "D");
        var limit = new ScoreLimit("ceiling", 0.7, null, snapshot);
        assertDoesNotThrow(() -> ScoreLimits.validate(List.of(limit), List.of(), List.of(rule), "D"));
        assertEquals(0.7, ScoreLimits.evaluate(List.of(limit), List.of(), List.of(rule), r -> false, r -> true).apply(1.0));
        var changed = mapper.readValue(json.replace("\"value\":1", "\"value\":0.9999999999"), ConditionalGatingRule.class);
        assertFalse(ScoreLimits.linked(limit, List.of(), List.of(changed)));
        assertFalse(ScoreLimits.linked(limit, List.of(), List.of(new ConditionalGatingRule(1, rule.when(), "withheld"))));
        assertFalse(ScoreLimits.linked(limit, List.of(), List.of(new ConditionalGatingRule(1, rule.when(), "flagForReview", "Renamed", null))));
    }
}
