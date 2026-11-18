package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.assessments.models.*;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.*;
import com.master_thesis.maturity_assessment.maturity_models.models.TargetProfileConfiguration;
import com.master_thesis.maturity_assessment.maturity_models.models.TargetProfileConfiguration.*;
import org.junit.jupiter.api.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;

class TargetProfilesTest {
    static final ObjectMapper MAPPER = new ObjectMapper();
    static TargetProfileConfiguration configuration() {
        try { return MAPPER.treeToValue(MAPPER.readTree(Path.of("../tests/fixtures/target-profiles.json").toFile()).get("configuration"), TargetProfileConfiguration.class); }
        catch (Exception error) { throw new AssertionError(error); }
    }
    private MaturityModelDTO model(TargetProfileConfiguration config) {
        var model = MaturityModelExcelServiceTest.buildOfficialTemplateModel();
        var dimension = model.getDimensions().getFirst(); dimension.setId("D1");
        dimension.getModules().getFirst().setCode("M1");
        model.setTargetProfiles(config); return model;
    }
    private TargetProfileConfiguration profile(List<Requirement> requirements, Integer expected) {
        var config = configuration();
        return new TargetProfileConfiguration(1, config.rootQuestionId(), config.questions(), List.of(
            new TargetProfile("small-org", "Small organization", "", requirements, expected), config.profiles().getLast()));
    }
    private AssessmentElementResult score(String type, String state, Double value) {
        return new AssessmentElementResult(type, "D1", "module".equals(type) ? "M1" : null, null, null, null, type, state, value, 100, 100);
    }
    private TargetProfileComparison compare(TargetProfileConfiguration config, List<AssessmentElementResult> scores, Integer level) {
        return TargetProfiles.compare(config, TargetProfiles.resolve(config, Map.of("context", "small")), scores, level);
    }
    @TestFactory Stream<DynamicTest> sharedRoutingFixtures() throws Exception {
        var fixture = MAPPER.readTree(Path.of("../tests/fixtures/target-profiles.json").toFile());
        List<DynamicTest> tests = new ArrayList<>();
        for (var route : fixture.get("routes")) tests.add(DynamicTest.dynamicTest(route.get("name").asText(), () -> {
            Map<String,String> answers = MAPPER.convertValue(route.get("answers"), new com.fasterxml.jackson.core.type.TypeReference<>() {});
            var result = TargetProfiles.resolve(configuration(), answers);
            assertEquals(route.get("complete").asBoolean(), result.complete());
            assertEquals(route.get("profileId").isNull() ? null : route.get("profileId").asText(), result.profileId());
            assertEquals(answers, result.answers());
        }));
        return tests.stream();
    }
    @Test void validatesSelectedDimensionAndOptionalModuleTargets() {
        assertDoesNotThrow(() -> TargetProfiles.validate(model(configuration())));
        assertDoesNotThrow(() -> TargetProfiles.validate(model(null)));
    }
    @Test void rejectsInvalidScoresReferencesAndDuplicateRequirements() {
        for (double value : new double[]{ -0.01, 1.01, Double.NaN, Double.POSITIVE_INFINITY })
            assertThrows(IllegalOperationException.class, () -> TargetProfiles.validate(model(profile(List.of(new Requirement("dimension", "D1", null, value)), null))));
        assertThrows(IllegalOperationException.class, () -> TargetProfiles.validate(model(profile(List.of(new Requirement("module", "D1", "missing", .5)), null))));
        var target = new Requirement("dimension", "D1", null, .5);
        assertThrows(IllegalOperationException.class, () -> TargetProfiles.validate(model(profile(List.of(target, target), null))));
        assertThrows(IllegalOperationException.class, () -> TargetProfiles.validate(model(profile(List.of(), 99))));
        var hidden = model(configuration()); hidden.getDimensions().getFirst().getModules().getFirst().setVisible(false);
        assertThrows(IllegalOperationException.class, () -> TargetProfiles.validate(hidden));
    }
    @Test void rejectsCyclesDisconnectedQuestionsMultipleParentsAndDanglingDestinations() {
        for (Destination destination : List.of(new Destination("question", "context"), new Destination("question", "regulation"),
                new Destination("profile", "missing"), new Destination("none", "small-org"))) {
            var config = configuration(); var root = config.questions().getFirst();
            var options = new ArrayList<>(root.options()); options.set(0, new Option("small", "Small", destination));
            var questions = List.of(new ProfilingQuestion(root.id(), root.text(), options), config.questions().getLast());
            assertThrows(IllegalOperationException.class, () -> TargetProfiles.validate(model(new TargetProfileConfiguration(1, "context", questions, config.profiles()))));
        }
        var config = configuration();
        assertThrows(IllegalOperationException.class, () -> TargetProfiles.validate(model(new TargetProfileConfiguration(1, "regulation", config.questions(), config.profiles()))));
    }
    @Test void rejectsUnknownAndOffPathAnswers() {
        assertThrows(IllegalOperationException.class, () -> TargetProfiles.resolve(configuration(), Map.of("context", "missing")));
        assertThrows(IllegalOperationException.class, () -> TargetProfiles.resolve(configuration(), Map.of("context", "small", "regulation", "yes")));
        assertThrows(IllegalOperationException.class, () -> TargetProfiles.resolve(configuration(), Map.of("regulation", "yes")));
    }
    @Test void boundariesAndHigherExpectedLevelsAreInclusive() {
        var result = compare(configuration(), List.of(score("dimension", "computed", .6), score("module", "computed", .7)), 3);
        assertEquals("MET", result.status());
        assertEquals("MET", compare(configuration(), List.of(score("dimension", "computed", .8), score("module", "computed", 1.0)), 5).status());
        assertEquals("NOT_MET", compare(configuration(), List.of(score("dimension", "computed", .6), score("module", "computed", .7)), 2).status());
        assertEquals("MET", compare(profile(List.of(new Requirement("dimension", "D1", null, 0.0)), null), List.of(score("dimension", "computed", 0.0)), null).status());
    }
    @Test void anyFailureWinsOverUnavailableResultsRegardlessOfOrder() {
        var result = compare(configuration(), List.of(score("dimension", "computed", .59), score("module", "withheld", null)), null);
        assertEquals("NOT_MET", result.status());
        assertEquals(List.of("NOT_MET", "NOT_EVALUATED", "NOT_EVALUATED"), result.requirements().stream().map(TargetProfileComparison.RequirementResult::status).toList());
        assertEquals("NOT_MET", compare(configuration(), List.of(score("dimension", "withheld", null), score("module", "computed", .69)), null).status());
    }
    @Test void missingAndReviewFlaggedScoresAreUnavailableRatherThanZero() {
        for (String state : List.of("withheld", "flagForReview", "unscored")) {
            var result = compare(configuration(), List.of(score("dimension", state, .9), score("module", "computed", .9)), 3);
            assertEquals("NOT_EVALUATED", result.status()); assertNull(result.requirements().getFirst().actual());
        }
        assertEquals("NOT_EVALUATED", compare(configuration(), List.of(), null).status());
    }
    @Test void absentProfilesRequirementsAndIncompletePathsHaveExplicitReasons() {
        var config = configuration();
        assertNull(TargetProfiles.compare(null, null, List.of(), null));
        assertEquals("PROFILING_INCOMPLETE", TargetProfiles.compare(config, null, List.of(), null).reason());
        assertEquals("NO_PROFILE", TargetProfiles.compare(config, TargetProfiles.resolve(config, Map.of("context", "other")), List.of(), null).reason());
        assertEquals("NO_REQUIREMENTS", compare(profile(List.of(), null), List.of(), null).reason());
    }
    @Test void largeUnicodeConfigurationSurvivesExcelChunkBoundaries() throws Exception {
        var original = configuration(); var profiles = new ArrayList<>(original.profiles());
        for (int index = 0; index < 20; index++) profiles.add(new TargetProfile("unicode_" + index,
                "Organização " + index, "🙂".repeat(2000), List.of(), null));
        var source = model(new TargetProfileConfiguration(1, original.rootQuestionId(), original.questions(), profiles));
        var excel = new MaturityModelExcelService(new CsvParsingService(MAPPER), MAPPER);
        var imported = excel.parseExcelWorkbook(new java.io.ByteArrayInputStream(excel.exportMaturityModelToXlsx(source)));
        assertTrue(imported.isSuccess(), imported.getErrorDetails());
        assertEquals(source.getTargetProfiles(), imported.getMaturityModel().getTargetProfiles());
    }
    @Test void excelRoundTripPreservesRoutingAndRequirements() throws Exception {
        var source = model(configuration());
        var excel = new MaturityModelExcelService(new CsvParsingService(MAPPER), MAPPER);
        var imported = excel.parseExcelWorkbook(new java.io.ByteArrayInputStream(excel.exportMaturityModelToXlsx(source)));
        assertTrue(imported.isSuccess(), imported.getErrorDetails());
        assertEquals(source.getTargetProfiles(), imported.getMaturityModel().getTargetProfiles());
    }
}
