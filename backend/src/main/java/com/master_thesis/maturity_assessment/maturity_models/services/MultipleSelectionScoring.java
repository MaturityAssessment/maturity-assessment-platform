package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionChoiceDTO;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.HashSet;
import java.util.List;

/** Responses contain zero-based option indexes, never client-calculated scores. */
public final class MultipleSelectionScoring {
    private MultipleSelectionScoring() {}

    public static void validateOptions(List<QuestionChoiceDTO> options) {
        if (options == null || options.isEmpty() || options.size() > 100) {
            throw invalid("Multiple Selection requires 1 to 100 options.");
        }
        double total = 0;
        for (QuestionChoiceDTO option : options) {
            if (option == null || option.getLabel() == null || option.getLabel().isBlank()
                    || option.getRawValue() == null || !Double.isFinite(option.getRawValue())
                    || option.getRawValue() < 0) {
                throw invalid("Each selection option requires a label and a finite, non-negative raw value.");
            }
            total += option.getRawValue();
        }
        if (!Double.isFinite(total) || total <= 0) {
            throw invalid("Selection option raw values must have a finite, positive total.");
        }
    }

    public static double score(Object response, List<QuestionChoiceDTO> options) {
        validateOptions(options);
        if (!(response instanceof List<?> selected)) {
            throw invalid("Multiple Selection responses must be arrays of option indexes.");
        }
        var seen = new HashSet<Integer>();
        double raw = 0;
        for (Object item : selected) {
            if (!(item instanceof Number number) || !Double.isFinite(number.doubleValue())
                    || number.doubleValue() != Math.rint(number.doubleValue())
                    || number.doubleValue() < 0 || number.doubleValue() >= options.size()
                    || !seen.add(number.intValue())) {
                throw invalid("Selection indexes must be unique integers referring to configured options.");
            }
            raw += options.get(number.intValue()).getRawValue();
        }
        return raw / options.stream().mapToDouble(QuestionChoiceDTO::getRawValue).sum();
    }

    private static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
