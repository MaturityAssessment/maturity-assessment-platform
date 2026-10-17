package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.DependencyCondition;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionChoiceDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionDTO;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import java.util.*;
import java.util.function.Function;

/** Activation matches respondent answers, never calculated/evaluator scores. */
public final class QuestionDependencies {
    private QuestionDependencies() {}
    public record Answer(Object value, Integer choiceIndex) {}

    public static void normalizeChoices(QuestionDTO question) {
        if (!"multiple_choice".equalsIgnoreCase(question.getType()) || question.getChoices() == null) return;
        Set<String> ids = new HashSet<>();
        for (QuestionChoiceDTO choice : question.getChoices()) {
            if (choice == null) fail(question, "has an invalid answer option.");
            if (choice.getId() == null || choice.getId().isBlank()) choice.setId(UUID.randomUUID().toString());
            if (choice.getId().length() > 100 || !ids.add(choice.getId())) fail(question, "has invalid or duplicate option IDs.");
        }
    }

    public static void validate(QuestionDTO child, QuestionDTO parent) {
        DependencyCondition condition = child.getDependencyCondition();
        if (parent == null) {
            if (condition != null) fail(child, "has activation answers without a parent question.");
            return;
        }
        if (condition == null && "boolean".equalsIgnoreCase(parent.getType())) {
            condition = DependencyCondition.affirmative();
            child.setDependencyCondition(condition);
        }
        if (condition == null || !Objects.equals(condition.getType(), parent.getType())) {
            fail(child, "needs activation answers matching the parent question type.");
        }
        boolean valid = switch (condition.getType()) {
            case "boolean" -> validList(condition.getAnswers()) && condition.getOptionIds() == null && condition.getPoints() == null;
            case "likert" -> validList(condition.getPoints()) && condition.getAnswers() == null && condition.getOptionIds() == null
                    && condition.getPoints().stream().allMatch(point -> point >= 1 && point <= (parent.getScalePointCount() == null ? 5 : parent.getScalePointCount()));
            case "multiple_choice" -> validList(condition.getOptionIds()) && condition.getAnswers() == null && condition.getPoints() == null
                    && parent.getChoices() != null && condition.getOptionIds().stream().allMatch(id -> parent.getChoices().stream().anyMatch(option -> id.equals(option.getId())));
            default -> false;
        };
        if (!valid) fail(child, "has missing or invalid activation answers. Use Yes / No, Multiple choice, or Scale questions in the same practice.");
    }

    private static boolean validList(List<?> values) {
        return values != null && !values.isEmpty() && values.stream().noneMatch(Objects::isNull) && new HashSet<>(values).size() == values.size();
    }

    private static void fail(QuestionDTO question, String message) {
        throw new IllegalOperationException("INVALID_QUESTION_DEPENDENCY", "Question '" + question.getCode() + "' " + message);
    }

    public static boolean active(Question child, Function<Long, Answer> answers, ObjectMapper mapper) {
        return active(child, answers, mapper, Collections.newSetFromMap(new IdentityHashMap<>()));
    }

    private static boolean active(Question child, Function<Long, Answer> answers, ObjectMapper mapper, Set<Question> visiting) {
        if (!visiting.add(child)) return false;
        try {
            Question parent = child.getDependsOnQuestion();
            if (parent == null) return child.getDependencyCondition() == null;
            if (parent.getId() == null || !active(parent, answers, mapper, visiting)) return false;
            Answer answer = answers.apply(parent.getId());
            if (answer == null) return false;
            List<QuestionChoiceDTO> options = List.of();
            if ("multiple_choice".equals(parent.getType())) {
                try { options = mapper.readValue(parent.getChoiceOptions(), new TypeReference<List<QuestionChoiceDTO>>() {}); }
                catch (Exception exception) { return false; }
            }
            return matches(parent.getType(), child.getDependencyCondition(), answer,
                    parent.getScalePointCount() == null ? 5 : parent.getScalePointCount(), options);
        } finally { visiting.remove(child); }
    }

    public static boolean matches(String type, DependencyCondition condition, Answer answer, int pointCount, List<QuestionChoiceDTO> options) {
        if (answer == null || answer.value() == null || "".equals(answer.value())) return false;
        if (!(answer.value() instanceof String || answer.value() instanceof Number || answer.value() instanceof Boolean)) return false;
        if (condition == null && "boolean".equals(type)) condition = DependencyCondition.affirmative();
        if (condition == null || !type.equals(condition.getType())) return false;
        QuestionDTO parent = new QuestionDTO();
        parent.setType(type);
        parent.setScalePointCount(pointCount);
        parent.setChoices(options);
        QuestionDTO child = new QuestionDTO();
        child.setDependencyCondition(condition);
        try { validate(child, parent); }
        catch (IllegalOperationException exception) { return false; }
        Object value = answer.value();
        if ("boolean".equals(type)) {
            Boolean parsed = switch (String.valueOf(value).toLowerCase(Locale.ROOT)) {
                case "true", "yes", "1", "1.0" -> true;
                case "false", "no", "0", "0.0" -> false;
                default -> null;
            };
            return parsed != null && condition.getAnswers() != null && condition.getAnswers().contains(parsed);
        }
        double number;
        try { number = Double.parseDouble(String.valueOf(value)); }
        catch (NumberFormatException exception) { return false; }
        if (!Double.isFinite(number)) return false;
        if ("likert".equals(type)) {
            return number == Math.rint(number) && number >= 1 && number <= pointCount
                    && condition.getPoints() != null && condition.getPoints().contains((int) number);
        }
        if (!"multiple_choice".equals(type) || options == null || condition.getOptionIds() == null) return false;
        Integer index = answer.choiceIndex();
        if (index == null) {
            // Historical score-only answers are usable only if the option is unambiguous.
            for (int i = 0; i < options.size(); i++) {
                Double score = options.get(i).getScore();
                if (score != null && Math.abs(score - number) <= 1e-9) {
                    if (index != null) return false;
                    index = i;
                }
            }
        }
        if (index == null || index < 0 || index >= options.size()) return false;
        QuestionChoiceDTO selected = options.get(index);
        return selected.getScore() != null && Math.abs(selected.getScore() - number) <= 1e-9
                && selected.getId() != null && condition.getOptionIds().contains(selected.getId());
    }
}
