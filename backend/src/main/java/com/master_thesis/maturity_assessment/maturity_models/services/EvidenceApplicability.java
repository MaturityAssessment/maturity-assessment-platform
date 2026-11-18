package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.maturity_models.models.*;
import java.util.List;
import java.util.function.Predicate;

public final class EvidenceApplicability {
    private EvidenceApplicability() {}
    public static boolean active(EvidenceRequirement requirement, Practice practice, Predicate<Question> visible) {
        return (practice.getQuestions() == null ? List.<Question>of() : practice.getQuestions()).stream()
                .anyMatch(q -> visible.test(q) && (requirement.getQuestionCodes() == null
                        || requirement.getQuestionCodes().stream().anyMatch(code -> code.equalsIgnoreCase(q.getCode()))));
    }
}
