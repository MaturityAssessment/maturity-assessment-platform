package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.assessments.models.AssessmentElementResult;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentProfiling;
import com.master_thesis.maturity_assessment.assessments.models.TargetProfileComparison;
import com.master_thesis.maturity_assessment.assessments.models.TargetProfileComparison.RequirementResult;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelDTO;
import com.master_thesis.maturity_assessment.maturity_models.models.TargetProfileConfiguration;
import com.master_thesis.maturity_assessment.maturity_models.models.TargetProfileConfiguration.*;

import java.util.*;

/** Pure validation, routing, and comparison. Profiling never participates in scoring. */
public final class TargetProfiles {
    private TargetProfiles() {}
    private static IllegalOperationException invalid(String message) {
        return new IllegalOperationException("INVALID_TARGET_PROFILES", message);
    }
    private static void require(boolean valid, String message) { if (!valid) throw invalid(message); }
    private static boolean text(String value, int max) { return value != null && !value.isBlank() && value.length() <= max; }
    private static boolean identity(String value) { return value != null && value.matches("[A-Za-z0-9_-]{1,80}"); }
    private static String key(String type, String dimension, String module) {
        return type + "/" + Objects.toString(dimension, "").toLowerCase(Locale.ROOT) + "/" + Objects.toString(module, "").toLowerCase(Locale.ROOT);
    }

    public static void validate(MaturityModelDTO model) {
        var config = model.getTargetProfiles();
        if (config == null) return;
        require(config.version() == 1, "Unsupported target-profile configuration version.");
        require(config.profiles() != null && !config.profiles().isEmpty() && config.profiles().size() <= 128,
                "Define between 1 and 128 target profiles, or remove profiling.");
        require(config.questions() != null && !config.questions().isEmpty() && config.questions().size() <= 128,
                "Define between 1 and 128 profiling questions.");
        Map<String, ProfilingQuestion> questions = new LinkedHashMap<>();
        Set<String> profiles = new HashSet<>();
        Set<String> available = new HashSet<>();
        if (model.getDimensions() != null) for (var dimension : model.getDimensions()) {
            available.add(key("dimension", dimension.getId(), null));
            if (dimension.getModules() != null) for (var module : dimension.getModules()) {
                if (!Boolean.FALSE.equals(module.getVisible())) available.add(key("module", dimension.getId(), module.getCode()));
            }
        }
        Set<Integer> levels = new HashSet<>();
        if (model.getLevels() != null) model.getLevels().forEach(level -> levels.add(level.getNumber()));
        for (var profile : config.profiles()) {
            require(profile != null && identity(profile.id()) && profiles.add(profile.id()), "Profile IDs must be unique stable identities.");
            require(text(profile.name(), 200), "Every profile needs a name of at most 200 characters.");
            require(profile.description() == null || profile.description().length() <= 4000, "Profile descriptions must be at most 4,000 characters.");
            require(profile.expectedLevel() == null || levels.contains(profile.expectedLevel()), "The expected level must belong to the model's maturity scale.");
            require(profile.requirements() != null && profile.requirements().size() <= 2048, "Invalid profile requirements.");
            Set<String> targets = new HashSet<>();
            for (var target : profile.requirements()) {
                require(target != null && Set.of("dimension", "module").contains(Objects.toString(target.elementType(), "")), "Target a dimension or a module.");
                require(target.minimumScore() != null && Double.isFinite(target.minimumScore()) && target.minimumScore() >= 0 && target.minimumScore() <= 1,
                        "Target scores must be between 0 and 1.");
                require(text(target.dimensionCode(), 100) && ("module".equals(target.elementType()) ? text(target.moduleCode(), 100) : target.moduleCode() == null), "Invalid target reference.");
                String reference = key(target.elementType(), target.dimensionCode(), target.moduleCode());
                require(available.contains(reference), "A target references a missing dimension or a hidden/missing module: " + reference);
                require(targets.add(reference), "A profile cannot target the same element twice.");
            }
        }
        for (var question : config.questions()) {
            require(question != null && identity(question.id()) && questions.putIfAbsent(question.id(), question) == null,
                    "Profiling question IDs must be unique stable identities.");
            require(text(question.text(), 1000), "Every profiling question needs text of at most 1,000 characters.");
            require(question.options() != null && question.options().size() >= 2 && question.options().size() <= 32,
                    "Each profiling question needs between 2 and 32 options.");
            Set<String> options = new HashSet<>();
            for (var option : question.options()) {
                require(option != null && identity(option.id()) && options.add(option.id()), "Option IDs must be unique within their question.");
                require(text(option.label(), 200), "Every profiling option needs a label of at most 200 characters.");
            }
        }
        require(questions.containsKey(config.rootQuestionId()), "Select a valid first profiling question.");
        Map<String, Integer> incoming = new HashMap<>();
        for (var question : questions.values()) for (var option : question.options()) {
            var destination = option.destination();
            require(destination != null && Set.of("question", "profile", "none").contains(Objects.toString(destination.type(), "")), "Every option needs a valid destination.");
            switch (destination.type()) {
                case "question" -> {
                    require(questions.containsKey(destination.id()), "An option references a missing question.");
                    require(incoming.merge(destination.id(), 1, Integer::sum) == 1, "Each follow-up question must have one parent option.");
                }
                case "profile" -> require(profiles.contains(destination.id()), "An option references a missing profile.");
                default -> require(destination.id() == null, "A no-profile destination cannot reference another item.");
            }
        }
        require(!incoming.containsKey(config.rootQuestionId()), "The first question cannot have a parent.");
        Set<String> visited = new HashSet<>();
        visit(config.rootQuestionId(), questions, visited, new HashSet<>());
        require(visited.size() == questions.size(), "All profiling questions must be reachable from the first question; remove disconnected questions or cycles.");
    }

    private static void visit(String id, Map<String, ProfilingQuestion> questions, Set<String> visited, Set<String> stack) {
        require(stack.add(id), "Profiling questions cannot form a cycle.");
        if (visited.add(id)) for (var option : questions.get(id).options()) {
            if ("question".equals(option.destination().type())) visit(option.destination().id(), questions, visited, stack);
        }
        stack.remove(id);
    }

    public static AssessmentProfiling resolve(TargetProfileConfiguration config, Map<String, String> supplied) {
        Map<String, String> answers = supplied == null ? Map.of() : supplied;
        require(answers.size() <= 128, "Too many profiling answers.");
        Map<String, String> path = new LinkedHashMap<>();
        Map<String, ProfilingQuestion> questions = new HashMap<>();
        config.questions().forEach(question -> questions.put(question.id(), question));
        String id = config.rootQuestionId();
        Set<String> visited = new HashSet<>();
        while (true) {
            require(visited.add(id) && visited.size() <= 128, "Invalid profiling path.");
            var question = questions.get(id);
            require(question != null, "Invalid profiling question.");
            String answer = answers.get(id);
            if (answer == null) {
                require(answers.keySet().equals(path.keySet()), "Profiling answers must follow the selected path.");
                return new AssessmentProfiling(false, path, null, null);
            }
            var option = question.options().stream().filter(item -> item.id().equals(answer)).findFirst()
                    .orElseThrow(() -> invalid("Unknown profiling option."));
            path.put(id, answer);
            var destination = option.destination();
            if ("question".equals(destination.type())) { id = destination.id(); continue; }
            require(answers.keySet().equals(path.keySet()), "Profiling answers must follow the selected path.");
            if ("none".equals(destination.type())) return new AssessmentProfiling(true, path, null, null);
            var profile = config.profiles().stream().filter(item -> item.id().equals(destination.id())).findFirst()
                    .orElseThrow(() -> invalid("Unknown target profile."));
            return new AssessmentProfiling(true, path, profile.id(), profile.name());
        }
    }

    public static TargetProfileComparison compare(TargetProfileConfiguration config, AssessmentProfiling profiling,
                                                   List<AssessmentElementResult> elements, Integer finalLevel) {
        if (config == null) return null;
        if (profiling == null || !profiling.complete()) return unavailable("PROFILING_INCOMPLETE", null, null);
        if (profiling.profileId() == null) return unavailable("NO_PROFILE", null, null);
        var profile = config.profiles().stream().filter(item -> item.id().equals(profiling.profileId())).findFirst().orElse(null);
        if (profile == null) return unavailable("PROFILE_UNAVAILABLE", profiling.profileId(), profiling.profileName());
        Map<String, AssessmentElementResult> scores = new HashMap<>();
        for (var element : elements == null ? List.<AssessmentElementResult>of() : elements) {
            scores.put(key(element.elementType(), element.dimensionId(), "module".equals(element.elementType()) ? element.moduleCode() : null), element);
        }
        List<RequirementResult> results = new ArrayList<>();
        for (var requirement : profile.requirements()) {
            var element = scores.get(key(requirement.elementType(), requirement.dimensionCode(), requirement.moduleCode()));
            var dimension = scores.get(key("dimension", requirement.dimensionCode(), null));
            String name = element == null ? requirement.dimensionCode() + (requirement.moduleCode() == null ? "" : " / " + requirement.moduleCode())
                    : "module".equals(requirement.elementType()) && dimension != null ? dimension.name() + " / " + element.name() : element.name();
            boolean valid = element != null && "computed".equals(element.state()) && element.normalizedScore() != null && Double.isFinite(element.normalizedScore());
            results.add(result(requirement.elementType(), requirement.dimensionCode(), requirement.moduleCode(),
                    name,
                    requirement.minimumScore(), valid ? element.normalizedScore() : null,
                    element != null && "flagForReview".equals(element.state()) ? "REVIEW_REQUIRED" : "SCORE_UNAVAILABLE"));
        }
        if (profile.expectedLevel() != null) results.add(result("overall", null, null, "Overall maturity level", profile.expectedLevel(),
                finalLevel == null ? null : finalLevel.doubleValue(), "SCORE_UNAVAILABLE"));
        String status = results.stream().anyMatch(item -> "NOT_MET".equals(item.status())) ? "NOT_MET"
                : results.isEmpty() || results.stream().anyMatch(item -> "NOT_EVALUATED".equals(item.status())) ? "NOT_EVALUATED" : "MET";
        return new TargetProfileComparison(status, results.isEmpty() ? "NO_REQUIREMENTS" : "NOT_EVALUATED".equals(status) ? "SCORES_UNAVAILABLE" : null,
                profile.id(), profile.name(), results);
    }

    private static RequirementResult result(String type, String dimension, String module, String name, double target, Double actual, String unavailable) {
        return new RequirementResult(type, dimension, module, name, target, actual,
                actual == null ? "NOT_EVALUATED" : actual >= target ? "MET" : "NOT_MET", actual == null ? unavailable : null);
    }
    private static TargetProfileComparison unavailable(String reason, String id, String name) {
        return new TargetProfileComparison("NOT_EVALUATED", reason, id, name, List.of());
    }
}
