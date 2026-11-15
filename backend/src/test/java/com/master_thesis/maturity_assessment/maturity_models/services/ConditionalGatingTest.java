package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.*;
import com.master_thesis.maturity_assessment.maturity_models.models.ConditionalGatingRule;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ConditionalGatingTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final JsonNodeFactory json = JsonNodeFactory.instance;
    private final String a = "D.M.P1", b = "D.M.P2";
    private ConditionalGatingRule rule(String quantifier, List<String> codes, String field, String op, Object value) {
        ObjectNode right = json.objectNode().put("kind", "literal").set("value", mapper.valueToTree(value));
        return ruleWithRight(quantifier, codes, field, op, right);
    }
    private ConditionalGatingRule ruleWithRight(String quantifier, List<String> codes, String field, String op, ObjectNode right) {
        ObjectNode comparison = json.objectNode().put("kind", "comparison").put("field", field).put("operator", op).set("right", right);
        ObjectNode where = json.objectNode().put("kind", "and").set("conditions", json.arrayNode().add(comparison));
        ObjectNode selection = json.objectNode(); if (codes != null) selection.set("codes", mapper.valueToTree(codes));
        ObjectNode clause = json.objectNode().put("kind", "children").put("quantifier", quantifier).set("selection", selection); clause.set("where", where);
        ObjectNode when = json.objectNode().put("kind", "and").set("conditions", json.arrayNode().add(clause));
        return new ConditionalGatingRule(1, when, "flagForReview");
    }
    private Map<String, ConditionalGating.Definition> aggregateDefinitions() {
        return Map.of(a, new ConditionalGating.Definition(null), b, new ConditionalGating.Definition(null));
    }
    private ConditionalGating.Child child(String code, Double score, String state, double coverage) {
        return new ConditionalGating.Child(code, score, state, coverage, coverage, true, null);
    }
    private boolean matches(ConditionalGatingRule rule, ConditionalGating.Child... children) {
        return ConditionalGating.evaluate(List.of(rule), List.of(children)).flagged();
    }
    private QuestionDTO question(String type) {
        var q = new QuestionDTO(); q.setType(type); q.setAllowNotApplicable(true); q.setScalePointCount(5); q.setRangeMin(0); q.setRangeMax(100);
        var first = new QuestionChoiceDTO(); first.setId("option-a"); first.setLabel("First"); first.setScore(0.5); first.setRawValue(1.0);
        var second = new QuestionChoiceDTO(); second.setId("option-b"); second.setLabel("Second"); second.setScore(0.5); second.setRawValue(2.0);
        q.setChoices(List.of(first, second)); return q;
    }
    @Test void quantifiersAndExplicitSelectionsHaveTheirUsualTruthTables() {
        var low = child(a, 0.2, "computed", 80); var high = child(b, 0.8, "computed", 90);
        for (String quantifier : List.of("any", "every", "no")) {
            var rule = rule(quantifier, null, "score", "<", 0.5); ConditionalGating.validate(List.of(rule), aggregateDefinitions(), "D.M");
            assertEquals(quantifier.equals("any"), matches(rule, low, high));
            assertEquals(!quantifier.equals("any"), matches(rule));
        }
        assertFalse(matches(rule("any", List.of(b), "score", "<", 0.5), low, high));
        assertTrue(matches(rule("every", List.of(b), "score", ">", 0.5), low, high));
    }
    @Test void andOnOneChildDiffersFromAndAcrossIndependentSelections() {
        var first = child(a, 0.2, "computed", 100); var second = child(b, 0.8, "computed", 20);
        var sameChild = rule("any", null, "score", "<", 0.5);
        var coverage = rule("any", null, "coverage", "<", 50);
        ((ArrayNode)sameChild.when().at("/conditions/0/where/conditions")).add(coverage.when().at("/conditions/0/where/conditions/0"));
        assertFalse(matches(sameChild, first, second));
        var separate = rule("any", null, "score", "<", 0.5);
        ((ArrayNode)separate.when().get("conditions")).add(coverage.when().at("/conditions/0"));
        assertTrue(matches(separate, first, second));
    }
    @Test void numericReferencesUseFinalValuesOfOneFullyQualifiedDirectChild() {
        var right = json.objectNode().put("kind", "field").put("code", b).put("field", "coverage");
        var rule = ruleWithRight("any", List.of(a), "coverage", ">", right);
        ConditionalGating.validate(List.of(rule), aggregateDefinitions(), "D.M");
        assertTrue(matches(rule, child(a, 0.2, "computed", 80), child(b, null, "withheld", 50)));
        assertFalse(matches(rule, child(a, 0.2, "computed", 80))); // referenced child not presented
        for (String code : List.of("P2", "D.OTHER.P2", "D.M", "D.M.P2.Q")) {
            right.put("code", code);
            assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(rule), aggregateDefinitions(), "D.M"));
        }
    }
    @Test void missingScoresNeverCompareEvenWithNotEqualAndFlagsMatchComputed() {
        var withheld = child(a, null, "withheld", 50);
        for (String operator : List.of("<", "<=", "==", "!=", ">=", ">")) assertFalse(matches(rule("any", null, "score", operator, 0.5), withheld));
        var flagged = child(a, 0.8, "flagForReview", 100);
        assertTrue(matches(rule("any", null, "state", "is", "computed"), flagged));
        assertFalse(matches(rule("any", null, "state", "isNot", "computed"), flagged));
        assertTrue(matches(rule("any", null, "state", "is", "flagForReview"), flagged));
    }
    @Test void numericComparisonsRespectToleranceAndDoNotRoundToPercentIntegers() {
        for (String op : List.of("==", "<=", ">=")) assertTrue(matches(rule("any", null, "score", op, 0.4), child(a, 0.39999999999999997, "computed", 100)));
        for (String op : List.of("!=", "<", ">")) assertFalse(matches(rule("any", null, "score", op, 0.4), child(a, 0.39999999999999997, "computed", 100)));
        assertTrue(matches(rule("any", null, "coverage", ">", 70.1), child(a, 0.5, "computed", 70.15)));
    }
    @Test void schemaRejectsUnsupportedShapesTypesFieldsAndUnits() {
        for (var invalid : List.of(rule("any", null, "score", "==", "0.5"), rule("any", null, "score", ">", 70),
                rule("any", null, "includedCount", "<", -1), rule("any", null, "coverage", "==", true),
                rule("any", null, "level", "==", 1), rule("any", List.of(a,a), "score", "==", 1),
                rule("any", List.of(), "score", "==", 1), rule("some", null, "score", "==", 1),
                rule("any", null, "state", "==", "computed"), rule("any", null, "state", "is", "unanswered")))
            assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(invalid), aggregateDefinitions(), "D.M"));
        for (String kind : List.of("or", "not", "eval")) {
            var invalid = rule("any", null, "score", "==", 1); ((ObjectNode)invalid.when()).put("kind", kind);
            assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(invalid), aggregateDefinitions(), "D.M"));
        }
        var extra = rule("any", null, "score", "==", 1); ((ObjectNode)extra.when()).put("unexpected", true);
        assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(extra), aggregateDefinitions(), "D.M"));
        var empty = rule("any", null, "score", "==", 1); ((ArrayNode)empty.when().get("conditions")).removeAll();
        assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(empty), aggregateDefinitions(), "D.M"));
        var crossField = ruleWithRight("any", null, "score", "==", json.objectNode().put("kind","field").put("code",b).put("field","coverage"));
        assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(crossField), aggregateDefinitions(), "D.M"));
    }
    @Test void questionFieldsAndAnswerTypesAreValidatedAcrossEverySelectedQuestion() {
        var booleanDefinition = Map.of(a, new ConditionalGating.Definition(question("boolean")));
        for (var invalid : List.of(rule("any", null, "coverage", ">", 10), rule("any", null, "includedCount", ">", 0),
                rule("any", null, "answer", "==", 1), rule("any", null, "answered", "==", "true")))
            assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(invalid), booleanDefinition, "D.M"));
        ConditionalGating.validate(List.of(rule("any", null, "answer", "==", false)), booleanDefinition, "D.M");
        var mixed = Map.of(a, booleanDefinition.get(a), b, new ConditionalGating.Definition(question("numeric")));
        assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(rule("any", null, "answer", "==", false)), mixed, "D.M"));
        ConditionalGating.validate(List.of(rule("any", List.of(a), "answer", "==", false)), mixed, "D.M");
        for (String type : List.of("likert", "numeric", "percentage")) {
            var defs = Map.of(a, new ConditionalGating.Definition(question(type)));
            ConditionalGating.validate(List.of(rule("any", null, "answer", ">=", 3)), defs, "D.M");
            assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(rule("any", null, "answer", "==", 3.5)), defs, "D.M"));
        }
    }
    @Test void choicesUseOptionIdentityEvenWhenScoresAreIdenticalAndSelectionsUseMembership() {
        var q = question("multiple_choice");
        assertEquals("option-b", ConditionalGating.answerValue(q.getType(), 0.5, 1, q.getChoices(), mapper).asText());
        assertNull(ConditionalGating.answerValue(q.getType(), 0.5, null, q.getChoices(), mapper));
        assertNull(ConditionalGating.answerValue(q.getType(), 0.5, 9, q.getChoices(), mapper));
        ConditionalGating.validate(List.of(rule("any", null, "answer", "==", "option-b")), Map.of(a, new ConditionalGating.Definition(q)), "D.M");
        assertThrows(IllegalOperationException.class, () -> ConditionalGating.validate(List.of(rule("any", null, "answer", "==", "Second")), Map.of(a, new ConditionalGating.Definition(q)), "D.M"));
        q.setType("multiple_selection");
        var answer = ConditionalGating.answerValue(q.getType(), List.of(1), null, q.getChoices(), mapper);
        var child = new ConditionalGating.Child(a, 0.7, "computed", null, null, true, answer);
        assertTrue(matches(rule("any", null, "answer", "contains", "option-b"), child));
        assertTrue(matches(rule("any", null, "answer", "containsAny", List.of("option-a", "option-b")), child));
        assertFalse(matches(rule("any", null, "answer", "containsAll", List.of("option-a", "option-b")), child));
        assertFalse(matches(rule("any", null, "answer", "contains", "option-b"), new ConditionalGating.Child(a, 0.0, "computed", null, null, true, json.arrayNode())));
        ConditionalGating.validate(List.of(rule("any", null, "answer", "containsAll", List.of("option-a", "option-b"))), Map.of(a, new ConditionalGating.Definition(q)), "D.M");
    }
    @Test void naAndMissingAnswersAreDistinctAndEffectsAccumulateWithoutOverwriting() {
        var q = question("boolean"); var na = Map.of("notApplicable", true);
        var rule = rule("any", null, "answer", "==", na);
        ConditionalGating.validate(List.of(rule), Map.of(a, new ConditionalGating.Definition(q)), "D.M");
        var child = new ConditionalGating.Child(a, 0.0, "computed", null, null, true, mapper.valueToTree(na));
        assertTrue(matches(rule, child));
        assertFalse(matches(rule, new ConditionalGating.Child(a, null, "unanswered", null, null, false, null)));
        var withhold = new ConditionalGatingRule(1, rule.when(), "withheld");
        assertEquals(new ConditionalGating.Effects(true, true), ConditionalGating.evaluate(List.of(rule, withhold), List.of(child)));
        assertEquals(new ConditionalGating.Effects(true, true), ConditionalGating.evaluate(List.of(withhold, rule), List.of(child)));
    }
    @Test void answerNormalizationMatchesAcceptedResponseRepresentationsWithoutConfusingAnswersAndScores() {
        for (Object answer : List.of(false, 0, "false", "FALSE", "0"))
            assertEquals(json.booleanNode(false), ConditionalGating.answerValue("boolean", answer, null, null, mapper));
        assertEquals(json.numberNode(70), ConditionalGating.answerValue("percentage", "70", null, null, mapper));
        assertEquals(json.textNode("5"), ConditionalGating.answerValue("open_answer", "5", null, null, mapper));
        assertNull(ConditionalGating.answerValue("numeric", "not numeric", null, null, mapper));
        var noScore = child(a, Double.NaN, "unscored", 100);
        assertFalse(matches(rule("any", null, "score", "!=", 0), noScore));
    }

    @Test void serializationIsVersionedAndRejectsUnknownRootFieldsOrCoercion() throws Exception {
        var rule = rule("any", null, "coverage", ">", 70);
        assertEquals(rule, mapper.readValue(mapper.writeValueAsString(rule), ConditionalGatingRule.class));
        for (String json : List.of("{\"version\":\"1\",\"when\":{},\"effect\":\"withheld\"}", "{\"version\":1,\"when\":{},\"effect\":\"withheld\",\"ignored\":true}"))
            assertThrows(Exception.class, () -> mapper.readValue(json, ConditionalGatingRule.class));
    }
}
