package com.master_thesis.maturity_assessment.assessments.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.assessments.models.*;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentLogRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.repository.QuestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AssessmentAuditServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private AssessmentLogRepository logs;
    private QuestionRepository questions;
    private AssessmentAuditService audit;
    private Assessment assessment;
    private Question question;

    @BeforeEach
    void setUp() {
        logs = mock(AssessmentLogRepository.class);
        questions = mock(QuestionRepository.class);
        audit = new AssessmentAuditService(logs, questions, mapper);
        User user = new User(); user.setId(7L); user.setName("Maria"); user.setEmail("maria@example.test");
        assessment = new Assessment(); assessment.setId(23L); assessment.setUser(user); assessment.setStatus(AssessmentStatus.DRAFT);
        assessment.setReferenceDate(LocalDate.of(2026, 11, 1));
        question = new Question(); question.setId(1001L); question.setCode("Q1"); question.setText("Is a policy in place?"); question.setType("boolean");
        when(questions.findById(1001L)).thenReturn(Optional.of(question));
    }

    @Test
    void recordsActorTargetUtcTimeAndIndependentBeforeAfterSnapshots() {
        QuestionEvaluation row = row(0);
        var before = audit.responses(List.of(row));
        row.setResponse(mapper.valueToTree(1));
        Instant started = Instant.now();
        audit.responsesChanged(assessment, before, List.of(row));
        AssessmentLog log = entry();
        assertEquals(23L, log.getAssessmentId()); assertEquals(7L, log.getActorUserId());
        assertEquals("Maria", log.getActorName()); assertEquals("maria@example.test", log.getActorEmail());
        assertEquals("RESPONDENT", log.getActorRole()); assertEquals("ANSWER_CHANGED", log.getAction());
        assertEquals("QUESTION", log.getTargetType()); assertEquals(1001L, log.getTargetId());
        assertEquals("Q1 — Is a policy in place?", log.getTargetLabel());
        assertEquals(0, log.getBeforeValue().get("response").asInt()); assertEquals(1, log.getAfterValue().get("response").asInt());
        assertEquals("No", log.getBeforeValue().get("answerLabel").asText()); assertEquals("Yes", log.getAfterValue().get("answerLabel").asText());
        assertFalse(log.getOccurredAt().isBefore(started)); assertFalse(log.getOccurredAt().isAfter(Instant.now()));
    }

    @Test
    void unchangedAutosaveIncludingEquivalentJsonNumbersProducesNoLog() {
        QuestionEvaluation row = row(1);
        var before = audit.responses(List.of(row));
        row.setResponse(mapper.valueToTree(1.0));
        audit.responsesChanged(assessment, before, List.of(row));
        verifyNoInteractions(logs);
    }

    @Test
    void distinguishesEqualScoreOptionsAndSavesTheirLabels() {
        question.setType("multiple_choice");
        question.setChoiceOptions("[{\"label\":\"First\",\"score\":1},{\"label\":\"Second\",\"score\":1}]");
        QuestionEvaluation row = row(1); row.setChoiceIndex(0);
        var before = audit.responses(List.of(row)); row.setChoiceIndex(1);
        audit.responsesChanged(assessment, before, List.of(row));
        assertEquals("ANSWER_CHANGED", entry().getAction());
        assertEquals("First", entry().getBeforeValue().get("answerLabel").asText());
        assertEquals("Second", entry().getAfterValue().get("answerLabel").asText());
    }

    @Test
    void distinguishesJustificationEditsAndPreservesClearedAnswers() {
        QuestionEvaluation row = row(1);
        var before = audit.responses(List.of(row)); row.setRespondentJustification("Policy reviewed annually");
        audit.responsesChanged(assessment, before, List.of(row));
        assertEquals("JUSTIFICATION_CHANGED", entry().getAction());
        reset(logs);
        audit.responsesChanged(assessment, audit.responses(List.of(row)), List.of());
        assertEquals("ANSWER_REMOVED", entry().getAction()); assertNull(entry().getAfterValue());
        assertEquals("Policy reviewed annually", entry().getBeforeValue().get("justification").asText());
    }

    @Test
    void newlyAnsweredQuestionRetainsCampaignActorIdentity() {
        CampaignParticipant participant = new CampaignParticipant(); participant.setId(41L);
        assessment.setCampaignParticipant(participant);
        audit.responsesChanged(assessment, Map.of(), List.of(row(1)));
        assertEquals("ANSWER_ADDED", entry().getAction()); assertEquals(41L, entry().getActorCampaignParticipantId());
        assertNull(entry().getBeforeValue());
    }

    @Test
    void evidenceAddsUpdatesAndRemovalsRetainMetadataWithoutStoragePaths() {
        Practice practice = new Practice(); practice.setId(101L); practice.setCode("P1"); practice.setName("Governance");
        Evidence evidence = new Evidence(); evidence.setId(201L); evidence.setPractice(practice);
        evidence.setEvidenceType(EvidenceType.FILE); evidence.setFileName("policy.pdf"); evidence.setFilePath("private/storage/path");
        evidence.setCollectedAt(LocalDate.of(2026, 10, 1)); evidence.setDescription("Original description");
        audit.evidenceChanged(assessment, assessment.getUser(), Map.of(), List.of(evidence));
        assertEquals("EVIDENCE_ADDED", entry().getAction()); assertFalse(entry().getAfterValue().has("filePath"));
        reset(logs);
        var before = audit.evidence(List.of(evidence)); evidence.setDescription("Revised description");
        audit.evidenceChanged(assessment, assessment.getUser(), before, List.of(evidence));
        assertEquals("EVIDENCE_CHANGED", entry().getAction());
        assertEquals("Original description", entry().getBeforeValue().get("description").asText());
        reset(logs);
        audit.evidenceChanged(assessment, assessment.getUser(), audit.evidence(List.of(evidence)), List.of(evidence));
        verifyNoInteractions(logs);
        audit.evidenceChanged(assessment, assessment.getUser(), before, List.of());
        assertEquals("EVIDENCE_REMOVED", entry().getAction()); assertEquals(201L, entry().getTargetId());
        assertEquals("P1 — Governance — policy.pdf", entry().getTargetLabel());
    }

    @Test
    void correctionConfirmationIsLoggedOnceEvenWithoutAnAnswerChange() {
        QuestionEvaluation row = row(1);
        audit.respondentUpdateMarked(assessment, row);
        assertEquals("REVIEW_UPDATE_CONFIRMED", entry().getAction());
        assertFalse(entry().getBeforeValue().asBoolean()); assertTrue(entry().getAfterValue().asBoolean());
        row.setRespondentUpdated(true);
        clearInvocations(logs);
        audit.respondentUpdateMarked(assessment, row);
        verifyNoInteractions(logs);
    }

    @Test
    void referenceDateAndSubmissionEventsUseOriginalState() {
        var before = audit.state(assessment);
        assessment.setReferenceDate(LocalDate.of(2026, 11, 2));
        audit.assessmentChanged(assessment, assessment.getUser(), before, null);
        assertEquals("REFERENCE_DATE_CHANGED", entry().getAction());
        assertEquals("2026-11-01", entry().getBeforeValue().asText());
        reset(logs);
        before = audit.state(assessment); assessment.setStatus(AssessmentStatus.PENDING_REVIEW);
        audit.assessmentChanged(assessment, assessment.getUser(), before, "ASSESSMENT_SUBMITTED");
        assertEquals("DRAFT", entry().getBeforeValue().asText()); assertEquals("PENDING_REVIEW", entry().getAfterValue().asText());
    }

    @Test
    void evaluatorReviewUsesActualActorAndKeepsIndependentSnapshots() {
        var row = row(1); row.setValidationStatus(QuestionEvaluationStatus.ACCEPTED);
        row.setManualScore(0.5); row.setReviewerNote("Original note");
        var before = audit.evaluationState(assessment, List.of(row));
        row.setValidationStatus(QuestionEvaluationStatus.ADJUSTED); row.setManualScore(0.75); row.setReviewerNote("Revised note");
        User evaluator = new User(); evaluator.setId(99L); evaluator.setName("Reviewer");
        CampaignParticipant membership = new CampaignParticipant(); membership.setId(41L); assessment.setCampaignParticipant(membership);
        audit.evaluationChanged(assessment, evaluator, before, List.of(row), null);
        var log = entry();
        assertEquals("EVALUATOR", log.getActorRole()); assertEquals(99L, log.getActorUserId());
        assertNull(log.getActorCampaignParticipantId()); assertEquals("QUESTION_REVIEW_CHANGED", log.getAction());
        assertEquals("ACCEPTED", log.getBeforeValue().get("validationStatus").asText());
        assertEquals("Original note", log.getBeforeValue().get("reviewerNote").asText());
        assertEquals(0.75, log.getAfterValue().get("manualScore").asDouble());
        clearInvocations(logs);
        before = audit.evaluationState(assessment, List.of(row));
        audit.evaluationChanged(assessment, evaluator, before, List.of(row), null);
        verifyNoInteractions(logs);
    }

    @Test
    void evaluatorRemarksCanBeClearedAndCompletionRecordsResultState() {
        assessment.setStatus(AssessmentStatus.PENDING_REVIEW); assessment.setEvaluatorInsight("Previous remarks");
        var before = audit.evaluationState(assessment, List.of());
        assessment.setEvaluatorInsight(null); assessment.setStatus(AssessmentStatus.COMPLETED); assessment.setOverallPercentageScore(80.0);
        audit.evaluationChanged(assessment, assessment.getUser(), before, List.of(), "EVALUATION_COMPLETED");
        var captor = ArgumentCaptor.forClass(AssessmentLog.class);
        verify(logs, times(2)).save(captor.capture());
        var remarks = captor.getAllValues().get(0);
        assertEquals("EVALUATOR_REMARKS_CHANGED", remarks.getAction()); assertTrue(remarks.getAfterValue().isNull());
        var completed = captor.getAllValues().get(1);
        assertEquals("EVALUATION_COMPLETED", completed.getAction());
        assertEquals("PENDING_REVIEW", completed.getBeforeValue().get("status").asText());
        assertEquals(80.0, completed.getAfterValue().get("overallPercentageScore").asDouble());
    }

    @Test
    void unlabelledStatusTransitionsAreRecordedAndNoOpSavesAreQuiet() {
        var before = audit.state(assessment);
        assessment.setStatus(AssessmentStatus.PENDING_REVIEW);
        audit.assessmentChanged(assessment, assessment.getUser(), before, null);
        assertEquals("ASSESSMENT_STATUS_CHANGED", entry().getAction());
        assertEquals("DRAFT", entry().getBeforeValue().asText());
        assertEquals("PENDING_REVIEW", entry().getAfterValue().asText());
        clearInvocations(logs);
        audit.assessmentChanged(assessment, assessment.getUser(), audit.state(assessment), null);
        verifyNoInteractions(logs);
    }

    private QuestionEvaluation row(Object answer) {
        QuestionEvaluation row = new QuestionEvaluation(); row.setQuestionId(1001L); row.setResponseKey("D1_M1_101_1001");
        row.setResponse(mapper.valueToTree(answer)); return row;
    }
    private AssessmentLog entry() {
        ArgumentCaptor<AssessmentLog> captor = ArgumentCaptor.forClass(AssessmentLog.class);
        verify(logs).save(captor.capture()); return captor.getValue();
    }
}
