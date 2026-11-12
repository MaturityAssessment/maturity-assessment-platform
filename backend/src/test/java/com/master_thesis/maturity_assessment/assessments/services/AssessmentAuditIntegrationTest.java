package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.*;
import com.master_thesis.maturity_assessment.assessments.models.*;
import com.master_thesis.maturity_assessment.auth.models.*;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;
import org.springframework.jdbc.core.JdbcTemplate;
import com.master_thesis.maturity_assessment.campaigns.models.Campaign;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignRepository;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignParticipantRepository;
import com.master_thesis.maturity_assessment.campaigns.services.CampaignRespondentService;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Creates/drops schema only in an explicitly supplied disposable PostgreSQL database. */
@EnabledIfEnvironmentVariable(named = "AUDIT_TEST_DB_URL", matches = ".+")
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false", "spring.jpa.show-sql=false",
        "jwt.secret=test-only-secret-key-at-least-32-bytes-long", "logging.level.root=WARN", "debug=false"})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AssessmentAuditIntegrationTest {
    @Autowired AssessmentService assessments;
    @Autowired AssessmentEvidenceWorkflowService workflow;
    @Autowired UserRepository users;
    @Autowired MaturityModelRepository models;
    @Autowired PlatformTransactionManager transactions;
    @Autowired JdbcTemplate jdbc;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired CampaignRepository campaigns;
    @Autowired CampaignParticipantRepository participants;
    @Autowired CampaignRespondentService campaignResponses;

    @BeforeAll
    void useProductionAuditMigration() throws Exception {
        // Bootstrap the existing schema with Hibernate, then exercise the actual new migration.
        jdbc.execute("DROP TABLE assessment_logs");
        for (String migration : List.of("V51__add_assessment_audit_logs.sql", "V52__index_assessment_logs_by_target.sql")) {
            try (var input = getClass().getResourceAsStream("/db/migration/" + migration)) {
                assertNotNull(input);
                jdbc.execute(new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
            }
        }
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> System.getenv("AUDIT_TEST_DB_URL"));
        properties.add("spring.datasource.username", () -> System.getenv().getOrDefault("AUDIT_TEST_DB_USER", "audit_test"));
        properties.add("spring.datasource.password", () -> "");
    }

    @Test
    void persistedChangesSurviveResetAndUnchangedAutosaveDoesNotAddEntries() throws Exception {
        Fixture f = fixture();
        Long id = assessments.ensureDraftForModel(f.modelId(), f.user()).getId();
        assertEquals(List.of("ASSESSMENT_CREATED"), actions(id, f.user()));
        AssessmentRequest request = answers(f, "Original answer");
        EvidenceSubmissionItemRequest note = note(f);
        var saved = workflow.saveMultipartDraft(id, request, f.user(), List.of(note), List.of(), List.of());
        note.setEvidenceId(saved.getEvidence().getFirst().getId());
        int count = entries(id, f.user()).size();
        workflow.saveMultipartDraft(id, request, f.user(), List.of(note), List.of(), List.of());
        assertEquals(count, entries(id, f.user()).size());

        request.getQuestionResponses().get(f.key()).setRespondentJustification("Annual review");
        request.setReferenceDate(LocalDate.now(ZoneOffset.UTC).minusDays(1));
        note.setDescription("Updated note");
        workflow.saveMultipartDraft(id, request, f.user(), List.of(note), List.of(), List.of());
        var changed = entries(id, f.user());
        assertTrue(changed.stream().anyMatch(log -> log.getAction().equals("JUSTIFICATION_CHANGED")));
        assertTrue(changed.stream().anyMatch(log -> log.getAction().equals("REFERENCE_DATE_CHANGED")));
        assertTrue(changed.stream().anyMatch(log -> log.getAction().equals("EVIDENCE_CHANGED")
                && log.getBeforeValue().get("description").asText().equals("Original note")
                && log.getAfterValue().get("description").asText().equals("Updated note")));
        workflow.resetDraft(id, f.user());
        var reset = entries(id, f.user());
        assertTrue(reset.stream().anyMatch(log -> log.getAction().equals("ASSESSMENT_RESET")));
        assertTrue(reset.stream().anyMatch(log -> log.getAction().equals("ANSWER_REMOVED")
                && log.getBeforeValue().get("response").asText().equals("Original answer")));
        assertTrue(reset.stream().anyMatch(log -> log.getAction().equals("EVIDENCE_REMOVED")));
        assertTrue(reset.stream().allMatch(log -> log.getActorUserId().equals(f.user().getId())));
        assertTrue(reset.size() > changed.size());
    }

    @Test
    void rejectedSubmissionRollsBackBothAnswerAndItsAuditRecord() throws Exception {
        Fixture f = fixture();
        Long id = assessments.ensureDraftForModel(f.modelId(), f.user()).getId();
        workflow.saveMultipartDraft(id, answers(f, "Saved answer"), f.user(), List.of(), List.of(), List.of());
        int count = entries(id, f.user()).size();
        assertThrows(ResponseStatusException.class, () -> workflow.submitAssessment(id,
                answers(f, "Must roll back"), f.user(), List.of(), List.of(), List.of()));
        assertEquals(count, entries(id, f.user()).size());
        assertEquals("Saved answer", assessments.getAssessmentById(id, f.user()).getQuestionEvaluations().get(f.key()).getResponse());
        assertEquals("DRAFT", assessments.getAssessmentById(id, f.user()).getStatus());
    }

    @Test
    void evaluatorEditsDoNotGenerateRespondentEventsAndReadersMustBeAuthorized() throws Exception {
        Fixture f = fixture();
        Long id = assessments.ensureDraftForModel(f.modelId(), f.user()).getId();
        var note = note(f);
        var submitted = workflow.submitAssessment(id, answers(f, "Submitted answer"), f.user(), List.of(note), List.of(), List.of());
        note.setEvidenceId(submitted.getEvidence().getFirst().getId());
        assertTrue(actions(id, f.user()).contains("ASSESSMENT_SUBMITTED"));
        int count = entries(id, f.user()).size();
        var progress = new ManualEvaluationRequest(); progress.setEvaluatorInsight("Evaluator remarks");
        assessments.saveEvaluationProgress(id, progress, f.user());
        assertEquals(count, entries(id, f.user()).size());
        var review = new QuestionEvaluationRequest(); review.setQuestionId(f.questionId());
        review.setValidationStatus("FLAGGED"); review.setReviewerNote("Clarify the policy");
        progress.setQuestionEvaluations(Map.of(f.key(), review));
        assessments.saveEvaluationProgress(id, progress, f.user());
        assessments.sendEvaluationBack(id, new ManualEvaluationRequest(), f.user());
        assertEquals(count, entries(id, f.user()).size());
        var revision = answers(f, "Corrected answer"); revision.setRespondentUpdatedResponseKeys(Set.of(f.key()));
        workflow.submitAssessment(id, revision, f.user(), List.of(note), List.of(), List.of());
        assertTrue(actions(id, f.user()).containsAll(List.of("ANSWER_CHANGED", "REVIEW_UPDATE_CONFIRMED", "ASSESSMENT_RESUBMITTED")));
        User outsider = new User(); outsider.setId(f.user().getId() + 1000); outsider.setRole(UserRole.USER);
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> assessments.getLogs(id, outsider, 0)).getStatusCode().value());
    }

    @Test
    void campaignHistoryUsesTheInvitedActorAndRejectsRevokedMembership() throws Exception {
        Fixture f = fixture();
        Long campaignId = new TransactionTemplate(transactions).execute(status -> {
            Campaign campaign = new Campaign(); campaign.setName("Audit campaign"); campaign.setCreatedBy(f.user());
            campaign.setMaturityModel(models.findById(f.modelId()).orElseThrow());
            campaign.setEndsAt(java.time.Instant.now().plusSeconds(3600));
            campaign = campaigns.saveAndFlush(campaign);
            CampaignParticipant participant = new CampaignParticipant(); participant.setCampaign(campaign);
            participant.setUser(f.user()); participant.setEmail(f.user().getEmail()); participants.saveAndFlush(participant);
            return campaign.getId();
        });
        campaignResponses.openAssessment(campaignId, f.user());
        campaignResponses.saveDraft(campaignId, f.user(), answers(f, "Campaign answer"), List.of(), List.of(), List.of());
        var history = campaignResponses.logs(campaignId, f.user(), 0).entries();
        assertEquals(2, history.size());
        assertTrue(history.stream().allMatch(log -> log.getActorUserId().equals(f.user().getId())
                && log.getActorCampaignParticipantId() != null));
        assertEquals("ANSWER_ADDED", history.getFirst().getAction());
        var filtered = campaignResponses.logs(campaignId, f.user(), 0, f.questionId());
        assertEquals(1, filtered.entries().size()); assertFalse(filtered.hasMore());
        assertEquals(f.questionId(), filtered.entries().getFirst().getTargetId());
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            CampaignParticipant participant = participants.findByCampaignIdAndUserId(campaignId, f.user().getId()).orElseThrow();
            participant.setRevokedAt(java.time.Instant.now()); participants.saveAndFlush(participant);
        });
        assertEquals(410, assertThrows(ResponseStatusException.class,
                () -> campaignResponses.logs(campaignId, f.user(), 0)).getStatusCode().value());
    }

    @Test
    void historyIsPaginatedNewestFirst() {
        Fixture f = fixture(); Long id = assessments.ensureDraftForModel(f.modelId(), f.user()).getId();
        for (int i = 0; i < 51; i++) assessments.saveDraft(id, answers(f, "Revision " + i), f.user());
        var first = assessments.getLogs(id, f.user(), 0);
        var second = assessments.getLogs(id, f.user(), 1);
        assertEquals(50, first.entries().size()); assertTrue(first.hasMore());
        assertEquals(2, second.entries().size()); assertFalse(second.hasMore());
        assertEquals("Revision 50", first.entries().getFirst().getAfterValue().get("response").asText());
        assertEquals("ASSESSMENT_CREATED", second.entries().getLast().getAction());
        assertTrue(first.entries().getLast().getId() > second.entries().getFirst().getId());
        var filteredFirst = assessments.getLogs(id, f.user(), 0, f.questionId());
        var filteredSecond = assessments.getLogs(id, f.user(), 1, f.questionId());
        assertEquals(50, filteredFirst.entries().size()); assertTrue(filteredFirst.hasMore());
        assertEquals(1, filteredSecond.entries().size()); assertFalse(filteredSecond.hasMore());
        assertTrue(filteredFirst.entries().stream().allMatch(log -> log.getTargetType().equals("QUESTION")
                && log.getTargetId().equals(f.questionId())));
        assertEquals("Revision 0", filteredSecond.entries().getFirst().getAfterValue().get("response").asText());
        Fixture other = fixture();
        Long otherId = assessments.ensureDraftForModel(other.modelId(), other.user()).getId();
        assertTrue(assessments.getLogs(otherId, other.user(), 0, f.questionId()).entries().isEmpty());
    }

    @Test
    void hierarchyFiltersIncludeLinkedAndGeneralEvidenceAndPreserveRemovedLinks() throws Exception {
        Fixture f = fixture();
        long[] extra = new TransactionTemplate(transactions).execute(status -> {
            var model = models.findById(f.modelId()).orElseThrow();
            var practice = model.getDimensions().getFirst().getModules().getFirst().getPractices().getFirst();
            Question sibling = new Question(); sibling.setCode("Q2"); sibling.setText("Other question");
            sibling.setType("open_answer"); sibling.setPractice(practice); practice.getQuestions().add(sibling);
            Dimension other = new Dimension(); other.setDimensionId("E"); other.setName("Other dimension"); other.setMaturityModel(model);
            Module module = new Module(); module.setCode("M"); module.setName("Same local module code"); module.setDimension(other);
            Practice outside = new Practice(); outside.setCode("P"); outside.setName("Outside practice"); outside.setModule(module);
            Question unrelated = new Question(); unrelated.setCode("Q1"); unrelated.setText("Outside question"); unrelated.setType("open_answer"); unrelated.setPractice(outside);
            outside.setQuestions(List.of(unrelated)); module.setPractices(List.of(outside)); other.setModules(List.of(module)); model.getDimensions().add(other);
            entityManager.persist(sibling);
            entityManager.persist(other);
            entityManager.flush();
            return new long[] { sibling.getId(), outside.getId(), unrelated.getId() };
        });
        Long id = assessments.ensureDraftForModel(f.modelId(), f.user()).getId();
        var request = answers(f, "Main answer");
        var answers = new LinkedHashMap<>(request.getQuestionResponses());
        var siblingAnswer = new QuestionResponseRequest(); siblingAnswer.setQuestionId(extra[0]); siblingAnswer.setResponse("Sibling answer");
        answers.put("D_M_" + f.practiceId() + "_" + extra[0], siblingAnswer);
        var outsideAnswer = new QuestionResponseRequest(); outsideAnswer.setQuestionId(extra[2]); outsideAnswer.setResponse("Outside answer");
        answers.put("E_M_" + extra[1] + "_" + extra[2], outsideAnswer); request.setQuestionResponses(answers);
        var linked = note(f); linked.setDescription("Linked to main");
        var general = note(f); general.setDescription("General practice evidence"); general.setReferencedQuestionIds(List.of());
        var sibling = note(f); sibling.setDescription("Sibling evidence"); sibling.setReferencedQuestionIds(List.of(extra[0]));
        var saved = workflow.saveMultipartDraft(id, request, f.user(), List.of(linked, general, sibling), List.of(), List.of());
        linked.setEvidenceId(saved.getEvidence().get(0).getId()); general.setEvidenceId(saved.getEvidence().get(1).getId());
        sibling.setEvidenceId(saved.getEvidence().get(2).getId());
        var questionHistory = assessments.getLogs(id, f.user(), 0, "D", "M", f.practiceId(), f.questionId()).entries();
        assertEquals(3, questionHistory.size());
        assertTrue(questionHistory.stream().anyMatch(log -> log.getTargetType().equals("EVIDENCE") && log.getTargetId().equals(linked.getEvidenceId())));
        assertFalse(questionHistory.stream().anyMatch(log -> log.getTargetType().equals("EVIDENCE") && log.getTargetId().equals(sibling.getEvidenceId())));
        for (var history : List.of(assessments.getLogs(id, f.user(), 0, "D", null, null, null),
                assessments.getLogs(id, f.user(), 0, "D", "M", null, null),
                assessments.getLogs(id, f.user(), 0, "D", "M", f.practiceId(), null))) {
            assertEquals(5, history.entries().size());
            assertFalse(history.entries().stream().anyMatch(log -> log.getTargetType().equals("QUESTION") && log.getTargetId().equals(extra[2])));
        }
        assertTrue(assessments.getLogs(id, f.user(), 0, "E", "M", f.practiceId(), null).entries().isEmpty());
        assertThrows(ResponseStatusException.class, () -> assessments.getLogs(id, f.user(), 0, null, "M", null, null));
        linked.setReferencedQuestionIds(List.of(extra[0]));
        workflow.saveMultipartDraft(id, request, f.user(), List.of(linked, general, sibling), List.of(), List.of());
        var unlinked = assessments.getLogs(id, f.user(), 0, "D", "M", f.practiceId(), f.questionId()).entries();
        assertTrue(unlinked.stream().anyMatch(log -> log.getAction().equals("EVIDENCE_CHANGED") && log.getTargetId().equals(linked.getEvidenceId())));
        workflow.saveMultipartDraft(id, request, f.user(), List.of(linked, sibling), List.of(), List.of());
        var removed = assessments.getLogs(id, f.user(), 0, "D", "M", f.practiceId(), f.questionId()).entries();
        assertTrue(removed.stream().anyMatch(log -> log.getAction().equals("EVIDENCE_REMOVED") && log.getTargetId().equals(general.getEvidenceId())));
    }

    private List<AssessmentLog> entries(Long id, User user) { return assessments.getLogs(id, user, 0).entries(); }
    private List<String> actions(Long id, User user) { return entries(id, user).stream().map(AssessmentLog::getAction).toList(); }
    private AssessmentRequest answers(Fixture f, String answer) {
        var response = new QuestionResponseRequest(); response.setQuestionId(f.questionId()); response.setResponse(answer);
        var request = new AssessmentRequest(); request.setMaturityModelId(f.modelId()); request.setQuestionResponses(Map.of(f.key(), response));
        return request;
    }
    private EvidenceSubmissionItemRequest note(Fixture f) {
        var note = new EvidenceSubmissionItemRequest(); note.setPracticeId(f.practiceId()); note.setType(EvidenceType.TEXT);
        note.setDescription("Original note"); note.setRequirementCode("report"); note.setCollectedAt(LocalDate.now(ZoneOffset.UTC));
        note.setReferencedQuestionIds(List.of(f.questionId())); return note;
    }
    private Fixture fixture() {
        return new TransactionTemplate(transactions).execute(status -> {
            User user = new User(); user.setEmail("audit-" + UUID.randomUUID() + "@example.test"); user.setName("Maria"); user.setRole(UserRole.ADMIN);
            user = users.saveAndFlush(user);
            MaturityModel model = new MaturityModel(); model.setName("Audit test " + UUID.randomUUID()); model.setIsActive(true); model.setAutoEvaluated(false);
            MaturityLevel level = new MaturityLevel(); level.setNumber(1); level.setLevelNumber(1); level.setName("Initial"); level.setMaturityModel(model);
            model.setLevels(List.of(level));
            Dimension dimension = new Dimension(); dimension.setDimensionId("D"); dimension.setName("Governance"); dimension.setMaturityModel(model);
            Module module = new Module(); module.setCode("M"); module.setName("Policy"); module.setDimension(dimension);
            Practice practice = new Practice(); practice.setCode("P"); practice.setName("Review"); practice.setModule(module); practice.setRequiresEvidence(true);
            practice.setEvidenceRequirements(List.of(new EvidenceRequirement("report", "Annual report", "Attach review", true, EvidenceRequirement.Format.ANY)));
            Question question = new Question(); question.setCode("Q1"); question.setText("Describe the policy"); question.setType("open_answer"); question.setPractice(practice);
            practice.setQuestions(List.of(question)); module.setPractices(List.of(practice)); dimension.setModules(List.of(module)); model.setDimensions(List.of(dimension));
            model = models.saveAndFlush(model);
            return new Fixture(user, model.getId(), practice.getId(), question.getId());
        });
    }
    private record Fixture(User user, Long modelId, Long practiceId, Long questionId) {
        String key() { return "D_M_" + practiceId + "_" + questionId; }
    }
}
