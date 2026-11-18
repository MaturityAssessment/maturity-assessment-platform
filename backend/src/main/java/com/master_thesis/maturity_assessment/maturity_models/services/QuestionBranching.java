package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.*;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.*;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import java.util.*;
import java.util.function.Function;

/** Practice-local DAG and three-valued, answer-only conditions. A score is never an answer. */
public final class QuestionBranching {
    private QuestionBranching() {}
    private static String key(String code) { return code.toLowerCase(Locale.ROOT); }
    private static void fail(String message) { throw new IllegalOperationException("INVALID_QUESTION_BRANCHING", message); }

    public static void validate(PracticeDTO practice) {
        Map<String, QuestionDTO> questions = new LinkedHashMap<>();
        for (var q : practice.getQuestions()) questions.put(key(q.getCode()), q);
        Map<String, Set<String>> edges = new LinkedHashMap<>();
        for (var q : practice.getQuestions()) {
            Set<String> parents = new LinkedHashSet<>();
            if (q.getBranchingRule() != null) {
                if (q.getDependsOnQuestionId() != null || q.getDependsOnQuestionCode() != null && !q.getDependsOnQuestionCode().isBlank() || q.getDependencyCondition() != null)
                    fail(q.getCode() + ": choose either branching or a legacy dependency.");
                if (!Integer.valueOf(1).equals(q.getBranchingRule().version())) fail(q.getCode() + ": unsupported branching version.");
                validateExpression(q.getBranchingRule().when(), questions, parents, 0, new int[]{0});
            } else if (q.getDependsOnQuestionCode() != null && !q.getDependsOnQuestionCode().isBlank()) parents.add(key(q.getDependsOnQuestionCode()));
            else if (q.getDependsOnQuestionId() != null) practice.getQuestions().stream()
                    .filter(candidate -> q.getDependsOnQuestionId().equals(candidate.getId())).findFirst().ifPresent(parent -> parents.add(key(parent.getCode())));
            if (parents.contains(key(q.getCode()))) fail(q.getCode() + ": cannot depend on itself.");
            if (q.getHiddenScore() != null && (!Double.isFinite(q.getHiddenScore()) || q.getHiddenScore() < 0 || q.getHiddenScore() > 1 || parents.isEmpty()))
                fail(q.getCode() + ": a hidden score requires a dependency and a normalized value from 0 to 1.");
            edges.put(key(q.getCode()), parents);
        }
        Set<String> visited = new HashSet<>();
        for (String code : edges.keySet()) visit(code, edges, new HashSet<>(), visited);
        for (var requirement : practice.getEvidenceRequirements()) if (requirement.getQuestionCodes() != null) {
            var codes = requirement.getQuestionCodes();
            Set<String> seen = new HashSet<>();
            if (codes.isEmpty() || codes.size() > 1000) fail("Evidence group must contain questions in its practice.");
            for (String code : codes) if (code == null || !questions.containsKey(key(code)) || !seen.add(key(code)))
                fail("Evidence group must reference distinct existing questions in its practice.");
        }
    }

    private static void visit(String code, Map<String, Set<String>> edges, Set<String> visiting, Set<String> visited) {
        if (visited.contains(code)) return;
        if (!visiting.add(code)) fail("Question branching and dependencies cannot contain cycles.");
        for (String parent : edges.getOrDefault(code, Set.of())) visit(parent, edges, visiting, visited);
        visiting.remove(code); visited.add(code);
    }

    private static void shape(JsonNode node, String... fields) {
        if (node == null || !node.isObject() || node.size() != fields.length) fail("Invalid branching expression shape.");
        for (String field : fields) if (!node.hasNonNull(field)) fail("Missing branching field: " + field);
    }
    private static void validateExpression(JsonNode node, Map<String, QuestionDTO> questions, Set<String> parents, int depth, int[] count) {
        if (depth > 20 || ++count[0] > 200) fail("Branching supports at most 200 expression nodes and depth 20.");
        String kind = node == null ? "" : node.path("kind").asText();
        switch (kind) {
            case "and", "or" -> {
                shape(node, "kind", "conditions");
                var children = node.get("conditions");
                if (!children.isArray() || children.isEmpty() || children.size() > 100) fail("AND/OR requires 1–100 conditions.");
                for (var child : children) validateExpression(child, questions, parents, depth + 1, count);
            }
            case "not" -> { shape(node, "kind", "condition"); validateExpression(node.get("condition"), questions, parents, depth + 1, count); }
            case "parent" -> {
                shape(node, "kind", "code", "predicate");
                if (!node.get("code").isTextual()) fail("Parent code must be text.");
                String code = key(node.get("code").textValue());
                var parent = questions.get(code);
                if (parent == null || !parents.add(code)) fail("Each parent must appear once and belong to the same practice.");
                var predicate = node.get("predicate");
                String mode = predicate.path("kind").asText();
                if ("answered".equals(mode)) shape(predicate, "kind");
                else if ("in".equals(mode)) {
                    shape(predicate, "kind", "values");
                    var values = predicate.get("values");
                    if (!values.isArray() || values.isEmpty() || values.size() > 1000) fail("Accepted values requires 1–1000 values.");
                    Set<String> unique = new HashSet<>();
                    for (var value : values) if (!validValue(parent, value) || !unique.add(value.isNumber()
                            ? "number:" + value.decimalValue().stripTrailingZeros().toPlainString() : value.toString())) fail("Invalid or duplicate accepted answer for " + parent.getCode());
                } else fail("Parent predicate must be answered or in.");
            }
            default -> fail("Branching supports parent, and, or and not expressions only.");
        }
    }

    private static boolean validValue(QuestionDTO q, JsonNode value) {
        if (ConditionalGating.isNa(value)) return Boolean.TRUE.equals(q.getAllowNotApplicable());
        return switch (q.getType()) {
            case "boolean" -> value.isBoolean();
            case "multiple_choice", "multiple_selection" -> value.isTextual() && q.getChoices() != null
                    && q.getChoices().stream().anyMatch(c -> value.textValue().equals(c.getId()));
            case "likert", "numeric", "percentage" -> value.isNumber() && Double.isFinite(value.doubleValue())
                    && value.doubleValue() == Math.rint(value.doubleValue())
                    && value.doubleValue() >= ("likert".equals(q.getType()) ? 1 : q.getRangeMin() == null ? 0 : q.getRangeMin())
                    && value.doubleValue() <= ("likert".equals(q.getType()) ? q.getScalePointCount() == null ? 5 : q.getScalePointCount() : q.getRangeMax() == null ? 100 : q.getRangeMax());
            case "open_answer" -> value.isTextual() && !value.textValue().isBlank() && value.textValue().length() <= 10000;
            default -> false;
        };
    }

    public static Map<Question, Boolean> resolve(List<Question> questions, Function<Long, QuestionDependencies.Answer> answers, ObjectMapper mapper) {
        Map<Question, Boolean> memo = new IdentityHashMap<>();
        for (var question : questions) active(question, answers, mapper, memo, Collections.newSetFromMap(new IdentityHashMap<>()));
        return memo;
    }
    public static boolean active(Question question, Function<Long, QuestionDependencies.Answer> answers, ObjectMapper mapper) {
        return active(question, answers, mapper, new IdentityHashMap<>(), Collections.newSetFromMap(new IdentityHashMap<>()));
    }
    private static boolean active(Question question, Function<Long, QuestionDependencies.Answer> answers, ObjectMapper mapper,
                                  Map<Question, Boolean> memo, Set<Question> visiting) {
        if (memo.containsKey(question)) return memo.get(question);
        if (!visiting.add(question)) return false;
        boolean result;
        try {
            if (question.getBranchingRule() != null) result = Boolean.TRUE.equals(evaluate(question.getBranchingRule().when(), code -> {
                var siblings = question.getPractice() == null ? List.<Question>of() : question.getPractice().getQuestions();
                Question parent = siblings == null ? null : siblings.stream().filter(q -> q.getCode().equalsIgnoreCase(code)).findFirst().orElse(null);
                if (parent == null || !active(parent, answers, mapper, memo, visiting)) return null;
                return typedAnswer(parent, answers.apply(parent.getId()), mapper);
            }));
            else {
                Question parent = question.getDependsOnQuestion();
                if (parent == null) result = question.getDependencyCondition() == null;
                else result = parent.getId() != null && active(parent, answers, mapper, memo, visiting)
                        && QuestionDependencies.matches(parent.getType(), question.getDependencyCondition(), answers.apply(parent.getId()),
                            parent.getScalePointCount() == null ? 5 : parent.getScalePointCount(), choices(parent, mapper));
            }
        } finally { visiting.remove(question); }
        memo.put(question, result); return result;
    }
    private static List<QuestionChoiceDTO> choices(Question q, ObjectMapper mapper) {
        try { return mapper.readValue("multiple_selection".equals(q.getType()) ? q.getSelectionOptions() : q.getChoiceOptions(), new TypeReference<List<QuestionChoiceDTO>>() {}); }
        catch (Exception ignored) { return List.of(); }
    }
    private static JsonNode typedAnswer(Question q, QuestionDependencies.Answer answer, ObjectMapper mapper) {
        if (answer == null || answer.value() == null || answer.value() instanceof String s && s.isBlank()) return null;
        var choices = choices(q, mapper);
        Object raw = answer.value();
        if (raw instanceof String text && Set.of("likert", "numeric", "percentage").contains(q.getType())) {
            try { raw = Double.parseDouble(text.trim()); } catch (NumberFormatException ignored) { return null; }
        }
        if ("boolean".equals(q.getType()) && (raw instanceof String || raw instanceof Number)) {
            raw = switch (String.valueOf(raw).trim().toLowerCase(Locale.ROOT)) {
                case "true", "yes", "1", "1.0" -> true;
                case "false", "no", "0", "0.0" -> false;
                default -> raw;
            };
        }
        JsonNode value = ConditionalGating.answerValue(q.getType(), raw, answer.choiceIndex(), choices, mapper);
        if (value == null) return null;
        QuestionDTO definition = new QuestionDTO(); definition.setType(q.getType()); definition.setAllowNotApplicable(q.getAllowNotApplicable());
        definition.setRangeMin(q.getRangeMin()); definition.setRangeMax(q.getRangeMax()); definition.setScalePointCount(q.getScalePointCount()); definition.setChoices(choices);
        if ("multiple_selection".equals(q.getType()) && value.isArray()) {
            Set<JsonNode> unique = new HashSet<>();
            for (var selected : value) if (!unique.add(selected)) return null;
            return value;
        }
        if (!validValue(definition, value)) return null;
        if ("multiple_choice".equals(q.getType()) && !ConditionalGating.isNa(value) && answer.choiceIndex() != null) {
            try { double score = Double.parseDouble(String.valueOf(answer.value()));
                if (Math.abs(choices.get(answer.choiceIndex()).getScore() - score) > 1e-9) return null;
            } catch (Exception ignored) { return null; }
        }
        return value;
    }
    /** null is unknown, so NOT cannot turn an unavailable parent into a match. */
    public static Boolean evaluate(JsonNode node, Function<String, JsonNode> answers) {
        return switch (node.path("kind").asText()) {
            case "not" -> { Boolean child = evaluate(node.get("condition"), answers); yield child == null ? null : !child; }
            case "and", "or" -> {
                boolean and = "and".equals(node.get("kind").asText()), unknown = false, decisive = false;
                for (var child : node.get("conditions")) { Boolean value = evaluate(child, answers);
                    if (value == null) unknown = true; else if (and != value) { decisive = true; break; }
                }
                if (decisive) yield !and;
                if (unknown) yield null;
                yield and;
            }
            case "parent" -> {
                JsonNode answer = answers.apply(node.get("code").asText());
                if (answer == null) yield null;
                var predicate = node.get("predicate");
                if ("answered".equals(predicate.get("kind").asText())) yield true;
                boolean matched = answer.isArray();
                boolean hasOption = false;
                for (var accepted : predicate.get("values")) {
                    // N/A is an alternative to an option set, never a required selection.
                    if (answer.isArray() && accepted.isObject() && accepted.path("notApplicable").asBoolean(false)) continue;
                    hasOption = true;
                    boolean same = equivalent(answer, accepted);
                    if (answer.isArray()) { same = false; for (var selected : answer) same |= equivalent(selected, accepted); matched &= same; }
                    else matched |= same;
                }
                yield matched && (!answer.isArray() || hasOption);
            }
            default -> null;
        };
    }
    private static boolean equivalent(JsonNode a, JsonNode b) {
        return a.isNumber() && b.isNumber() ? a.decimalValue().compareTo(b.decimalValue()) == 0 : a.equals(b);
    }
}
