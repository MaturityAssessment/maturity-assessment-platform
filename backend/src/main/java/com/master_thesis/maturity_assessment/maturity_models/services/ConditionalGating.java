package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionDTO;
import com.master_thesis.maturity_assessment.maturity_models.models.ConditionalGatingRule;
import java.util.*;

/** Fixed two-level AND grammar. No source-code evaluation, recursion, cross-owner references or implicit coercions. */
public final class ConditionalGating {
    private ConditionalGating() {}
    private static final Set<String> NUMERIC = Set.of("score", "coverage", "includedCount");
    private static final Set<String> RELATIONS = Set.of("<", "<=", "==", "!=", ">=", ">");
    private static final Set<String> STATES = Set.of("computed", "withheld", "flagForReview", "unanswered", "unscored");
    public record Definition(QuestionDTO question) { public boolean isQuestion() { return question != null; } }
    /** Values are finalized child results. Answer is a typed raw value, option ID, ID set, or explicit N/A object. */
    public record Child(String code, Double score, String state, Double coverage, Double includedCount, boolean answered, JsonNode answer) {}
    public record Effects(boolean withheld, boolean flagged) {}

    public static void validate(List<ConditionalGatingRule> rules, Map<String, Definition> children, String owner) {
        if (rules == null) return;
        if (rules.size() > 100) fail(owner, "supports at most 100 conditional rules");
        for (int index = 0; index < rules.size(); index++) {
            String at = owner + ", conditional rule " + (index + 1);
            var rule = rules.get(index);
            if (rule == null || !Integer.valueOf(1).equals(rule.version()) || !Set.of("withheld", "flagForReview").contains(rule.effect() == null ? "" : rule.effect()))
                fail(at, "requires version 1 and effect withheld or flagForReview");
            if (rule.name() != null && (rule.name().isBlank() || rule.name().length() > 255)) fail(at, "name must contain 1–255 characters");
            if (rule.description() != null && rule.description().length() > 2000) fail(at, "description must contain at most 2000 characters");
            JsonNode root = rule.when();
            shape(root, at, Set.of("kind", "conditions"), Set.of());
            kind(root, "and", at); array(root.get("conditions"), at, 1, 50);
            for (JsonNode clause : root.get("conditions")) {
                shape(clause, at, Set.of("kind", "quantifier", "selection", "where"), Set.of());
                kind(clause, "children", at);
                if (!Set.of("any", "every", "no").contains(clause.path("quantifier").asText())) fail(at, "requires any/every/no");
                shape(clause.get("selection"), at, Set.of(), Set.of("codes"));
                Collection<Definition> selected = children.values();
                if (clause.get("selection").has("codes")) {
                    JsonNode codes = clause.get("selection").get("codes"); array(codes, at, 1, 1000);
                    Set<String> unique = new HashSet<>(); List<Definition> definitions = new ArrayList<>();
                    for (JsonNode code : codes) {
                        if (!code.isTextual() || !children.containsKey(code.textValue()) || !unique.add(code.textValue()))
                            fail(at, "selection codes must be distinct full identifiers of direct children");
                        definitions.add(children.get(code.textValue()));
                    }
                    selected = definitions;
                }
                JsonNode where = clause.get("where");
                shape(where, at, Set.of("kind", "conditions"), Set.of()); kind(where, "and", at); array(where.get("conditions"), at, 1, 50);
                for (JsonNode comparison : where.get("conditions")) {
                    shape(comparison, at, Set.of("kind", "field", "operator", "right"), Set.of()); kind(comparison, "comparison", at);
                    String field = text(comparison.get("field"), at), operator = text(comparison.get("operator"), at);
                    JsonNode right = comparison.get("right");
                    if ("field".equals(right == null ? "" : right.path("kind").asText())) {
                        shape(right, at, Set.of("kind", "code", "field"), Set.of());
                        if (!NUMERIC.contains(field) || !field.equals(right.path("field").asText()) || !children.containsKey(right.path("code").asText()))
                            fail(at, "field references must use the same numeric field on one fully identified direct child");
                        validateField(children.get(right.path("code").asText()), field, at);
                    } else {
                        shape(right, at, Set.of("kind", "value"), Set.of()); kind(right, "literal", at);
                    }
                    // Even an empty definition set must not admit unknown fields/operators.
                    if (selected.isEmpty()) fail(at, "requires defined child elements");
                    for (Definition definition : selected) {
                        validateField(definition, field, at);
                        validateComparison(definition, field, operator, right, at);
                    }
                }
            }
        }
    }

    private static void validateField(Definition definition, String field, String at) {
        Set<String> fields = definition.isQuestion() ? Set.of("score", "answer", "state", "answered") : Set.of("score", "coverage", "includedCount", "state");
        if (!fields.contains(field)) fail(at, "field '" + field + "' is unavailable for the selected child type");
    }
    private static void validateComparison(Definition definition, String field, String operator, JsonNode right, String at) {
        boolean literal = "literal".equals(right.path("kind").asText()); JsonNode value = right.get("value");
        if (NUMERIC.contains(field)) {
            if (!RELATIONS.contains(operator)) fail(at, "numeric fields require a numeric comparison operator");
            if (literal && (!number(value) || value.doubleValue() < 0 || value.doubleValue() > (field.equals("score") ? 1 : 100)))
                fail(at, "score literals use 0–1; coverage and includedCount literals use 0–100");
        } else if ("state".equals(field)) {
            if (!Set.of("is", "isNot").contains(operator) || !literal || !value.isTextual() || !STATES.contains(value.textValue())) fail(at, "invalid state comparison");
            if (!definition.isQuestion() && Set.of("unanswered", "unscored").contains(value.textValue())) fail(at, "unanswered/unscored states apply only to questions");
        } else if ("answered".equals(field)) {
            if (!Set.of("==", "!=").contains(operator) || !literal || !value.isBoolean()) fail(at, "answered requires a boolean literal and == or !=");
        } else {
            if (!literal) fail(at, "answer comparisons require literal values");
            QuestionDTO q = definition.question();
            if (isNa(value)) {
                if (!Boolean.TRUE.equals(q.getAllowNotApplicable()) || !Set.of("==", "!=").contains(operator)) fail(at, "N/A comparisons require enabled N/A and == or !=");
                return;
            }
            String type = q.getType();
            if (Set.of("likert", "numeric", "percentage").contains(type)) {
                double min = "likert".equals(type) ? 1 : q.getRangeMin() == null ? 0 : q.getRangeMin();
                double max = "likert".equals(type) ? q.getScalePointCount() == null ? 5 : q.getScalePointCount() : q.getRangeMax() == null ? 100 : q.getRangeMax();
                if (!RELATIONS.contains(operator) || !number(value) || value.doubleValue() != Math.rint(value.doubleValue()) || value.doubleValue() < min || value.doubleValue() > max) fail(at, "answer threshold must be an integer within the question's response range");
            } else if ("multiple_selection".equals(type)) {
                if ("contains".equals(operator)) option(q, value, at);
                else if (Set.of("containsAny", "containsAll").contains(operator)) {
                    array(value, at, 1, 100); Set<String> ids = new HashSet<>();
                    for (JsonNode id : value) { option(q, id, at); if (!ids.add(id.asText())) fail(at, "option IDs must be distinct"); }
                } else fail(at, "multiple-selection answers require contains/containsAny/containsAll");
            } else {
                if (!Set.of("==", "!=").contains(operator)) fail(at, "this answer type supports == and !=");
                if ("boolean".equals(type) && !value.isBoolean()) fail(at, "boolean answers require true or false");
                else if ("multiple_choice".equals(type)) option(q, value, at);
                else if ("open_answer".equals(type) && (!value.isTextual() || value.textValue().length() > 10000)) fail(at, "text answers require a text literal of at most 10000 characters");
                else if (!Set.of("boolean", "multiple_choice", "open_answer").contains(type)) fail(at, "unsupported answer type");
            }
        }
    }
    private static void option(QuestionDTO q, JsonNode id, String at) {
        if (!id.isTextual() || q.getChoices() == null || q.getChoices().stream().noneMatch(c -> id.textValue().equals(c.getId()))) fail(at, "answer must identify a configured option by its stable option ID");
    }

    public static Effects evaluate(List<ConditionalGatingRule> rules, List<Child> children) {
        boolean withheld = false, flagged = false;
        Map<String, Child> byCode = new HashMap<>(); children.forEach(child -> byCode.put(child.code(), child));
        for (var rule : rules == null ? List.<ConditionalGatingRule>of() : rules) {
            boolean matched = true;
            for (JsonNode clause : rule.when().get("conditions")) {
                Set<String> codes = null;
                if (clause.get("selection").has("codes")) { codes = new HashSet<>(); for (JsonNode code : clause.get("selection").get("codes")) codes.add(code.asText()); }
                List<Child> selected = new ArrayList<>();
                for (Child child : children) if (codes == null || codes.contains(child.code())) selected.add(child);
                java.util.function.Predicate<Child> predicate = child -> {
                    for (JsonNode comparison : clause.get("where").get("conditions")) if (!compare(child, comparison, byCode)) return false;
                    return true;
                };
                boolean clauseMatches = switch (clause.path("quantifier").asText()) {
                    case "any" -> selected.stream().anyMatch(predicate);
                    case "every" -> selected.stream().allMatch(predicate);
                    case "no" -> selected.stream().noneMatch(predicate);
                    default -> throw new IllegalStateException("Unvalidated gating quantifier");
                };
                if (!clauseMatches) { matched = false; break; }
            }
            if (matched) { withheld |= "withheld".equals(rule.effect()); flagged |= "flagForReview".equals(rule.effect()); }
        }
        return new Effects(withheld, flagged);
    }
    private static boolean compare(Child child, JsonNode comparison, Map<String, Child> children) {
        String field = comparison.get("field").asText(), op = comparison.get("operator").asText();
        JsonNode left = field(child, field), operand = comparison.get("right");
        JsonNode right = "literal".equals(operand.get("kind").asText()) ? operand.get("value") : field(children.get(operand.get("code").asText()), operand.get("field").asText());
        if (left == null || left.isNull() || right == null || right.isNull()) return false;
        if ("state".equals(field)) {
            boolean same = left.equals(right) || ("computed".equals(right.asText()) && "flagForReview".equals(left.asText()));
            return "is".equals(op) ? same : !same;
        }
        if (number(left) && number(right)) {
            double a = left.doubleValue(), b = right.doubleValue();
            double epsilon = "coverage".equals(field) || "includedCount".equals(field) ? 1e-7 : 1e-9;
            return switch (op) { case "<" -> a < b - epsilon; case "<=" -> a <= b + epsilon;
                case "==" -> Math.abs(a-b) <= epsilon; case "!=" -> Math.abs(a-b) > epsilon;
                case ">=" -> a >= b - epsilon; case ">" -> a > b + epsilon; default -> false; };
        }
        if ("contains".equals(op)) return left.isArray() && contains(left, right);
        if ("containsAny".equals(op)) { if (!left.isArray()) return false; for (JsonNode v : right) if (contains(left, v)) return true; return false; }
        if ("containsAll".equals(op)) { if (!left.isArray()) return false; for (JsonNode v : right) if (!contains(left, v)) return false; return true; }
        return "==".equals(op) ? left.equals(right) : "!=".equals(op) && !left.equals(right);
    }
    private static boolean contains(JsonNode array, JsonNode value) { for (JsonNode entry : array) if (entry.equals(value)) return true; return false; }
    private static JsonNode field(Child child, String name) {
        if (child == null) return null;
        var f = JsonNodeFactory.instance;
        return switch (name) {
            case "score" -> numericValue(child.score());
            case "state" -> child.state() == null ? null : f.textNode(child.state());
            case "coverage" -> numericValue(child.coverage());
            case "includedCount" -> numericValue(child.includedCount());
            case "answered" -> f.booleanNode(child.answered()); case "answer" -> child.answer(); default -> null;
        };
    }
    private static JsonNode numericValue(Double value) {
        return value == null || !Double.isFinite(value) ? null : JsonNodeFactory.instance.numberNode(value);
    }

    public static JsonNode answerValue(String type, Object response, Integer choiceIndex,
            List<com.master_thesis.maturity_assessment.maturity_models.dto.QuestionChoiceDTO> choices,
            com.fasterxml.jackson.databind.ObjectMapper mapper) {
        if (response == null) return null;
        JsonNode raw = mapper.valueToTree(response);
        if (isNa(raw)) return raw;
        if ("boolean".equals(type)) {
            if (raw.isBoolean()) return raw;
            if (raw.isTextual()) {
                String value = raw.textValue().trim();
                if ("true".equalsIgnoreCase(value) || "1".equals(value)) return JsonNodeFactory.instance.booleanNode(true);
                if ("false".equalsIgnoreCase(value) || "0".equals(value)) return JsonNodeFactory.instance.booleanNode(false);
            }
            if (raw.isNumber() && (raw.doubleValue() == 0 || raw.doubleValue() == 1)) return JsonNodeFactory.instance.booleanNode(raw.doubleValue() == 1);
            return null;
        }
        if (Set.of("likert", "numeric", "percentage").contains(type)) {
            if (raw.isNumber()) return Double.isFinite(raw.doubleValue()) ? raw : null;
            if (raw.isTextual()) { try { return JsonNodeFactory.instance.numberNode(Integer.parseInt(raw.textValue())); } catch (NumberFormatException ignored) { return null; } }
            return null;
        }
        if ("open_answer".equals(type)) return raw.isValueNode() ? JsonNodeFactory.instance.textNode(raw.asText()) : null;
        if ("multiple_choice".equals(type)) {
            if (choices == null) return null;
            if (choiceIndex != null) return choiceIndex >= 0 && choiceIndex < choices.size() && choices.get(choiceIndex).getId() != null
                    ? JsonNodeFactory.instance.textNode(choices.get(choiceIndex).getId()) : null;
            // Legacy answers without choice identity are usable only if their score identifies exactly one option.
            final double value;
            try { value = raw.isNumber() ? raw.doubleValue() : raw.isTextual() ? Double.parseDouble(raw.textValue()) : Double.NaN; }
            catch (NumberFormatException ignored) { return null; }
            if (!Double.isFinite(value)) return null;
            var matches = choices.stream().filter(c -> c.getScore() != null && Math.abs(c.getScore() - value) <= 1e-9).toList();
            return matches.size() == 1 && matches.getFirst().getId() != null ? JsonNodeFactory.instance.textNode(matches.getFirst().getId()) : null;
        }
        if ("multiple_selection".equals(type)) {
            if (!raw.isArray() || choices == null) return null;
            var ids = JsonNodeFactory.instance.arrayNode();
            for (JsonNode index : raw) {
                if (!index.isNumber() || index.doubleValue() != Math.rint(index.doubleValue()) || index.intValue() < 0 || index.intValue() >= choices.size() || choices.get(index.intValue()).getId() == null) return null;
                ids.add(choices.get(index.intValue()).getId());
            }
            return ids;
        }
        return raw;
    }

    public static boolean isNa(JsonNode value) { return value != null && value.isObject() && value.size() == 1 && value.path("notApplicable").isBoolean() && value.path("notApplicable").booleanValue(); }
    private static boolean number(JsonNode value) { return value != null && value.isNumber() && Double.isFinite(value.doubleValue()); }
    private static void shape(JsonNode node, String at, Set<String> required, Set<String> optional) {
        if (node == null || !node.isObject()) fail(at, "requires a structured object");
        for (String key : required) if (!node.hasNonNull(key)) fail(at, "requires '" + key + "'");
        node.fieldNames().forEachRemaining(key -> { if (!required.contains(key) && !optional.contains(key)) fail(at, "unknown property '" + key + "'"); });
    }
    private static String text(JsonNode node, String at) { if (node == null || !node.isTextual()) fail(at, "requires text fields"); return node.textValue(); }
    private static void kind(JsonNode node, String expected, String at) { if (!expected.equals(text(node.get("kind"), at))) fail(at, "requires kind '" + expected + "'"); }
    private static void array(JsonNode node, String at, int min, int max) { if (node == null || !node.isArray() || node.size() < min || node.size() > max) fail(at, "requires an array with " + min + "–" + max + " entries"); }
    private static void fail(String at, String reason) { throw new IllegalOperationException("INVALID_GATING_RULES", at + ": " + reason + "."); }
}
