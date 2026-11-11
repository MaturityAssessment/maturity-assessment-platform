package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.*;
import com.master_thesis.maturity_assessment.assessments.models.EvidenceType;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.campaigns.models.Campaign;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignRepository;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignParticipantRepository;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Enable only against a disposable, migrated PostgreSQL database. */
@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "EVIDENCE_REFERENCE_INTEGRATION_TEST", matches = "true")
class EvidenceQuestionReferencesIntegrationTest {
    @Autowired AssessmentService assessments;
    @Autowired AssessmentEvidenceWorkflowService workflow;
    @Autowired EvidenceService evidence;
    @Autowired MaturityModelRepository models;
    @Autowired UserRepository users;
    @Autowired CampaignRepository campaigns;
    @Autowired CampaignParticipantRepository participants;
    @Autowired EntityManager entityManager;

    @Test
    void referenceOnlyEditsDoNotResolveReturnedContent() throws Exception {
        Fixture fixture = fixture(false);
        Long draftId = assessments.ensureDraftForModel(fixture.model.getId(), fixture.user).getId();
        AssessmentRequest request = answers(fixture);
        EvidenceSubmissionItemRequest item = note(fixture);
        AssessmentResponse saved = workflow.saveMultipartDraft(draftId, request, fixture.user, List.of(item), List.of(), List.of());
        item.setEvidenceId(saved.getEvidence().getFirst().getId());
        assertReferences(saved, fixture.question.getId());
        assertEquals("PENDING_REVIEW", workflow.submitAssessment(draftId, request, fixture.user, List.of(item), List.of(), List.of()).getStatus());

        assessments.saveEvaluationProgress(draftId, review(fixture, "FLAGGED", "Please update the note."), fixture.user);
        assertEquals("CHANGES_REQUESTED", assessments.sendEvaluationBack(draftId, new ManualEvaluationRequest(), fixture.user).getStatus());
        item.setReferencedQuestionIds(List.of());
        saved = workflow.saveMultipartDraft(draftId, request, fixture.user, List.of(item), List.of(), List.of());
        assertEquals(List.of(), saved.getEvidence().getFirst().getReferencedQuestionIds());
        assertFalse(saved.getQuestionEvaluations().get(fixture.key()).getRespondentUpdated());
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> workflow.submitAssessment(draftId, request, fixture.user, List.of(item), List.of(), List.of())).getStatusCode());
    }

    @Test
    void correctedAssessmentCanResubmitAndRetainReferencesAfterFinalReview() throws Exception {
        Fixture fixture = fixture(false);
        Long draftId = assessments.ensureDraftForModel(fixture.model.getId(), fixture.user).getId();
        AssessmentRequest request = answers(fixture);
        EvidenceSubmissionItemRequest item = note(fixture);
        AssessmentResponse submitted = workflow.submitAssessment(draftId, request, fixture.user, List.of(item), List.of(), List.of());
        item.setEvidenceId(submitted.getEvidence().getFirst().getId());
        assessments.saveEvaluationProgress(draftId, review(fixture, "FLAGGED", "Please update the note."), fixture.user);
        assessments.sendEvaluationBack(draftId, new ManualEvaluationRequest(), fixture.user);
        item.setDescription("Corrected evidence content");
        request.setRespondentUpdatedResponseKeys(Set.of(fixture.key()));
        assertEquals("PENDING_REVIEW", workflow.submitAssessment(draftId, request, fixture.user, List.of(item), List.of(), List.of()).getStatus());
        assessments.saveEvaluationProgress(draftId, review(fixture, "ACCEPTED", "Confirmed."), fixture.user);
        assertEquals("COMPLETED", assessments.finishEvaluation(draftId, new ManualEvaluationRequest(), fixture.user).getStatus());
        entityManager.flush();
        entityManager.clear();
        assertEquals(List.of(fixture.question.getId()), evidence.getEvidenceByAssessment(draftId, fixture.user).getFirst().getReferencedQuestionIds());
        workflow.deleteAssessment(draftId, fixture.user);
        entityManager.flush();
        assertEquals(0L, entityManager.createNativeQuery("SELECT count(*) FROM evidence_question_references WHERE evidence_id = :id", Long.class)
                .setParameter("id", item.getEvidenceId()).getSingleResult());
        assertNotNull(entityManager.find(Question.class, fixture.question.getId()));
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void invalidReferenceRollsBackAnswersAndEvidenceTogether() throws Exception {
        Fixture fixture = fixture(true);
        Fixture unrelated = fixture(true);
        Long draftId = assessments.ensureDraftForModel(fixture.model.getId(), fixture.user).getId();
        try {
            AssessmentRequest request = answers(fixture);
            EvidenceSubmissionItemRequest item = note(fixture);
            AssessmentResponse saved = workflow.saveMultipartDraft(draftId, request, fixture.user,
                    List.of(item), List.of(), List.of());
            item.setEvidenceId(saved.getEvidence().getFirst().getId());
            item.setDescription("This edit must roll back");
            item.setReferencedQuestionIds(List.of(unrelated.question.getId()));
            request.getQuestionResponses().get(fixture.key()).setResponse(0);
            assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                    () -> workflow.saveMultipartDraft(draftId, request, fixture.user,
                            List.of(item), List.of(), List.of())).getStatusCode());
            AssessmentResponse unchanged = assessments.getAssessmentById(draftId, fixture.user);
            assertEquals(1, unchanged.getQuestionEvaluations().get(fixture.key()).getResponse());
            EvidenceDTO retained = evidence.getEvidenceByAssessment(draftId, fixture.user).getFirst();
            assertEquals("Evidence content", retained.getDescription());
            assertEquals(List.of(fixture.question.getId()), retained.getReferencedQuestionIds());
        } finally {
            workflow.deleteAssessment(draftId, fixture.user);
            models.deleteById(fixture.model.getId());
            models.deleteById(unrelated.model.getId());
            users.deleteById(fixture.user.getId());
            users.deleteById(unrelated.user.getId());
        }
    }

    @Test
    void automaticAndCampaignSubmissionsPersistTheSameReferenceContract() throws Exception {
        Fixture fixture = fixture(true);
        Long draftId = assessments.ensureDraftForModel(fixture.model.getId(), fixture.user).getId();
        AssessmentResponse completed = workflow.submitAssessment(draftId, answers(fixture), fixture.user,
                List.of(note(fixture)), List.of(), List.of());
        assertEquals("COMPLETED", completed.getStatus());
        assertReferences(completed, fixture.question.getId());

        Campaign campaign = new Campaign();
        campaign.setName("Reference integration campaign");
        campaign.setMaturityModel(fixture.model);
        campaign.setCreatedBy(fixture.user);
        campaign.setEndsAt(Instant.now().plusSeconds(3600));
        campaign = campaigns.saveAndFlush(campaign);
        CampaignParticipant participant = new CampaignParticipant();
        participant.setCampaign(campaign);
        participant.setUser(fixture.user);
        participant.setEmail(fixture.user.getEmail());
        participant = participants.saveAndFlush(participant);
        assessments.ensureCampaignAssessment(participant);
        AssessmentResponse saved = workflow.saveCampaignDraft(answers(fixture), participant,
                List.of(note(fixture)), List.of(), List.of());
        assertReferences(saved, fixture.question.getId());
        EvidenceSubmissionItemRequest retained = note(fixture);
        retained.setEvidenceId(saved.getEvidence().getFirst().getId());
        AssessmentResponse campaignCompleted = workflow.submitCampaignAssessment(answers(fixture), participant,
                List.of(retained), List.of(), List.of());
        assertEquals("COMPLETED", campaignCompleted.getStatus());
        assertReferences(campaignCompleted, fixture.question.getId());
        assertEquals(completed.getOverallAverage(), campaignCompleted.getOverallAverage());
    }

    private void assertReferences(AssessmentResponse response, Long questionId) {
        assertEquals(List.of(questionId), response.getEvidence().getFirst().getReferencedQuestionIds());
        assertEquals("report", response.getEvidence().getFirst().getRequirementCode());
        assertEquals(java.time.LocalDate.of(2020, 10, 31), response.getEvidence().getFirst().getEvidenceDate());
    }

    private ManualEvaluationRequest review(Fixture fixture, String status, String note) {
        QuestionEvaluationRequest question = new QuestionEvaluationRequest();
        question.setQuestionId(fixture.question.getId());
        question.setValidationStatus(status);
        question.setReviewerNote(note);
        ManualEvaluationRequest review = new ManualEvaluationRequest();
        review.setQuestionEvaluations(Map.of(fixture.key(), question));
        return review;
    }

    private AssessmentRequest answers(Fixture fixture) {
        AssessmentRequest request = new AssessmentRequest();
        request.setMaturityModelId(fixture.model.getId());
        QuestionResponseRequest answer = new QuestionResponseRequest();
        answer.setQuestionId(fixture.question.getId());
        answer.setResponse(1);
        request.setQuestionResponses(Map.of(fixture.key(), answer));
        return request;
    }

    private EvidenceSubmissionItemRequest note(Fixture fixture) {
        EvidenceSubmissionItemRequest item = new EvidenceSubmissionItemRequest();
        item.setPracticeId(fixture.practice.getId());
        item.setType(EvidenceType.TEXT);
        item.setDescription("Evidence content");
        item.setRequirementCode("report");
        item.setEvidenceDate(java.time.LocalDate.of(2020, 10, 31));
        item.setReferencedQuestionIds(List.of(fixture.question.getId()));
        return item;
    }

    private Fixture fixture(boolean automatic) {
        User user = new User();
        user.setEmail("evidence-reference-" + UUID.randomUUID() + "@example.com");
        user.setRole(UserRole.ADMIN);
        user = users.saveAndFlush(user);
        MaturityModel model = new MaturityModel();
        model.setName("Evidence reference integration " + UUID.randomUUID());
        model.setIsActive(true);
        model.setAutoEvaluated(automatic);
        MaturityLevel first = new MaturityLevel();
        first.setNumber(1); first.setLevelNumber(1); first.setName("Initial"); first.setMaturityModel(model);
        MaturityLevel second = new MaturityLevel();
        second.setNumber(2); second.setLevelNumber(2); second.setName("Established"); second.setMaturityModel(model);
        model.setLevels(List.of(first, second));
        Dimension dimension = new Dimension();
        dimension.setDimensionId("D"); dimension.setName("Dimension"); dimension.setMaturityModel(model);
        Module module = new Module();
        module.setCode("M"); module.setName("Module"); module.setDimension(dimension);
        Practice practice = new Practice();
        practice.setCode("P"); practice.setName("Practice"); practice.setModule(module); practice.setRequiresEvidence(true);
        practice.setEvidenceRequirements(List.of(new EvidenceRequirement("report", "Monthly report", "Use reporting-period end", true, EvidenceRequirement.Format.ANY)));
        Question question = new Question();
        question.setCode("Q1"); question.setText("Documented?"); question.setType("boolean"); question.setRequired(true); question.setPractice(practice);
        practice.setQuestions(List.of(question));
        module.setPractices(List.of(practice));
        dimension.setModules(List.of(module));
        model.setDimensions(List.of(dimension));
        model = models.saveAndFlush(model);
        return new Fixture(user, model, practice, question);
    }

    private record Fixture(User user, MaturityModel model, Practice practice, Question question) {
        String key() { return "D_M_" + practice.getId() + "_" + question.getId(); }
    }
}
