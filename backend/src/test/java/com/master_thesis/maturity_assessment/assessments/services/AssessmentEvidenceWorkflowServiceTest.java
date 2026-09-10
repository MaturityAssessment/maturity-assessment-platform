package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.AssessmentRequest;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceDTO;
import com.master_thesis.maturity_assessment.assessments.dto.QuestionResponseRequest;
import com.master_thesis.maturity_assessment.assessments.models.EvidenceType;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssessmentEvidenceWorkflowServiceTest {

    private static final long ASSESSMENT_ID = 10L;
    private static final long MODEL_ID = 20L;
    private static final long QUESTION_ID = 30L;
    private static final String RESPONSE_KEY = "D1_M1_40_30";

    @Mock
    private AssessmentService assessmentService;
    @Mock
    private EvidenceService evidenceService;
    @Mock
    private MaturityModelRepository maturityModelRepository;

    private AssessmentEvidenceWorkflowService workflowService;
    private User user;
    private AssessmentResponse savedAssessment;

    @BeforeEach
    void setUp() {
        workflowService = new AssessmentEvidenceWorkflowService(
                assessmentService,
                evidenceService,
                maturityModelRepository
        );
        user = new User();
        user.setId(1L);

        savedAssessment = new AssessmentResponse();
        savedAssessment.setId(ASSESSMENT_ID);
        savedAssessment.setMaturityModelId(MODEL_ID);
    }

    @Test
    void submittedDraftCanReusePersistedEvidenceWithoutUploadingAgain() throws Exception {
        AssessmentRequest request = request(Map.of(RESPONSE_KEY, 1));
        EvidenceDTO evidence = evidence();
        when(assessmentService.createAssessment(request, user)).thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of(evidence));
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(requiredEvidenceModel()));

        AssessmentResponse response = workflowService.submitAssessment(
                request,
                user,
                List.of(),
                List.of(),
                List.of(),
                true
        );

        assertEquals(List.of(evidence), response.getEvidence());
    }

    @Test
    void exactSubmissionTargetsTheLockedDraftAndUsesAuthoritativeEvidence() throws Exception {
        AssessmentRequest request = request(Map.of(RESPONSE_KEY, 1));
        EvidenceDTO evidence = evidence();
        when(assessmentService.submitDraft(ASSESSMENT_ID, request, user))
                .thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of(evidence));
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(requiredEvidenceModel()));

        AssessmentResponse response = workflowService.submitAssessment(
                ASSESSMENT_ID,
                request,
                user,
                List.of(),
                List.of(),
                List.of()
        );

        assertEquals(ASSESSMENT_ID, response.getId());
        assertEquals(List.of(evidence), response.getEvidence());
        verify(assessmentService).submitDraft(ASSESSMENT_ID, request, user);
    }

    @Test
    void finalSubmissionRejectsMissingRequiredEvidence() throws Exception {
        AssessmentRequest request = request(Map.of(RESPONSE_KEY, 1));
        when(assessmentService.createAssessment(request, user)).thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of());
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(requiredEvidenceModel()));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> workflowService.submitAssessment(
                        request,
                        user,
                        List.of(),
                        List.of(),
                        List.of(),
                        true
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void draftSaveAllowsRequiredEvidenceToRemainIncomplete() throws Exception {
        AssessmentRequest request = request(Map.of(RESPONSE_KEY, 1));
        when(assessmentService.saveDraft(request, user)).thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of());
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(requiredEvidenceModel()));

        AssessmentResponse response = workflowService.saveMultipartDraft(
                request,
                user,
                List.of(),
                List.of(),
                List.of(),
                true
        );

        assertEquals(List.of(), response.getEvidence());
    }

    @Test
    void exactDraftSaveTargetsTheRequestedDraftId() throws Exception {
        AssessmentRequest request = request(Map.of(RESPONSE_KEY, 1));
        when(assessmentService.saveDraft(ASSESSMENT_ID, request, user))
                .thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of());
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(requiredEvidenceModel()));

        AssessmentResponse response = workflowService.saveMultipartDraft(
                ASSESSMENT_ID,
                request,
                user,
                List.of(),
                List.of(),
                List.of()
        );

        assertEquals(ASSESSMENT_ID, response.getId());
        verify(assessmentService).saveDraft(ASSESSMENT_ID, request, user);
    }

    @Test
    void resetClearsEvidenceAndReturnsTheSameDraft() {
        when(assessmentService.resetDraft(ASSESSMENT_ID, user)).thenReturn(savedAssessment);

        AssessmentResponse response = workflowService.resetDraft(ASSESSMENT_ID, user);

        assertEquals(ASSESSMENT_ID, response.getId());
        assertEquals(List.of(), response.getEvidence());
        verify(evidenceService).clearEvidenceForDraft(ASSESSMENT_ID, user);
    }

    @Test
    void authoritativeDraftRejectsEvidenceForUnansweredQuestion() throws Exception {
        AssessmentRequest request = request(Map.of());
        when(assessmentService.saveDraft(request, user)).thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of(evidence()));
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(requiredEvidenceModel()));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> workflowService.saveMultipartDraft(
                        request,
                        user,
                        List.of(),
                        List.of(),
                        List.of(),
                        true
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void standaloneFileEvidenceIsAcceptedWithoutAResponseValue() throws Exception {
        AssessmentRequest request = request(Map.of());
        EvidenceDTO evidence = evidence();
        when(assessmentService.createAssessment(request, user)).thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of(evidence));
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(evidenceOnlyModel(true)));

        AssessmentResponse response = workflowService.submitAssessment(
                request,
                user,
                List.of(),
                List.of(),
                List.of(),
                true
        );

        assertEquals(List.of(evidence), response.getEvidence());
    }

    @Test
    void standaloneEvidenceAcceptsSecureLinks() throws Exception {
        AssessmentRequest request = request(Map.of());
        EvidenceDTO linkEvidence = EvidenceDTO.builder()
                .id(5L)
                .assessmentId(ASSESSMENT_ID)
                .questionId(QUESTION_ID)
                .evidenceType(EvidenceType.URL)
                .url("https://example.com/policy")
                .build();
        when(assessmentService.createAssessment(request, user)).thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of(linkEvidence));
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(evidenceOnlyModel(true)));

        AssessmentResponse response = workflowService.submitAssessment(
                request,
                user,
                List.of(),
                List.of(),
                List.of(),
                true
        );

        assertEquals(List.of(linkEvidence), response.getEvidence());
    }

    @Test
    void optionalStandaloneEvidenceCanBeOmitted() throws Exception {
        AssessmentRequest request = request(Map.of());
        when(assessmentService.createAssessment(request, user)).thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of());
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(evidenceOnlyModel(false)));

        AssessmentResponse response = workflowService.submitAssessment(
                request,
                user,
                List.of(),
                List.of(),
                List.of(),
                true
        );

        assertEquals(List.of(), response.getEvidence());
    }

    @Test
    void requiredStandaloneEvidenceCannotBeOmitted() throws Exception {
        AssessmentRequest request = request(Map.of());
        when(assessmentService.createAssessment(request, user)).thenReturn(savedAssessment);
        when(evidenceService.synchronizeEvidence(
                eq(ASSESSMENT_ID),
                eq(MODEL_ID),
                eq(user),
                any(),
                any(),
                any(),
                eq(true)
        )).thenReturn(List.of());
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(evidenceOnlyModel(true)));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> workflowService.submitAssessment(
                        request,
                        user,
                        List.of(),
                        List.of(),
                        List.of(),
                        true
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    private AssessmentRequest request(Map<String, Object> responses) {
        AssessmentRequest request = new AssessmentRequest();
        request.setMaturityModelId(MODEL_ID);
        Map<String, QuestionResponseRequest> questionResponses =
                new java.util.LinkedHashMap<>();
        responses.forEach((key, value) -> {
            QuestionResponseRequest questionResponse = new QuestionResponseRequest();
            questionResponse.setQuestionId(
                    Long.parseLong(key.substring(key.lastIndexOf('_') + 1))
            );
            questionResponse.setResponse(value);
            questionResponses.put(key, questionResponse);
        });
        request.setQuestionResponses(questionResponses);
        return request;
    }

    private EvidenceDTO evidence() {
        return EvidenceDTO.builder()
                .id(5L)
                .assessmentId(ASSESSMENT_ID)
                .questionId(QUESTION_ID)
                .evidenceType(EvidenceType.FILE)
                .fileName("policy.pdf")
                .build();
    }

    private MaturityModel requiredEvidenceModel() {
        return modelWithQuestion(null);
    }

    private MaturityModel evidenceOnlyModel(boolean required) {
        MaturityModel model = modelWithQuestion("evidence");
        model.getDimensions().get(0).getModules().get(0).getPractices().get(0)
                .getQuestions().get(0).setRequired(required);
        return model;
    }

    private MaturityModel modelWithQuestion(String type) {
        Question question = new Question();
        question.setId(QUESTION_ID);
        question.setType(type);
        question.setRequiresEvidence(true);
        question.setRequired(true);

        Practice practice = new Practice();
        practice.setId(40L);
        practice.setQuestions(List.of(question));
        question.setPractice(practice);

        Module module = new Module();
        module.setCode("M1");
        module.setPractices(List.of(practice));
        practice.setModule(module);

        Dimension dimension = new Dimension();
        dimension.setDimensionId("D1");
        dimension.setModules(List.of(module));
        module.setDimension(dimension);

        MaturityModel model = new MaturityModel();
        model.setId(MODEL_ID);
        model.setDimensions(List.of(dimension));
        dimension.setMaturityModel(model);
        return model;
    }
}
