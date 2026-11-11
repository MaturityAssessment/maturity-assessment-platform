package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

/** Completion is about required respondent content, independent of numeric scores. */
final class ModulePrerequisites {
    private ModulePrerequisites() {}

    record State(boolean locked, boolean complete, List<String> missing) {}

    static Map<Module, State> states(MaturityModel model, Predicate<Question> active,
                                    Predicate<Question> answered, Set<Long> evidencePractices) {
        Map<Module, State> states = new IdentityHashMap<>();
        for (Dimension dimension : safe(model.getDimensions())) {
            Map<String, Module> prior = new HashMap<>();
            for (Module module : safe(dimension.getModules())) {
                List<String> missing = new ArrayList<>();
                for (String code : safe(module.getPrerequisiteModuleCodes())) {
                    Module prerequisite = code == null ? null : prior.get(code.toLowerCase(Locale.ROOT));
                    if (prerequisite == null || !states.get(prerequisite).complete()) {
                        missing.add(prerequisite == null ? String.valueOf(code) : prerequisite.getName());
                    }
                }
                boolean locked = Boolean.FALSE.equals(module.getVisible()) || !missing.isEmpty();
                boolean complete = !locked;
                for (Practice practice : safe(module.getPractices())) {
                    List<Question> questions = safe(practice.getQuestions()).stream().filter(active).toList();
                    if (questions.stream().anyMatch(question -> Boolean.TRUE.equals(question.getRequired()) && !answered.test(question))
                            || (!questions.isEmpty() && Boolean.TRUE.equals(practice.getRequiresEvidence())
                            && !evidencePractices.contains(practice.getId()))) complete = false;
                }
                states.put(module, new State(locked, complete, missing));
                if (module.getCode() != null) prior.put(module.getCode().toLowerCase(Locale.ROOT), module);
            }
        }
        return states;
    }

    private static <T> List<T> safe(List<T> items) { return items == null ? List.of() : items; }
}
