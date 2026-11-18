package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.assessments.dto.*;
import com.master_thesis.maturity_assessment.assessments.models.*;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.assessments.services.*;
import com.master_thesis.maturity_assessment.auth.models.*;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelDTO;
import com.master_thesis.maturity_assessment.maturity_models.repository.DomainRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.context.TestPropertySource;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false", "app.evidence.upload-dir=/tmp/issue18-evidence"})
@EnabledIfEnvironmentVariable(named = "TARGET_PROFILES_PERSISTENCE_TEST", matches = "true")
@Import({MaturityModelService.class, MaturityModelExcelService.class, CsvParsingService.class, TargetProfilesPersistenceIntegrationTest.Json.class,
        AssessmentService.class, AssessmentEvidenceWorkflowService.class, AssessmentAuditService.class,
        EvidenceLifecycleService.class, EvidenceService.class, FileStorageService.class, MaturityScoringService.class})
class TargetProfilesPersistenceIntegrationTest {
    @TestConfiguration static class Json { @Bean ObjectMapper objectMapper() { return new ObjectMapper().findAndRegisterModules(); } }
    @Autowired EntityManager entities;
    @Autowired MaturityModelService models;
    @Autowired MaturityModelExcelService excel;
    @Autowired DomainRepository domains;
    @Autowired ObjectMapper mapper;
    @Autowired AssessmentService assessments;
    @Autowired AssessmentEvidenceWorkflowService workflow;
    @Autowired EvidenceService evidence;
    @Autowired UserRepository users;
    @Autowired AssessmentRepository assessmentRepository;

    MaturityModelDTO create(boolean auto) {
        Domain domain = new Domain(); domain.setName("Target profiles integration"); domain.setIconKey("layers"); domain.setColorKey("blue"); domain = domains.saveAndFlush(domain);
        var source = MaturityModelExcelServiceTest.buildOfficialTemplateModel(); source.setDomainId(domain.getId()); source.setAutoEvaluated(auto);
        var dimension = source.getDimensions().getFirst(); dimension.setId("D1");
        var module = dimension.getModules().getFirst(); module.setCode("M1");
        var practice = module.getPractices().getFirst();
        var question = practice.getQuestions().getFirst(); question.setType("boolean"); question.setDependsOnQuestionCode(null); question.setRequired(false);
        practice.setQuestions(List.of(question)); practice.setRequiresEvidence(false); practice.setEvidenceRequirements(List.of());
        module.setPractices(List.of(practice)); dimension.setModules(List.of(module)); source.setDimensions(List.of(dimension));
        source.setTargetProfiles(TargetProfilesTest.configuration());
        var created = models.createFromEditor(models.prepareEditorDocument(source));
        entities.find(MaturityModel.class, created.getId()).setIsActive(true); entities.flush();
        return created;
    }
    User respondent() {
        User user = new User(); user.setEmail("target-profile-respondent@example.test"); user.setRole(UserRole.USER); return users.saveAndFlush(user);
    }
    AssessmentRequest request(MaturityModelDTO model, boolean value) {
        var dimension = model.getDimensions().getFirst(); var module = dimension.getModules().getFirst();
        var practice = module.getPractices().getFirst(); var question = practice.getQuestions().getFirst();
        var answer = new QuestionResponseRequest(); answer.setQuestionId(question.getId()); answer.setResponse(value);
        var request = new AssessmentRequest(); request.setMaturityModelId(model.getId()); request.setProfilingAnswers(Map.of("context", "small"));
        request.setQuestionResponses(Map.of(dimension.getId() + "_" + module.getCode() + "_" + practice.getId() + "_" + question.getId(), answer));
        return request;
    }
    @Test void configurationAndFrozenComparisonSurvivePersistenceExcelAndNewVersions() throws Exception {
        var model = create(true); var user = respondent(); var request = request(model, true);
        var result = workflow.submitAssessment(request, user, List.of(), List.of(), List.of(), true);
        assertEquals("MET", result.getTargetProfileComparison().status());
        entities.flush(); entities.clear();
        var stored = assessmentRepository.findById(result.getId()).orElseThrow();
        assertEquals(result.getProfiling(), stored.getProfiling());
        assertEquals(result.getTargetProfileComparison(), stored.getTargetProfileComparison());
        assertEquals(model.getTargetProfiles(), models.getMaturityModelEditor(model.getId()).getTargetProfiles());
        var parsed = excel.parseExcelWorkbook(new java.io.ByteArrayInputStream(excel.exportMaturityModelToXlsx(models.getMaturityModelById(model.getId()))));
        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
        assertEquals(model.getTargetProfiles(), parsed.getMaturityModel().getTargetProfiles());
        var editor = models.getMaturityModelEditor(model.getId()); var config = editor.getTargetProfiles();
        var changed = new ArrayList<>(config.profiles());
        var profile = changed.getFirst();
        changed.set(0, new TargetProfileConfiguration.TargetProfile(profile.id(), "New expectations", "", profile.requirements(), 5));
        editor.setTargetProfiles(new TargetProfileConfiguration(1, config.rootQuestionId(), config.questions(), changed));
        var next = models.createVersionFromEditor(model.getId(), editor); entities.flush(); entities.clear();
        assertEquals(2, next.getVersion()); assertFalse(next.getIsActive());
        assertEquals("New expectations", models.getMaturityModelById(next.getId()).getTargetProfiles().profiles().getFirst().name());
        assertEquals("Small organization", assessmentRepository.findById(result.getId()).orElseThrow().getTargetProfileComparison().profileName());
        assertEquals(model.getTargetProfiles(), models.getMaturityModelById(model.getId()).getTargetProfiles());
    }
    @Test void actualV60UpgradePreservesLegacyModelsAndAssessmentsAndIsRepeatable() {
        var model = create(true); var user = respondent(); var draft = assessments.ensureDraftForModel(model.getId(), user);
        entities.flush(); entities.clear();
        entities.unwrap(Session.class).doWork(connection -> {
            try (var statement = connection.createStatement()) {
                statement.execute("ALTER TABLE maturity_models DROP COLUMN target_profiles");
                statement.execute("ALTER TABLE assessments DROP COLUMN profiling, DROP COLUMN target_profile_comparison");
            }
            var migration = new ResourceDatabasePopulator(new ClassPathResource("db/migration/V60__add_target_profiles.sql"));
            migration.populate(connection); migration.populate(connection);
        });
        assertNull(entities.find(MaturityModel.class, model.getId()).getTargetProfiles());
        assertNull(entities.find(Assessment.class, draft.getId()).getProfiling());
        assertNull(entities.find(Assessment.class, draft.getId()).getTargetProfileComparison());
        assertEquals(model.getName(), entities.find(MaturityModel.class, model.getId()).getName());
    }
    @Test void manualReviewOnlyComparesAfterCompletionAndCampaignsRemainUnprofiled() throws Exception {
        var model = create(false); var user = respondent(); var request = request(model, true);
        var pending = workflow.submitAssessment(request, user, List.of(), List.of(), List.of(), true);
        assertEquals("PENDING_REVIEW", pending.getStatus()); assertNull(pending.getTargetProfileComparison());
        var evaluator = new User(); evaluator.setEmail("target-profile-evaluator@example.test"); evaluator.setRole(UserRole.CURATOR); evaluator = users.saveAndFlush(evaluator);
        var review = new ManualEvaluationRequest(); var decision = new QuestionEvaluationRequest();
        decision.setQuestionId(request.getQuestionResponses().values().iterator().next().getQuestionId());
        decision.setValidationStatus("ACCEPTED");
        review.setQuestionEvaluations(Map.of(request.getQuestionResponses().keySet().iterator().next(), decision));
        var completed = assessments.evaluateAssessment(pending.getId(), review, evaluator);
        assertEquals("COMPLETED", completed.getStatus()); assertEquals("MET", completed.getTargetProfileComparison().status());
        entities.flush(); entities.clear();
        assertEquals(completed.getTargetProfileComparison(), assessmentRepository.findById(pending.getId()).orElseThrow().getTargetProfileComparison());

        var campaign = new com.master_thesis.maturity_assessment.campaigns.models.Campaign();
        campaign.setName("Unprofiled campaign"); campaign.setEndsAt(java.time.Instant.now().plusSeconds(3600));
        campaign.setMaturityModel(entities.find(MaturityModel.class, model.getId())); campaign.setCreatedBy(entities.find(User.class, user.getId())); entities.persist(campaign);
        var participant = new com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant();
        participant.setCampaign(campaign); participant.setUser(campaign.getCreatedBy()); participant.setEmail(user.getEmail()); entities.persist(participant); entities.flush();
        assessments.ensureCampaignAssessment(participant);
        request.setProfilingAnswers(null);
        var campaignResult = workflow.submitCampaignAssessment(request, participant, List.of(), List.of(), List.of());
        assertEquals("PENDING_REVIEW", campaignResult.getStatus()); assertNull(campaignResult.getProfiling()); assertNull(campaignResult.getTargetProfileComparison());
    }
    @Test void controllerDraftSaveReloadAndSubmitResolveProfileOnTheServer() throws Exception {
        var model = create(true); var user = respondent(); var request = request(model, false);
        var controller = new com.master_thesis.maturity_assessment.assessments.controllers.AssessmentController(assessments, evidence, workflow,
                org.mockito.Mockito.mock(LocalAgentEvaluationService.class), mapper);
        var http = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(controller).build();
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(user, "", user.getAuthorities()));
        try {
            var saved = http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/assessments/drafts")
                    .contentType("application/json").content(mapper.writeValueAsBytes(request)))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk()).andReturn();
            var savedJson = mapper.readTree(saved.getResponse().getContentAsByteArray()); long id = savedJson.get("id").asLong();
            assertEquals("small-org", savedJson.path("profiling").path("profileId").asText());
            entities.flush(); entities.clear();
            var read = http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/assessments/" + id))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk()).andReturn();
            assertEquals("small-org", mapper.readTree(read.getResponse().getContentAsByteArray()).path("profiling").path("profileId").asText());
            var submitted = http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/v1/assessments")
                    .file(new org.springframework.mock.web.MockMultipartFile("assessment", "", "application/json", mapper.writeValueAsBytes(request)))
                    .param("evidenceMetadata", "[]"))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk()).andReturn();
            var json = mapper.readTree(submitted.getResponse().getContentAsByteArray());
            assertEquals("COMPLETED", json.path("status").asText());
            assertEquals("NOT_MET", json.path("targetProfileComparison").path("status").asText());
            assertEquals(id, json.path("id").asLong());
        } finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
    }
}
