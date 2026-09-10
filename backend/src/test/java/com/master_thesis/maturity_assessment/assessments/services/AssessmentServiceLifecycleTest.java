package com.master_thesis.maturity_assessment.assessments.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentRequest;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.dto.ManualEvaluationRequest;
import com.master_thesis.maturity_assessment.assessments.dto.QuestionEvaluationRequest;
import com.master_thesis.maturity_assessment.assessments.dto.QuestionResponseRequest;
import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import com.master_thesis.maturity_assessment.assessments.models.Evidence;
import com.master_thesis.maturity_assessment.assessments.models.QuestionEvaluation;
import com.master_thesis.maturity_assessment.assessments.models.QuestionEvaluationStatus;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.assessments.repository.DimensionResultRepository;
import com.master_thesis.maturity_assessment.assessments.repository.EvidenceRepository;
import com.master_thesis.maturity_assessment.assessments.repository.QuestionEvaluationRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.campaigns.models.Campaign;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityLevel;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingComparisonOperator;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingScoreOperation;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingSelection;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import com.master_thesis.maturity_assessment.maturity_models.services.MaturityScoringService;
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
import java.util.Set;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssessmentServiceLifecycleTest {

    private static final long USER_ID = 7L;
    private static final long MODEL_ID = 11L;
    private static final long ASSESSMENT_ID = 23L;

    @Mock
    private AssessmentRepository assessmentRepository;

    @Mock
    private DimensionResultRepository dimensionResultRepository;

    @Mock
    private MaturityModelRepository maturityModelRepository;

    @Mock
    private EvidenceRepository evidenceRepository;

    @Mock
    private QuestionEvaluationRepository questionEvaluationRepository;

    @Mock
    private UserRepository userRepository;

    private AssessmentService assessmentService;
    private User user;

    @BeforeEach
    void setUp() {
        assessmentService = new AssessmentService(
                assessmentRepository,
                dimensionResultRepository,
                maturityModelRepository,
                evidenceRepository,
                questionEvaluationRepository,
                userRepository,
                new MaturityScoringService(),
                new ObjectMapper()
        );

        user = new User();
        user.setId(USER_ID);

        lenient().when(assessmentRepository.save(any(Assessment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(assessmentRepository.saveAndFlush(any(Assessment.class)))
                .thenAnswer(invocation -> {
                    Assessment assessment = invocation.getArgument(0);
                    if (assessment.getId() == null) {
                        assessment.setId(ASSESSMENT_ID);
                    }
                    return assessment;
                });
        lenient().when(userRepository.findByIdForUpdate(USER_ID))
                .thenReturn(Optional.of(user));
        lenient().when(evidenceRepository.findByAssessmentIdOrderByIdAsc(any()))
                .thenReturn(List.of());
        lenient().when(questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(any()))
                .thenReturn(List.of());
    }

    @Test
    void submittingSavedDraftForManualModelMovesItToPendingReview() {
        MaturityModel model = model(false);
        Assessment draft = draftAssessment();
        AssessmentRequest request = request(Map.of());

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(request, user);

        assertEquals(ASSESSMENT_ID, response.getId());
        assertEquals("PENDING_REVIEW", response.getStatus());
        assertFalse(response.getIsCompleted());
        assertEquals(AssessmentStatus.PENDING_REVIEW, draft.getStatus());
        assertFalse(draft.getIsCompleted());
    }

    @Test
    void legacyResponsesPayloadIsRejected() {
        assertThrows(
                Exception.class,
                () -> new ObjectMapper().readValue(
                        """
                        {
                          "maturityModelId": 11,
                          "responses": {"D1_M1_101_1001": 1}
                        }
                        """,
                        AssessmentRequest.class
                )
        );
    }

    @Test
    void submittingSavedDraftForAutoEvaluatedModelCompletesIt() {
        MaturityModel model = model(true);
        Assessment draft = draftAssessment();
        AssessmentRequest request = request(Map.of());

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(request, user);

        assertEquals("COMPLETED", response.getStatus());
        assertTrue(response.getIsCompleted());
        assertEquals(AssessmentStatus.COMPLETED, draft.getStatus());
        assertTrue(draft.getIsCompleted());
    }

    @Test
    void configuredRulesAggregateScoresThroughEveryHierarchyLevel() {
        MaturityModel model = hierarchicalAggregationModel();
        Assessment draft = draftAssessment();
        Map<String, Object> responses = Map.of(
                "D1_M1_101_1001", 5,
                "D1_M1_101_1002", 2,
                "D1_M1_102_1003", 4,
                "D1_M2_103_1004", 3,
                "D2_M3_104_1005", 5
        );

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(request(responses), user);

        assertEquals(2, response.getDimensionResults().size());
        assertEquals(3.0, response.getDimensionResults().get(0).getAverageScore());
        assertEquals(5.0, response.getDimensionResults().get(1).getAverageScore());
        assertEquals(5.0, response.getOverallAverage());
        assertEquals("Level 5", response.getOverallMaturityLevel());
    }

    @Test
    void booleanAnswersStayNormalizedUntilDimensionAndOverallProjection() {
        MaturityModel model = booleanScoringModel();
        Assessment draft = draftAssessment();
        Map<String, Object> responses = Map.of(
                "D1_M1_101_1001", true,
                "D1_M1_101_1002", true
        );

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(request(responses), user);

        assertEquals(1, response.getDimensionResults().size());
        assertEquals(3.0, response.getDimensionResults().getFirst().getAverageScore());
        assertEquals(50.0, response.getDimensionResults().getFirst().getPercentageScore());
        assertEquals("Level 3", response.getDimensionResults().getFirst().getMaturityLevel());
        assertEquals(3.0, response.getOverallAverage());
        assertEquals(50.0, response.getOverallPercentageScore());
        assertEquals("Level 3", response.getOverallMaturityLevel());
    }

    @Test
    void gatingRulesApplyAtEveryHierarchyStageBeforeDimensionMapping() {
        MaturityModel model = booleanScoringModel();
        Practice practice = model.getDimensions().getFirst().getModules().getFirst().getPractices().getFirst();
        Module module = model.getDimensions().getFirst().getModules().getFirst();
        Dimension dimension = model.getDimensions().getFirst();
        practice.setGatingRules(List.of(gatingRule(
                GatingSelection.SPECIFIC_CHILD, "Q1001", GatingComparisonOperator.BELOW,
                0.50, GatingScoreOperation.SET, 0.40)));
        module.setGatingRules(List.of(gatingRule(
                GatingSelection.SPECIFIC_CHILD, "P1", GatingComparisonOperator.ABOVE_OR_EQUAL,
                0.40, GatingScoreOperation.ADD, 0.10)));
        dimension.setGatingRules(List.of(gatingRule(
                GatingSelection.ANY_CHILD, null, GatingComparisonOperator.ABOVE_OR_EQUAL,
                0.50, GatingScoreOperation.ADD, 0.25)));
        Assessment draft = draftAssessment();

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID, MODEL_ID, AssessmentStatus.DRAFT)).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(request(Map.of(
                "D1_M1_101_1001", false,
                "D1_M1_101_1002", false)), user);

        assertEquals(75.0, response.getDimensionResults().getFirst().getPercentageScore());
        assertEquals(4, response.getDimensionResults().getFirst().getMaturityLevelNumber());
        assertEquals(4.0, response.getDimensionResults().getFirst().getAverageScore());
    }

    @Test
    void booleanScoresRetainLegacyMeaningWhenMixedWithUnnormalizedFormats() {
        MaturityModel model = booleanScoringModel();
        model.getDimensions().getFirst().getModules().getFirst().getPractices().getFirst()
                .getQuestions().get(1).setType("likert");
        Assessment draft = draftAssessment();
        Map<String, Object> responses = Map.of(
                "D1_M1_101_1001", true,
                "D1_M1_101_1002", 5
        );

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(request(responses), user);

        assertEquals(5.0, response.getDimensionResults().getFirst().getAverageScore());
        assertEquals(5.0, response.getOverallAverage());
    }

    @Test
    void scaleAnswersNormalizeByPointCountAndConfiguredDirection() {
        MaturityModel model = booleanScoringModel();
        List<Question> questions = model.getDimensions().getFirst().getModules().getFirst()
                .getPractices().getFirst().getQuestions();
        questions.forEach(question -> {
            question.setType("likert");
            question.setScalePointCount(5);
        });
        questions.get(0).setScaleHighPointIsMaximum(true);
        questions.get(1).setScaleHighPointIsMaximum(false);
        Assessment draft = draftAssessment();

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(request(Map.of(
                "D1_M1_101_1001", 3,
                "D1_M1_101_1002", 2
        )), user);

        assertEquals(3.5, response.getDimensionResults().getFirst().getAverageScore());
        assertEquals(63.0, response.getDimensionResults().getFirst().getPercentageScore());
        assertEquals(4, response.getDimensionResults().getFirst().getMaturityLevelNumber());
        assertEquals(4.0, response.getOverallAverage());
        verify(questionEvaluationRepository).saveAll(argThat(items -> {
            Set<Double> scores = new java.util.HashSet<>();
            items.forEach(item -> scores.add(item.getInitialScore()));
            return scores.equals(Set.of(0.5, 0.75));
        }));
    }

    @Test
    void multipleChoiceUsesConfiguredNormalizedScoresUntilDimensionProjection() {
        MaturityModel model = booleanScoringModel();
        List<Question> questions = model.getDimensions().getFirst().getModules().getFirst()
                .getPractices().getFirst().getQuestions();
        questions.forEach(question -> {
            question.setType("multiple_choice");
            question.setChoiceOptions("""
                    [{"label":"Developing","score":0.25},{"label":"Established","score":0.75}]
                    """);
        });
        Assessment draft = draftAssessment();

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(request(Map.of(
                "D1_M1_101_1001", 0.25,
                "D1_M1_101_1002", 0.75
        )), user);

        assertEquals(3.0, response.getDimensionResults().getFirst().getAverageScore());
        assertEquals(50.0, response.getDimensionResults().getFirst().getPercentageScore());
        assertEquals(3.0, response.getOverallAverage());
        verify(questionEvaluationRepository).saveAll(argThat(items -> {
            Set<Double> scores = new java.util.HashSet<>();
            items.forEach(item -> scores.add(item.getInitialScore()));
            return scores.equals(Set.of(0.25, 0.75));
        }));
    }

    @Test
    void campaignParticipantLazilyCreatesAndSubmitsOneOwnedAssessment() {
        MaturityModel model = model(true);
        Campaign campaign = new Campaign();
        campaign.setId(41L);
        campaign.setMaturityModel(model);
        CampaignParticipant participant = new CampaignParticipant();
        participant.setId(51L);
        participant.setCampaign(campaign);
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID))
                .thenReturn(List.of());

        AssessmentResponse opened =
                assessmentService.ensureCampaignAssessment(participant);

        Assessment created = participant.getAssessment();
        assertEquals(ASSESSMENT_ID, opened.getId());
        assertEquals(AssessmentStatus.DRAFT, created.getStatus());
        assertNull(created.getUser());
        assertEquals(campaign, created.getCampaign());
        assertEquals(participant, created.getCampaignParticipant());

        when(assessmentRepository.findCampaignAssessmentByIdForUpdate(
                ASSESSMENT_ID,
                51L
        )).thenReturn(Optional.of(created));
        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(model));

        AssessmentResponse submitted = assessmentService.submitCampaignAssessment(
                request(Map.of()),
                participant
        );

        assertEquals("COMPLETED", submitted.getStatus());
        assertTrue(submitted.getIsCompleted());
        assertNull(created.getUser());
        assertEquals(campaign, created.getCampaign());
        verify(assessmentRepository, times(1)).saveAndFlush(created);
    }

    @Test
    void exactSubmissionReusesDraftAndRejectsLostResponseRetry() {
        MaturityModel model = model(true);
        Assessment draft = draftAssessment();
        AssessmentRequest request = request(Map.of());

        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(draft));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.submitDraft(
                ASSESSMENT_ID,
                request,
                user
        );

        assertEquals(ASSESSMENT_ID, response.getId());
        assertEquals("COMPLETED", response.getStatus());
        ResponseStatusException retry = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.submitDraft(ASSESSMENT_ID, request, user),
                "A retry must reject the row after its DRAFT transition."
        );
        assertEquals(HttpStatus.CONFLICT, retry.getStatusCode());
        verify(assessmentRepository, times(1)).save(draft);
        verify(assessmentRepository, never())
                .findByUserIdAndMaturityModelIdAndStatus(any(), any(), any());
    }

    @Test
    void exactSubmissionRejectsMismatchedModelBeforeEvaluation() {
        AssessmentRequest mismatchedRequest = request(Map.of());
        mismatchedRequest.setMaturityModelId(99L);
        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(draftAssessment()));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.submitDraft(
                        ASSESSMENT_ID,
                        mismatchedRequest,
                        user
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(maturityModelRepository, never()).findById(any());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void submittingAssessmentRejectsMissingRequiredResponse() {
        MaturityModel model = autoModelWithRequiredBooleanDependency();
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> assessmentService.createAssessment(request(Map.of()), user)
        );

        assertEquals("REQUIRED_QUESTIONS_UNANSWERED", exception.getErrorCode());
        assertEquals("1 required question(s) still need an answer.", exception.getMessage());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void negativeParentResponseSatisfiesRequirementAndHidesRequiredDependent() {
        String parentKey = "D1_M1_101_1001";
        MaturityModel model = autoModelWithRequiredBooleanDependency();
        Assessment draft = draftAssessment();

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(
                request(Map.of(parentKey, 0)),
                user
        );

        assertEquals("COMPLETED", response.getStatus());
        assertTrue(response.getIsCompleted());
    }

    @Test
    void affirmativeParentResponseMakesRequiredDependentMandatory() {
        String parentKey = "D1_M1_101_1001";
        MaturityModel model = autoModelWithRequiredBooleanDependency();
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> assessmentService.createAssessment(
                        request(Map.of(parentKey, 1)),
                        user
                )
        );

        assertEquals("REQUIRED_QUESTIONS_UNANSWERED", exception.getErrorCode());
        assertEquals("1 required question(s) still need an answer.", exception.getMessage());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void hiddenIntermediateResponseDoesNotMakeNestedRequiredDependentVisible() {
        String rootKey = "D1_M1_101_1001";
        String intermediateKey = "D1_M1_101_1002";
        MaturityModel model = autoModelWithNestedRequiredBooleanDependency();
        Assessment draft = draftAssessment();

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(
                request(Map.of(rootKey, 0, intermediateKey, 1)),
                user
        );

        assertEquals("COMPLETED", response.getStatus());
        assertTrue(response.getIsCompleted());
    }

    @Test
    void evaluatingPendingAssessmentCompletesIt() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "A detailed answer"))
        );
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        request.setManualScores(Map.of(responseKey, 4.0));
        request.setEvaluatorInsight("Prioritize repeatable measurement.");

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        AssessmentResponse response = assessmentService.evaluateAssessment(
                ASSESSMENT_ID,
                request,
                user
        );

        assertEquals("COMPLETED", response.getStatus());
        assertTrue(response.getIsCompleted());
        assertEquals(AssessmentStatus.COMPLETED, assessment.getStatus());
        assertTrue(assessment.getIsCompleted());
        assertEquals(4.0, response.getOverallAverage());
        assertEquals(0.75, response.getDimensionResults().getFirst().getTotalScore());
    }

    @Test
    void strictEvaluationSavesQuestionEvaluationsAndPreservesOriginalResponses() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "A detailed answer"))
        );
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        QuestionEvaluationRequest questionEvaluation = new QuestionEvaluationRequest();
        questionEvaluation.setQuestionId(1001L);
        questionEvaluation.setValidationStatus("ACCEPTED");
        questionEvaluation.setManualScore(4.0);
        questionEvaluation.setReviewerNote("Evidence and answer are consistent.");
        request.setQuestionEvaluations(Map.of(responseKey, questionEvaluation));
        request.setEvaluatorInsight("Prioritize repeatable measurement.");

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        AssessmentResponse response = assessmentService.evaluateAssessment(
                ASSESSMENT_ID,
                request,
                user
        );

        assertEquals("COMPLETED", response.getStatus());
        assertEquals(4.0, response.getOverallAverage());
        QuestionEvaluation persistedAnswer =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).get(0);
        assertEquals("A detailed answer", persistedAnswer.getResponse().asText());
        assertEquals(4.0, persistedAnswer.getManualScore());
        assertEquals(0.75, response.getDimensionResults().getFirst().getTotalScore());
        verify(questionEvaluationRepository).saveAll(argThat(items -> {
            var iterator = items.iterator();
            return iterator.hasNext()
                    && iterator.next().toString().contains(responseKey)
                    && !iterator.hasNext();
        }));
    }

    @Test
    void strictEvaluationRejectsUnreviewedSubmittedAnswer() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "A detailed answer"))
        );
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        QuestionEvaluationRequest unrelatedEvaluation = new QuestionEvaluationRequest();
        unrelatedEvaluation.setValidationStatus("ACCEPTED");
        request.setQuestionEvaluations(Map.of("D1_M1_101_9999", unrelatedEvaluation));

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.evaluateAssessment(ASSESSMENT_ID, request, user)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void strictEvaluationRejectsMissingManualScoreForOpenAnswer() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "A detailed answer"))
        );
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        QuestionEvaluationRequest questionEvaluation = new QuestionEvaluationRequest();
        questionEvaluation.setQuestionId(1001L);
        questionEvaluation.setValidationStatus("ACCEPTED");
        request.setQuestionEvaluations(Map.of(responseKey, questionEvaluation));

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.evaluateAssessment(ASSESSMENT_ID, request, user)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void strictEvaluationRejectsNormalizedValueInsteadOfOpenAnswerMaturityLevel() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "A detailed answer"))
        );
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        QuestionEvaluationRequest questionEvaluation = new QuestionEvaluationRequest();
        questionEvaluation.setQuestionId(1001L);
        questionEvaluation.setValidationStatus("ACCEPTED");
        questionEvaluation.setManualScore(0.75);
        request.setQuestionEvaluations(Map.of(responseKey, questionEvaluation));

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.evaluateAssessment(ASSESSMENT_ID, request, user)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("between 1 and 5"));
    }

    @Test
    void strictEvaluationAcceptsEvidenceRequiredNonOpenAnswerWithoutManualScore() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithEvidenceBooleanQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, 1))
        );
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        QuestionEvaluationRequest questionEvaluation = new QuestionEvaluationRequest();
        questionEvaluation.setQuestionId(1001L);
        questionEvaluation.setValidationStatus("ACCEPTED");
        request.setQuestionEvaluations(Map.of(responseKey, questionEvaluation));

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        AssessmentResponse response = assessmentService.evaluateAssessment(
                ASSESSMENT_ID,
                request,
                user
        );

        assertEquals("COMPLETED", response.getStatus());
        assertEquals(5.0, response.getOverallAverage());
    }

    @Test
    void manualOverridePreservesResponseAndInitialScore() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithEvidenceBooleanQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, 1))
        );
        QuestionEvaluation persisted =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).get(0);
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        QuestionEvaluationRequest questionEvaluation = new QuestionEvaluationRequest();
        questionEvaluation.setQuestionId(1001L);
        questionEvaluation.setValidationStatus("ADJUSTED");
        questionEvaluation.setManualScore(0.0);
        questionEvaluation.setReviewerNote("Evidence supports a lower score.");
        request.setQuestionEvaluations(Map.of(responseKey, questionEvaluation));

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        AssessmentResponse response = assessmentService.evaluateAssessment(
                ASSESSMENT_ID,
                request,
                user
        );

        assertEquals(1.0, response.getOverallAverage());
        assertEquals(1, persisted.getResponse().asInt());
        assertEquals(1.0, persisted.getInitialScore());
        assertEquals(0.0, persisted.getManualScore());
        assertEquals(QuestionEvaluationStatus.ADJUSTED, persisted.getValidationStatus());
    }

    @Test
    void strictEvaluationRejectsAdjustedAnswerWithoutManualScoreAndNote() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithEvidenceBooleanQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, 1))
        );
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        QuestionEvaluationRequest questionEvaluation = new QuestionEvaluationRequest();
        questionEvaluation.setQuestionId(1001L);
        questionEvaluation.setValidationStatus("ADJUSTED");
        request.setQuestionEvaluations(Map.of(responseKey, questionEvaluation));

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.evaluateAssessment(ASSESSMENT_ID, request, user)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void evaluationProgressUpdatesReviewFieldsWithoutCompletingAssessment() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "A detailed answer"))
        );
        QuestionEvaluation persisted =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).getFirst();
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        QuestionEvaluationRequest review = new QuestionEvaluationRequest();
        review.setQuestionId(1001L);
        review.setValidationStatus("FLAGGED");
        request.setQuestionEvaluations(Map.of(responseKey, review));

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        AssessmentResponse response =
                assessmentService.saveEvaluationProgress(ASSESSMENT_ID, request, user);

        assertEquals("PENDING_REVIEW", response.getStatus());
        assertFalse(response.getIsCompleted());
        assertEquals(QuestionEvaluationStatus.FLAGGED, persisted.getValidationStatus());
        assertEquals("A detailed answer", persisted.getResponse().asText());
        assertNull(persisted.getReviewerNote());
    }

    @Test
    void evaluationProgressMatchesExistingRowByCanonicalQuestionId() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "A detailed answer"))
        );
        QuestionEvaluation persisted =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).getFirst();
        persisted.setResponseKey("legacy_response_key_1001");

        Evidence evidence = new Evidence();
        evidence.setAssessment(assessment);
        evidence.setQuestion(
                model.getDimensions().getFirst()
                        .getModules().getFirst()
                        .getPractices().getFirst()
                        .getQuestions().getFirst()
        );
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of(evidence));

        ManualEvaluationRequest request = new ManualEvaluationRequest();
        QuestionEvaluationRequest review = new QuestionEvaluationRequest();
        review.setQuestionId(1001L);
        review.setValidationStatus("ACCEPTED");
        review.setManualScore(4.0);
        request.setQuestionEvaluations(Map.of(responseKey, review));

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        assessmentService.saveEvaluationProgress(ASSESSMENT_ID, request, user);

        assertEquals(responseKey, persisted.getResponseKey());
        assertEquals(QuestionEvaluationStatus.ACCEPTED, persisted.getValidationStatus());
        verify(questionEvaluationRepository).saveAll(argThat(items -> {
            var iterator = items.iterator();
            return iterator.hasNext()
                    && iterator.next() == persisted
                    && !iterator.hasNext();
        }));
    }

    @Test
    void finishEvaluationUsesPersistedQuestionReviews() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "A detailed answer"))
        );
        QuestionEvaluation persisted =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).getFirst();
        persisted.setValidationStatus(QuestionEvaluationStatus.ACCEPTED);
        persisted.setManualScore(4.0);

        ManualEvaluationRequest request = new ManualEvaluationRequest();
        request.setEvaluatorInsight("Keep measuring the process.");
        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        AssessmentResponse response =
                assessmentService.finishEvaluation(ASSESSMENT_ID, request, user);

        assertEquals("COMPLETED", response.getStatus());
        assertTrue(response.getIsCompleted());
        assertEquals(4.0, response.getOverallAverage());
        assertEquals("Keep measuring the process.", response.getEvaluatorInsight());
    }

    @Test
    void finishEvaluationRejectsPersistedFlaggedItems() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "Needs clarification"))
        );
        QuestionEvaluation persisted =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).getFirst();
        persisted.setValidationStatus(QuestionEvaluationStatus.FLAGGED);
        persisted.setManualScore(3.0);
        persisted.setReviewerNote("Clarify the ownership model.");

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.finishEvaluation(
                        ASSESSMENT_ID,
                        new ManualEvaluationRequest(),
                        user
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("must be resolved or sent back"));
        assertEquals(AssessmentStatus.PENDING_REVIEW, assessment.getStatus());
    }

    @Test
    void sendBackRequiresFlaggedReviewNotesAndPreservesAssessmentLink() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "Needs clarification"))
        );
        QuestionEvaluation persisted =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).getFirst();
        persisted.setValidationStatus(QuestionEvaluationStatus.FLAGGED);
        persisted.setReviewerNote("Explain who owns this process and attach supporting evidence.");

        ManualEvaluationRequest request = new ManualEvaluationRequest();
        request.setEvaluatorInsight("Please address the flagged response.");
        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        AssessmentResponse response =
                assessmentService.sendEvaluationBack(ASSESSMENT_ID, request, user);

        assertEquals("CHANGES_REQUESTED", response.getStatus());
        assertFalse(response.getIsCompleted());
        assertEquals(AssessmentStatus.CHANGES_REQUESTED, assessment.getStatus());
        assertEquals(assessment, persisted.getAssessment());
        assertEquals(
                "Explain who owns this process and attach supporting evidence.",
                persisted.getReviewerNote()
        );
    }

    @Test
    void sendBackRejectsFlagWithoutReviewerNote() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "Needs clarification"))
        );
        QuestionEvaluation persisted =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).getFirst();
        persisted.setValidationStatus(QuestionEvaluationStatus.FLAGGED);

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.sendEvaluationBack(
                        ASSESSMENT_ID,
                        new ManualEvaluationRequest(),
                        user
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals(AssessmentStatus.PENDING_REVIEW, assessment.getStatus());
    }

    @Test
    void respondentSaveMarksReturnedFlagAsUpdatedWithoutLeavingReturnedState() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "Original"))
        );
        assessment.setStatus(AssessmentStatus.CHANGES_REQUESTED);
        QuestionEvaluation flagged =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).getFirst();
        flagged.setValidationStatus(QuestionEvaluationStatus.FLAGGED);
        flagged.setReviewerNote("Add ownership details.");

        AssessmentRequest request = request(Map.of(responseKey, "Updated with an owner"));
        request.setRespondentUpdatedResponseKeys(Set.of(responseKey));
        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        AssessmentResponse response =
                assessmentService.saveDraft(ASSESSMENT_ID, request, user);

        assertEquals("CHANGES_REQUESTED", response.getStatus());
        assertTrue(flagged.getRespondentUpdated());
        assertEquals(QuestionEvaluationStatus.FLAGGED, flagged.getValidationStatus());
    }

    @Test
    void respondentCannotChangeAcceptedReturnedResponse() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "Accepted answer"))
        );
        assessment.setStatus(AssessmentStatus.CHANGES_REQUESTED);
        QuestionEvaluation accepted =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).getFirst();
        accepted.setValidationStatus(QuestionEvaluationStatus.ACCEPTED);

        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.saveDraft(
                        ASSESSMENT_ID,
                        request(Map.of(responseKey, "Changed answer")),
                        user
                )
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals(AssessmentStatus.CHANGES_REQUESTED, assessment.getStatus());
    }

    @Test
    void returnedAssessmentRequiresEveryFlaggedItemUpdateBeforeResubmission() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment assessment = pendingAssessment(
                new ObjectMapper().writeValueAsString(Map.of(responseKey, "Needs clarification"))
        );
        assessment.setStatus(AssessmentStatus.CHANGES_REQUESTED);
        QuestionEvaluation flagged =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID).getFirst();
        flagged.setValidationStatus(QuestionEvaluationStatus.FLAGGED);
        flagged.setReviewerNote("Clarify the accountable owner.");

        AssessmentRequest request =
                request(Map.of(responseKey, "The security lead is accountable."));
        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID))
                .thenReturn(List.of());

        ResponseStatusException unresolved = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.submitDraft(ASSESSMENT_ID, request, user)
        );
        assertEquals(HttpStatus.CONFLICT, unresolved.getStatusCode());

        request.setRespondentUpdatedResponseKeys(Set.of(responseKey));
        AssessmentResponse response =
                assessmentService.submitDraft(ASSESSMENT_ID, request, user);

        assertEquals("PENDING_REVIEW", response.getStatus());
        assertNull(flagged.getValidationStatus());
        assertTrue(flagged.getRespondentUpdated());
    }

    @Test
    void completingPendingAssessmentWithoutManualQuestionsMarksItCompleted() {
        Assessment assessment = pendingAssessment("{}");
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        request.setEvaluatorInsight("No manual scoring was required.");

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.completeAssessment(
                ASSESSMENT_ID,
                request,
                user
        );

        assertEquals("COMPLETED", response.getStatus());
        assertTrue(response.getIsCompleted());
        assertEquals(AssessmentStatus.COMPLETED, assessment.getStatus());
    }

    @Test
    void completedAssessmentCannotBeReviewedAgain() {
        Assessment assessment = pendingAssessment("{}");
        assessment.setStatus(AssessmentStatus.COMPLETED);
        assessment.setIsCompleted(true);
        ManualEvaluationRequest request = new ManualEvaluationRequest();
        request.setManualScores(Map.of("irrelevant", 3.0));

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.evaluateAssessment(ASSESSMENT_ID, request, user)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void numericResponseNormalizesLinearlyWithinConfiguredIntegerBounds() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = autoModelWithNumericQuestion();
        Assessment draft = draftAssessment();

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(
                request(Map.of(responseKey, 75)),
                user);

        assertEquals(3.0, response.getOverallAverage());
        verify(questionEvaluationRepository).saveAll(argThat(items -> {
            var iterator = items.iterator();
            if (!iterator.hasNext()) return false;
            QuestionEvaluation first = iterator.next();
            return !iterator.hasNext() && Double.compare(first.getInitialScore(), 0.75) == 0;
        }));
    }

    @Test
    void numericResponseCanTreatLowerBoundAsMaximumScore() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = autoModelWithNumericQuestion();
        model.getDimensions().getFirst().getModules().getFirst().getPractices().getFirst()
                .getQuestions().getFirst().setRangeHighValueIsMaximum(false);
        Assessment draft = draftAssessment();

        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID, MODEL_ID, AssessmentStatus.DRAFT)).thenReturn(Optional.of(draft));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        AssessmentResponse response = assessmentService.createAssessment(
                request(Map.of(responseKey, 25)), user);

        assertEquals(3.0, response.getOverallAverage());
    }

    @Test
    void submittingNumericResponseOutsideConfiguredBoundsIsRejected() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = autoModelWithNumericQuestion();
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> assessmentService.createAssessment(
                        request(Map.of(responseKey, 101)),
                        user));

        assertEquals("INVALID_NUMERIC_RESPONSE", exception.getErrorCode());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void savingDraftWithNonNumericValueForNumericQuestionIsRejected() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = autoModelWithNumericQuestion();
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> assessmentService.saveDraft(
                        request(Map.of(responseKey, "not-a-number")),
                        user));

        assertEquals("INVALID_NUMERIC_RESPONSE", exception.getErrorCode());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void savingFractionalNumericResponseIsRejected() throws Exception {
        String responseKey = "D1_M1_101_1001";
        MaturityModel model = autoModelWithNumericQuestion();
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> assessmentService.saveDraft(request(Map.of(responseKey, 42.5)), user));

        assertEquals("INVALID_NUMERIC_RESPONSE", exception.getErrorCode());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void userAssessmentListIncludesMaturityModelVersion() {
        Assessment assessment = draftAssessment();

        when(assessmentRepository.findByUserIdOrderByCreatedAtDescIdDesc(USER_ID))
                .thenReturn(List.of(assessment));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID))
                .thenReturn(List.of());
        when(maturityModelRepository.findAssessmentMetadataByIdIn(any()))
                .thenReturn(List.<Object[]>of(new Object[] { MODEL_ID, "Governance", 3 }));

        AssessmentResponse response = assessmentService.getAssessmentsByUser(user).getFirst();

        assertEquals("Governance", response.getDomainName());
        assertEquals(3, response.getMaturityModelVersion());
    }

    @Test
    void allAssessmentListIdentifiesCampaignAssessments() {
        Campaign campaign = new Campaign();
        campaign.setId(41L);
        campaign.setName("Quarterly security review");

        CampaignParticipant participant = new CampaignParticipant();
        participant.setId(51L);
        participant.setEmail("participant@example.com");
        participant.setCampaign(campaign);

        Assessment assessment = draftAssessment();
        assessment.setUser(null);
        assessment.setCampaign(campaign);
        assessment.setCampaignParticipant(participant);

        when(assessmentRepository.findAllWithUser()).thenReturn(List.of(assessment));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID))
                .thenReturn(List.of());

        AssessmentResponse response = assessmentService.getAllAssessments().getFirst();

        assertEquals(41L, response.getCampaignId());
        assertEquals("Quarterly security review", response.getCampaignName());
        assertEquals(51L, response.getCampaignParticipantId());
        assertEquals("participant@example.com", response.getUserEmail());
        assertNull(response.getUserId());
    }

    @Test
    void modelLineageDraftLookupReturnsCurrentAndLegacyVersions() {
        long legacyModelId = 10L;
        MaturityModel currentModel = model(true);
        currentModel.setBaseModelId(legacyModelId);
        currentModel.setVersion(2);

        MaturityModel legacyModel = model(true);
        legacyModel.setId(legacyModelId);
        legacyModel.setBaseModelId(legacyModelId);
        legacyModel.setVersion(1);

        Assessment currentDraft = draftAssessment();
        Assessment legacyDraft = draftAssessment();
        legacyDraft.setId(24L);
        legacyDraft.setMaturityModelId(legacyModelId);

        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(currentModel));
        when(maturityModelRepository.findByBaseModelIdOrderByVersionAsc(legacyModelId))
                .thenReturn(List.of(legacyModel, currentModel));
        when(assessmentRepository
                .findByUserIdAndStatusAndMaturityModelIdInOrderByUpdatedAtDescIdDesc(
                        eq(USER_ID),
                        eq(AssessmentStatus.DRAFT),
                        argThat(ids -> ids.containsAll(List.of(legacyModelId, MODEL_ID)))
                ))
                .thenReturn(List.of(currentDraft, legacyDraft));
        when(maturityModelRepository.findAssessmentMetadataByIdIn(any()))
                .thenReturn(List.of(
                        new Object[] { MODEL_ID, "Governance", 2 },
                        new Object[] { legacyModelId, "Governance", 1 }
                ));

        List<AssessmentResponse> responses =
                assessmentService.getDraftsByMaturityModelLineage(MODEL_ID, user);

        assertEquals(2, responses.size());
        assertEquals(
                2,
                responses.stream()
                        .filter(response -> response.getMaturityModelId().equals(MODEL_ID))
                        .findFirst()
                        .orElseThrow()
                        .getMaturityModelVersion()
        );
        assertEquals(
                1,
                responses.stream()
                        .filter(response -> response.getMaturityModelId().equals(legacyModelId))
                        .findFirst()
                        .orElseThrow()
                        .getMaturityModelVersion()
        );
    }

    @Test
    void savingCurrentVersionDraftDoesNotReuseLegacyVersionDraft() {
        long legacyModelId = 10L;
        MaturityModel currentModel = model(true);

        when(maturityModelRepository.findById(MODEL_ID))
                .thenReturn(Optional.of(currentModel));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.empty());
        when(maturityModelRepository.findAssessmentMetadataByIdIn(any()))
                .thenReturn(List.<Object[]>of(new Object[] { MODEL_ID, "Governance", 2 }));

        AssessmentResponse response = assessmentService.saveDraft(request(Map.of()), user);

        assertEquals(MODEL_ID, response.getMaturityModelId());
        verify(assessmentRepository).findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        );
        verify(assessmentRepository, never()).findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                legacyModelId,
                AssessmentStatus.DRAFT
        );
    }

    @Test
    void ensuringDraftCreatesOneEmptyDraftForAnActiveModel() {
        MaturityModel activeModel = model(true);
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(activeModel));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.empty());

        AssessmentResponse response = assessmentService.ensureDraftForModel(MODEL_ID, user);

        assertEquals(ASSESSMENT_ID, response.getId());
        assertEquals(MODEL_ID, response.getMaturityModelId());
        assertEquals("DRAFT", response.getStatus());
        assertEquals(Map.of(), response.getQuestionEvaluations());
        verify(userRepository).findByIdForUpdate(USER_ID);
        verify(assessmentRepository).saveAndFlush(argThat(assessment ->
                assessment.getUser() == user
                        && assessment.getMaturityModelId().equals(MODEL_ID)
        ));
    }

    @Test
    void ensuringDraftReturnsExistingProgressWithoutClearingIt() {
        MaturityModel activeModel = model(true);
        Assessment existing = draftAssessment();
        QuestionEvaluation existingAnswer = questionRow(existing, "D1_M1_101_1001", 1, null);
        when(questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of(existingAnswer));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(activeModel));
        when(assessmentRepository.findByUserIdAndMaturityModelIdAndStatus(
                USER_ID,
                MODEL_ID,
                AssessmentStatus.DRAFT
        )).thenReturn(Optional.of(existing));

        AssessmentResponse response = assessmentService.ensureDraftForModel(MODEL_ID, user);

        assertEquals(1, response.getQuestionEvaluations()
                .get("D1_M1_101_1001").getResponse());
        verify(assessmentRepository, never()).saveAndFlush(any(Assessment.class));
    }

    @Test
    void ensuringDraftRejectsInactiveModelBeforeLockingUser() {
        MaturityModel inactiveModel = model(true);
        inactiveModel.setIsActive(false);
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(inactiveModel));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.ensureDraftForModel(MODEL_ID, user)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(userRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void exactDraftSaveRejectsSubmittedAssessment() {
        Assessment submitted = draftAssessment();
        submitted.setStatus(AssessmentStatus.COMPLETED);
        submitted.setIsCompleted(true);
        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(submitted));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.saveDraft(ASSESSMENT_ID, request(Map.of()), user)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void exactDraftSaveUpdatesTheRequestedRow() {
        MaturityModel activeModel = manualModelWithEvidenceBooleanQuestion();
        activeModel.setAutoEvaluated(true);
        Assessment draft = draftAssessment();
        Map<String, Object> responses = Map.of("D1_M1_101_1001", 1);
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(activeModel));
        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(draft));

        AssessmentResponse response = assessmentService.saveDraft(
                ASSESSMENT_ID,
                request(responses),
                user
        );

        assertEquals(ASSESSMENT_ID, response.getId());
        verify(questionEvaluationRepository).saveAll(argThat(items -> {
            QuestionEvaluation saved = items.iterator().next();
            return saved.getQuestionId().equals(1001L)
                    && saved.getResponse().asInt() == 1
                    && saved.getInitialScore() == null;
        }));
        verify(assessmentRepository).save(draft);
        verify(assessmentRepository, never())
                .findByUserIdAndMaturityModelIdAndStatus(any(), any(), any());
    }

    @Test
    void submissionStoresInitialScoreForScoreableAnswer() {
        MaturityModel model = manualModelWithEvidenceBooleanQuestion();
        model.setAutoEvaluated(true);
        Assessment draft = draftAssessment();
        String responseKey = "D1_M1_101_1001";

        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(draft));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        assessmentService.submitDraft(
                ASSESSMENT_ID,
                request(Map.of(responseKey, 1)),
                user
        );

        verify(questionEvaluationRepository).saveAll(argThat(items -> {
            QuestionEvaluation saved = items.iterator().next();
            return saved.getQuestionId().equals(1001L)
                    && saved.getResponse().asInt() == 1
                    && saved.getInitialScore().equals(1.0);
        }));
    }

    @Test
    void submissionLeavesOpenAnswerInitialScoreEmpty() {
        MaturityModel model = manualModelWithOpenQuestion();
        Assessment draft = draftAssessment();
        String responseKey = "D1_M1_101_1001";

        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(draft));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(dimensionResultRepository.findByAssessmentId(ASSESSMENT_ID)).thenReturn(List.of());

        assessmentService.submitDraft(
                ASSESSMENT_ID,
                request(Map.of(responseKey, "3")),
                user
        );

        verify(questionEvaluationRepository).saveAll(argThat(items -> {
            QuestionEvaluation saved = items.iterator().next();
            return "3".equals(saved.getResponse().asText())
                    && saved.getInitialScore() == null;
        }));
    }

    @Test
    void draftSnapshotDeletesOmittedQuestionRows() {
        MaturityModel model = manualModelWithEvidenceBooleanQuestion();
        Assessment draft = draftAssessment();
        QuestionEvaluation existing =
                questionRow(draft, "D1_M1_101_1001", 1, null);

        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(draft));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of(existing));

        assessmentService.saveDraft(ASSESSMENT_ID, request(Map.of()), user);

        verify(questionEvaluationRepository).deleteAll(List.of(existing));
        verify(questionEvaluationRepository, never()).saveAll(any());
    }

    @Test
    void draftSaveRejectsQuestionIdThatDoesNotMatchResponseKey() {
        MaturityModel model = manualModelWithEvidenceBooleanQuestion();
        Assessment draft = draftAssessment();
        QuestionResponseRequest submitted = new QuestionResponseRequest();
        submitted.setQuestionId(9999L);
        submitted.setResponse(1);
        AssessmentRequest request = new AssessmentRequest();
        request.setMaturityModelId(MODEL_ID);
        request.setQuestionResponses(Map.of("D1_M1_101_1001", submitted));

        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(draft));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.saveDraft(ASSESSMENT_ID, request, user)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void exactDraftSaveRejectsMismatchedModel() {
        long otherModelId = 99L;
        AssessmentRequest mismatchedRequest = request(Map.of());
        mismatchedRequest.setMaturityModelId(otherModelId);
        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(draftAssessment()));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.saveDraft(ASSESSMENT_ID, mismatchedRequest, user)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void exactDraftSaveRejectsAnotherUsersDraft() {
        User otherOwner = new User();
        otherOwner.setId(88L);
        Assessment anotherUsersDraft = draftAssessment();
        anotherUsersDraft.setUser(otherOwner);
        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(anotherUsersDraft));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> assessmentService.saveDraft(ASSESSMENT_ID, request(Map.of()), user)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verify(assessmentRepository, never()).save(any(Assessment.class));
    }

    @Test
    void resetClearsProgressAndKeepsTheDraftIdentity() {
        Assessment draft = draftAssessment();
        draft.setEvaluatorInsight("stale");
        when(assessmentRepository.findByIdForUpdate(ASSESSMENT_ID))
                .thenReturn(Optional.of(draft));

        AssessmentResponse response = assessmentService.resetDraft(ASSESSMENT_ID, user);

        assertEquals(ASSESSMENT_ID, response.getId());
        assertEquals(Map.of(), response.getQuestionEvaluations());
        assertEquals("DRAFT", response.getStatus());
        assertNull(response.getEvaluatorInsight());
        verify(dimensionResultRepository).deleteByAssessmentId(ASSESSMENT_ID);
        verify(questionEvaluationRepository).deleteByAssessmentId(ASSESSMENT_ID);
        verify(assessmentRepository).save(draft);
    }

    @Test
    void ownerCanDeleteSavedDraft() {
        Assessment draft = draftAssessment();
        when(assessmentRepository.findById(ASSESSMENT_ID))
                .thenReturn(Optional.of(draft));

        assessmentService.deleteAssessment(ASSESSMENT_ID, user);

        verify(assessmentRepository).delete(draft);
    }

    private AssessmentRequest request(Map<String, Object> responses) {
        AssessmentRequest request = new AssessmentRequest();
        request.setMaturityModelId(MODEL_ID);
        Map<String, QuestionResponseRequest> questionResponses =
                new java.util.LinkedHashMap<>();
        responses.forEach((key, value) -> {
            QuestionResponseRequest questionResponse = new QuestionResponseRequest();
            questionResponse.setQuestionId(Long.parseLong(key.substring(key.lastIndexOf('_') + 1)));
            questionResponse.setResponse(value);
            questionResponses.put(key, questionResponse);
        });
        request.setQuestionResponses(questionResponses);
        return request;
    }

    private Assessment draftAssessment() {
        Assessment assessment = new Assessment();
        assessment.setId(ASSESSMENT_ID);
        assessment.setUser(user);
        assessment.setMaturityModelId(MODEL_ID);
        assessment.setStatus(AssessmentStatus.DRAFT);
        assessment.setIsCompleted(false);
        assessment.setOverallAverage(0.0);
        assessment.setOverallPercentageScore(0.0);
        assessment.setOverallMaturityLevel("Draft");
        return assessment;
    }

    private Assessment pendingAssessment(String responses) {
        Assessment assessment = draftAssessment();
        assessment.setStatus(AssessmentStatus.PENDING_REVIEW);
        assessment.setOverallMaturityLevel("Initial");
        try {
            Map<String, Object> parsed = new ObjectMapper().readValue(responses, Map.class);
            List<QuestionEvaluation> rows = parsed.entrySet().stream()
                    .map(entry -> questionRow(
                            assessment,
                            entry.getKey(),
                            entry.getValue(),
                            entry.getValue() instanceof Number number
                                    ? number.intValue()
                                    : null
                    ))
                    .toList();
            lenient().when(questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                    .thenReturn(rows);
        } catch (Exception exception) {
            throw new IllegalArgumentException(exception);
        }
        return assessment;
    }

    private QuestionEvaluation questionRow(
            Assessment assessment,
            String responseKey,
            Object response,
            Integer initialScore
    ) {
        QuestionEvaluation row = new QuestionEvaluation();
        row.setAssessment(assessment);
        row.setResponseKey(responseKey);
        row.setQuestionId(Long.parseLong(responseKey.substring(responseKey.lastIndexOf('_') + 1)));
        row.setResponse(new ObjectMapper().valueToTree(response));
        row.setInitialScore(initialScore == null ? null : initialScore.doubleValue());
        return row;
    }

    private MaturityModel model(boolean autoEvaluated) {
        MaturityModel model = new MaturityModel();
        model.setId(MODEL_ID);
        model.setIsActive(true);
        model.setAutoEvaluated(autoEvaluated);
        model.setDimensions(List.of());
        model.setLevels(List.of());
        return model;
    }

    private MaturityModel manualModelWithOpenQuestion() {
        Question question = new Question();
        question.setId(1001L);
        question.setText("Describe the current process.");
        question.setType("open_answer");
        question.setWeight(1.0);
        question.setRequiresEvidence(false);

        Practice practice = new Practice();
        practice.setId(101L);
        practice.setName("Process management");
        practice.setWeight(1.0);
        practice.setQuestions(List.of(question));

        Module module = new Module();
        module.setCode("M1");
        module.setName("Management");
        module.setPractices(List.of(practice));

        Dimension dimension = new Dimension();
        dimension.setDimensionId("D1");
        dimension.setName("Governance");
        dimension.setDescription("Governance maturity");
        dimension.setModules(List.of(module));

        MaturityModel model = model(false);
        model.setDimensions(List.of(dimension));
        return model;
    }

    private MaturityModel hierarchicalAggregationModel() {
        Practice firstPractice = practice(101L, "P1", question(1001L), question(1002L));
        Practice secondPractice = practice(102L, "P2", question(1003L));
        Practice thirdPractice = practice(103L, "P3", question(1004L));
        Practice fourthPractice = practice(104L, "P4", question(1005L));

        Module firstModule = module("M1", firstPractice, secondPractice);
        Module secondModule = module("M2", thirdPractice);
        Module thirdModule = module("M3", fourthPractice);
        Dimension firstDimension = dimension("D1", firstModule, secondModule);
        Dimension secondDimension = dimension("D2", thirdModule);

        MaturityModel model = model(true);
        firstPractice.setAggregationRule(AggregationRule.MINIMUM);
        secondPractice.setAggregationRule(AggregationRule.MINIMUM);
        thirdPractice.setAggregationRule(AggregationRule.MINIMUM);
        fourthPractice.setAggregationRule(AggregationRule.MINIMUM);
        firstModule.setAggregationRule(AggregationRule.MAXIMUM);
        secondModule.setAggregationRule(AggregationRule.MAXIMUM);
        thirdModule.setAggregationRule(AggregationRule.MAXIMUM);
        firstDimension.setAggregationRule(AggregationRule.MINIMUM);
        secondDimension.setAggregationRule(AggregationRule.MINIMUM);
        model.setAggregationRule(AggregationRule.MAXIMUM);
        model.setDimensions(List.of(firstDimension, secondDimension));
        firstDimension.setMaturityModel(model);
        secondDimension.setMaturityModel(model);
        model.setLevels(List.of(
                level(model, 1),
                level(model, 2),
                level(model, 3),
                level(model, 4),
                level(model, 5)
        ));
        return model;
    }

    private MaturityModel booleanScoringModel() {
        Question yesIsCorrect = question(1001L);
        yesIsCorrect.setType("boolean");
        yesIsCorrect.setBooleanCorrectAnswer(true);
        Question noIsCorrect = question(1002L);
        noIsCorrect.setType("boolean");
        noIsCorrect.setBooleanCorrectAnswer(false);

        Practice practice = practice(101L, "P1", yesIsCorrect, noIsCorrect);
        Module module = module("M1", practice);
        Dimension dimension = dimension("D1", module);

        MaturityModel model = model(true);
        model.setDimensions(List.of(dimension));
        dimension.setMaturityModel(model);
        model.setLevels(List.of(
                level(model, 1),
                level(model, 2),
                level(model, 3),
                level(model, 4),
                level(model, 5)
        ));
        return model;
    }

    private Question question(Long id) {
        Question question = new Question();
        question.setId(id);
        question.setCode("Q" + id);
        question.setText("Question " + id);
        question.setType("likert");
        question.setWeight(1.0);
        question.setRequired(false);
        question.setRequiresEvidence(false);
        return question;
    }

    private GatingRule gatingRule(
            GatingSelection selection,
            String childCode,
            GatingComparisonOperator operator,
            double threshold,
            GatingScoreOperation operation,
            double value) {
        GatingRule rule = new GatingRule();
        rule.setOrder(0);
        rule.setSelection(selection);
        rule.setChildCode(childCode);
        rule.setOperator(operator);
        rule.setThreshold(BigDecimal.valueOf(threshold));
        rule.setOperation(operation);
        rule.setValue(BigDecimal.valueOf(value));
        return rule;
    }

    private Practice practice(Long id, String code, Question... questions) {
        Practice practice = new Practice();
        practice.setId(id);
        practice.setCode(code);
        practice.setName(code);
        practice.setWeight(1.0);
        practice.setQuestions(List.of(questions));
        for (Question question : questions) {
            question.setPractice(practice);
        }
        return practice;
    }

    private Module module(String code, Practice... practices) {
        Module module = new Module();
        module.setCode(code);
        module.setName(code);
        module.setWeight(1.0);
        module.setPractices(List.of(practices));
        for (Practice practice : practices) {
            practice.setModule(module);
        }
        return module;
    }

    private Dimension dimension(String code, Module... modules) {
        Dimension dimension = new Dimension();
        dimension.setDimensionId(code);
        dimension.setName(code);
        dimension.setDescription(code + " description");
        dimension.setWeight(1.0);
        dimension.setModules(List.of(modules));
        for (Module module : modules) {
            module.setDimension(dimension);
        }
        return dimension;
    }

    private MaturityModel autoModelWithRequiredBooleanDependency() {
        Question parent = new Question();
        parent.setId(1001L);
        parent.setCode("Q1");
        parent.setText("Is the process enabled?");
        parent.setType("boolean");
        parent.setWeight(1.0);
        parent.setRequired(true);

        Question child = new Question();
        child.setId(1002L);
        child.setCode("Q2");
        child.setText("Is the enabled process documented?");
        child.setType("boolean");
        child.setWeight(1.0);
        child.setRequired(true);
        child.setDependsOnQuestion(parent);

        Practice practice = new Practice();
        practice.setId(101L);
        practice.setName("Process management");
        practice.setWeight(1.0);
        practice.setQuestions(List.of(parent, child));
        parent.setPractice(practice);
        child.setPractice(practice);

        Module module = new Module();
        module.setCode("M1");
        module.setName("Management");
        module.setPractices(List.of(practice));
        practice.setModule(module);

        Dimension dimension = new Dimension();
        dimension.setDimensionId("D1");
        dimension.setName("Governance");
        dimension.setDescription("Governance maturity");
        dimension.setModules(List.of(module));
        module.setDimension(dimension);

        MaturityModel model = model(true);
        model.setDimensions(List.of(dimension));
        dimension.setMaturityModel(model);
        return model;
    }

    private MaturityModel autoModelWithNestedRequiredBooleanDependency() {
        MaturityModel model = autoModelWithRequiredBooleanDependency();
        Practice practice = model.getDimensions().getFirst()
                .getModules().getFirst()
                .getPractices().getFirst();
        Question intermediate = practice.getQuestions().get(1);

        Question nestedChild = new Question();
        nestedChild.setId(1003L);
        nestedChild.setCode("Q3");
        nestedChild.setText("Is the documented process reviewed?");
        nestedChild.setType("boolean");
        nestedChild.setWeight(1.0);
        nestedChild.setRequired(true);
        nestedChild.setDependsOnQuestion(intermediate);
        nestedChild.setPractice(practice);

        practice.setQuestions(List.of(
                practice.getQuestions().getFirst(),
                intermediate,
                nestedChild
        ));
        return model;
    }

    private MaturityModel manualModelWithEvidenceBooleanQuestion() {
        Question question = new Question();
        question.setId(1001L);
        question.setText("Is evidence retained?");
        question.setType("boolean");
        question.setWeight(1.0);
        question.setRequiresEvidence(true);

        Practice practice = new Practice();
        practice.setId(101L);
        practice.setName("Evidence management");
        practice.setWeight(1.0);
        practice.setQuestions(List.of(question));

        Module module = new Module();
        module.setCode("M1");
        module.setName("Management");
        module.setPractices(List.of(practice));

        Dimension dimension = new Dimension();
        dimension.setDimensionId("D1");
        dimension.setName("Governance");
        dimension.setDescription("Governance maturity");
        dimension.setModules(List.of(module));

        MaturityModel model = model(false);
        model.setDimensions(List.of(dimension));
        return model;
    }

    private MaturityModel autoModelWithNumericQuestion() throws Exception {
        Question question = new Question();
        question.setId(1001L);
        question.setText("How much?");
        question.setType("numeric");
        question.setWeight(1.0);
        question.setRequiresEvidence(false);
        question.setRangeMin(0);
        question.setRangeMax(100);
        question.setRangeHighValueIsMaximum(true);

        Practice practice = new Practice();
        practice.setId(101L);
        practice.setName("Measurement");
        practice.setWeight(1.0);
        practice.setQuestions(List.of(question));

        Module module = new Module();
        module.setCode("M1");
        module.setName("Management");
        module.setPractices(List.of(practice));

        Dimension dimension = new Dimension();
        dimension.setDimensionId("D1");
        dimension.setName("Governance");
        dimension.setDescription("Governance maturity");
        dimension.setModules(List.of(module));

        MaturityModel model = model(true);
        model.setDimensions(List.of(dimension));
        model.setLevels(List.of(level(model, 1), level(model, 2), level(model, 3)));
        return model;
    }

    private MaturityLevel level(MaturityModel model, int number) {
        MaturityLevel level = new MaturityLevel();
        level.setNumber(number);
        level.setLevelNumber(number);
        level.setName("Level " + number);
        level.setMaturityModel(model);
        return level;
    }
}
