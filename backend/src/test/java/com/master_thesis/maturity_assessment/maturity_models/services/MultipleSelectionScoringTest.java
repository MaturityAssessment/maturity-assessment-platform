package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionChoiceDTO;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class MultipleSelectionScoringTest {
    private QuestionChoiceDTO option(double rawValue) {
        var option = new QuestionChoiceDTO();
        option.setLabel("Option");
        option.setRawValue(rawValue);
        return option;
    }

    @Test
    void cumulativeScoringPreservesEqualValueOptionsAndExplicitNone() {
        var options = List.of(option(2), option(2), option(6), option(0));
        assertEquals(0.4, MultipleSelectionScoring.score(List.of(0, 1), options), 1e-12);
        assertEquals(1.0, MultipleSelectionScoring.score(List.of(0, 1, 2, 3), options));
        assertEquals(0.0, MultipleSelectionScoring.score(List.of(), options));
        assertEquals(0.0, MultipleSelectionScoring.score(List.of(3), options));
    }

    @Test
    void rejectsForgedScoresDuplicatesAndInvalidIndexes() {
        var options = List.of(option(2), option(8));
        for (Object response : List.of(0.8, "0", List.of(0, 0), List.of(-1), List.of(2),
                List.of(0.5), List.of("0"), List.of(Double.NaN))) {
            assertThrows(ResponseStatusException.class, () -> MultipleSelectionScoring.score(response, options));
        }
    }

    @Test
    void rejectsNegativeNonFiniteAndZeroTotalConfiguration() {
        for (var options : List.of(List.of(option(-1)), List.of(option(0)),
                List.of(option(Double.NaN)), List.of(option(Double.POSITIVE_INFINITY)),
                List.of(option(Double.MAX_VALUE), option(Double.MAX_VALUE)))) {
            assertThrows(ResponseStatusException.class, () -> MultipleSelectionScoring.validateOptions(options));
        }
        assertThrows(ResponseStatusException.class, () -> MultipleSelectionScoring.validateOptions(List.of()));
    }
}
