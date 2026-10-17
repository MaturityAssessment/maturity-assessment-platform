package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.maturity_models.dto.*;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import org.junit.jupiter.api.Test;
import java.nio.file.Path;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class QuestionDependenciesTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void sharedActivationFixtures() throws Exception {
        var fixtures = mapper.readTree(Path.of("../tests/fixtures/question-dependencies.json").toFile());
        for (var fixture : fixtures.get("cases")) {
            var parent = mapper.treeToValue(fixtures.get("parents").get(fixture.get("parent").asText()), QuestionDTO.class);
            var condition = mapper.treeToValue(fixture.get("condition"), DependencyCondition.class);
            var answer = new QuestionDependencies.Answer(mapper.convertValue(fixture.get("value"), Object.class),
                    fixture.has("choiceIndex") ? fixture.get("choiceIndex").intValue() : null);
            assertEquals(fixture.get("expected").booleanValue(), QuestionDependencies.matches(parent.getType(), condition,
                    answer, parent.getScalePointCount() == null ? 5 : parent.getScalePointCount(), parent.getChoices()), fixture.get("name").asText());
        }
    }

    @Test
    void conditionJsonRejectsCoercedAnswers() {
        assertThrows(Exception.class, () -> mapper.readValue("{\"type\":\"likert\",\"points\":[3.5]}", DependencyCondition.class));
        assertThrows(Exception.class, () -> mapper.readValue("{\"type\":\"boolean\",\"answers\":[\"true\"]}", DependencyCondition.class));
        assertThrows(Exception.class, () -> mapper.readValue("{\"type\":\"multiple_choice\",\"optionIds\":[1]}", DependencyCondition.class));
    }

    @Test
    void staleDescendantAnswersCannotActivateThroughAnInactiveAncestor() {
        Question root = new Question(); root.setId(1L); root.setType("boolean");
        Question parent = new Question(); parent.setId(2L); parent.setType("likert"); parent.setDependsOnQuestion(root);
        Question child = new Question(); child.setId(3L); child.setDependsOnQuestion(parent);
        DependencyCondition condition = new DependencyCondition(); condition.setType("likert"); condition.setPoints(List.of(3));
        child.setDependencyCondition(condition);
        Map<Long, QuestionDependencies.Answer> answers = Map.of(1L, new QuestionDependencies.Answer(0, null), 2L, new QuestionDependencies.Answer(3, null));
        assertFalse(QuestionDependencies.active(child, answers::get, mapper));
        root.setDependsOnQuestion(child);
        assertFalse(QuestionDependencies.active(child, answers::get, mapper));
    }

    @Test
    void invalidConditionsAreRejectedAndLegacyDefaultsAreExplicit() {
        QuestionDTO parent = new QuestionDTO(); parent.setType("boolean");
        QuestionDTO child = new QuestionDTO(); child.setCode("CHILD");
        QuestionDependencies.validate(child, parent);
        assertEquals(List.of(true), child.getDependencyCondition().getAnswers());
        assertThrows(IllegalOperationException.class, () -> QuestionDependencies.validate(child, null));
        parent.setType("open_answer");
        assertThrows(IllegalOperationException.class, () -> QuestionDependencies.validate(child, parent));
        parent.setType("multiple_choice");
        QuestionChoiceDTO option = new QuestionChoiceDTO(); option.setLabel("Option"); option.setScore(0.0);
        parent.setChoices(List.of(option)); QuestionDependencies.normalizeChoices(parent);
        String id = option.getId(); QuestionDependencies.normalizeChoices(parent); assertEquals(id, option.getId());
    }
}
