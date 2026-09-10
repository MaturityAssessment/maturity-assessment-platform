package com.master_thesis.maturity_assessment.assessments.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.assessments.dto.agent.AgentEvaluationDraftResponse;
import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import com.master_thesis.maturity_assessment.assessments.models.QuestionEvaluation;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.assessments.repository.EvidenceRepository;
import com.master_thesis.maturity_assessment.assessments.repository.QuestionEvaluationRepository;
import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityLevel;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import com.master_thesis.maturity_assessment.maturity_models.services.MaturityScoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocalAgentEvaluationServiceTest {

    private static final long ASSESSMENT_ID = 23L;
    private static final long MODEL_ID = 11L;
    private static final String RESPONSE_KEY = "D1_M1_101_1001";

    @Mock
    private AssessmentRepository assessmentRepository;

    @Mock
    private MaturityModelRepository maturityModelRepository;

    @Mock
    private EvidenceRepository evidenceRepository;

    @Mock
    private QuestionEvaluationRepository questionEvaluationRepository;

    @Mock
    private EvidenceTextExtractionService evidenceTextExtractionService;

    @Mock
    private LocalAgentClient localAgentClient;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private LocalAgentEvaluationService service;

    @BeforeEach
    void setUp() {
        LocalAgentProperties properties = new LocalAgentProperties();
        properties.setEnabled(true);
        properties.setModel("qwen3-14b-q4");

        service = new LocalAgentEvaluationService(
                assessmentRepository,
                maturityModelRepository,
                evidenceRepository,
                questionEvaluationRepository,
                evidenceTextExtractionService,
                localAgentClient,
                properties,
                new MaturityScoringService(),
                objectMapper
        );
        ReflectionTestUtils.setField(
                service,
                "systemPromptResource",
                new ByteArrayResource("Return JSON only.".getBytes())
        );
    }

    @Test
    void missingConfigurationStopsBeforeLoadingAssessment() {
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "disabled"))
                .when(localAgentClient)
                .validateConfiguration();

        assertThrows(
                ResponseStatusException.class,
                () -> service.generateDraft(ASSESSMENT_ID)
        );
        verifyNoInteractions(assessmentRepository);
    }

    @Test
    void completedAssessmentIsRejected() {
        Assessment assessment = pendingAssessment();
        assessment.setStatus(AssessmentStatus.COMPLETED);
        assessment.setIsCompleted(true);
        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.generateDraft(ASSESSMENT_ID)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void autoEvaluatedModelIsRejected() {
        Assessment assessment = pendingAssessment();
        MaturityModel model = model(true);
        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.generateDraft(ASSESSMENT_ID)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void validAgentOutputReturnsDraftWithoutCompletingAssessment() throws Exception {
        Assessment assessment = pendingAssessment();
        MaturityModel model = model(false);
        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID)).thenReturn(List.of());
        when(localAgentClient.chatJson(anyString(), anyString(), anyString(), anyMap()))
                .thenReturn(
                        objectMapper.readTree("""
                                {
                                  "evaluations": [
                                    {
                                      "responseKey": "D1_M1_101_1001",
                                      "validationStatus": "ACCEPTED",
                                      "manualScore": 4,
                                      "reviewerNote": null,
                                      "confidence": 0.78,
                                      "rationale": "Answer describes a managed process."
                                    }
                                  ]
                                }
                                """),
                        objectMapper.readTree("""
                                {
                                  "summary": "The assessment is broadly consistent.",
                                  "finalRemarks": "Continue improving repeatability.",
                                  "confidence": 0.7,
                                  "warnings": [],
                                  "nextSteps": ["Review the accepted open answer."]
                                }
                                """)
                );

        AgentEvaluationDraftResponse response = service.generateDraft(ASSESSMENT_ID);

        assertEquals(ASSESSMENT_ID, response.getAssessmentId());
        assertEquals("The assessment is broadly consistent.", response.getSummary());
        assertEquals("Continue improving repeatability.", response.getFinalRemarks());
        assertEquals("ACCEPTED", response.getQuestionEvaluations().get(RESPONSE_KEY).getValidationStatus());
        assertEquals(4.0, response.getQuestionEvaluations().get(RESPONSE_KEY).getManualScore());
        assertEquals(AssessmentStatus.PENDING_REVIEW, assessment.getStatus());

        ArgumentCaptor<String> userPrompts = ArgumentCaptor.forClass(String.class);
        verify(localAgentClient, times(2)).chatJson(
                anyString(),
                anyString(),
                userPrompts.capture(),
                anyMap()
        );
        assertTrue(userPrompts.getAllValues().stream()
                .noneMatch(prompt -> prompt.contains("\"answerState\"")
                        || prompt.contains("\"missingEvidenceExplanation\"")));
    }

    @Test
    void booleanAgentDraftUsesNormalizedResultAndReceivesCorrectAnswer() throws Exception {
        Assessment assessment = pendingAssessment();
        MaturityModel model = model(false);
        Question question = model.getDimensions().getFirst().getModules().getFirst()
                .getPractices().getFirst().getQuestions().getFirst();
        question.setType("boolean");
        question.setBooleanCorrectAnswer(false);

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        when(maturityModelRepository.findById(MODEL_ID)).thenReturn(Optional.of(model));
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID)).thenReturn(List.of());
        when(localAgentClient.chatJson(anyString(), anyString(), anyString(), anyMap()))
                .thenReturn(
                        objectMapper.readTree("""
                                {
                                  "evaluations": [
                                    {
                                      "responseKey": "D1_M1_101_1001",
                                      "validationStatus": "ADJUSTED",
                                      "manualScore": 0,
                                      "reviewerNote": "The submitted answer is not supported.",
                                      "confidence": 0.8,
                                      "rationale": "Evidence is insufficient."
                                    }
                                  ]
                                }
                                """),
                        objectMapper.readTree("""
                                {
                                  "summary": "Review completed.",
                                  "finalRemarks": "Confirm the answer.",
                                  "confidence": 0.8,
                                  "warnings": [],
                                  "nextSteps": []
                                }
                                """)
                );

        AgentEvaluationDraftResponse response = service.generateDraft(ASSESSMENT_ID);

        assertEquals(0.0, response.getQuestionEvaluations().get(RESPONSE_KEY).getManualScore());
        ArgumentCaptor<String> userPrompts = ArgumentCaptor.forClass(String.class);
        verify(localAgentClient, times(2)).chatJson(
                anyString(),
                anyString(),
                userPrompts.capture(),
                anyMap()
        );
        assertTrue(userPrompts.getAllValues().getFirst().contains("\"correctAnswer\":false"));
    }

    private Assessment pendingAssessment() {
        Assessment assessment = new Assessment();
        assessment.setId(ASSESSMENT_ID);
        assessment.setMaturityModelId(MODEL_ID);
        assessment.setStatus(AssessmentStatus.PENDING_REVIEW);
        assessment.setIsCompleted(false);
        assessment.setOverallAverage(0.0);
        assessment.setOverallMaturityLevel("Pending");
        QuestionEvaluation answer = new QuestionEvaluation();
        answer.setAssessment(assessment);
        answer.setResponseKey(RESPONSE_KEY);
        answer.setQuestionId(1001L);
        answer.setResponse(objectMapper.valueToTree("A detailed answer"));
        lenient().when(questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of(answer));
        return assessment;
    }

    private MaturityModel model(boolean autoEvaluated) {
        MaturityModel model = new MaturityModel();
        model.setId(MODEL_ID);
        model.setName("Operational Maturity");
        model.setAutoEvaluated(autoEvaluated);
        model.setLevels(List.of(level(1), level(2), level(3), level(4), level(5)));

        Dimension dimension = new Dimension();
        dimension.setDimensionId("D1");
        dimension.setName("Governance");
        dimension.setMaturityModel(model);

        Module module = new Module();
        module.setCode("M1");
        module.setName("Policies");
        module.setDimension(dimension);

        Practice practice = new Practice();
        practice.setId(101L);
        practice.setName("Policy management");
        practice.setModule(module);

        Question question = new Question();
        question.setId(1001L);
        question.setCode("Q1");
        question.setType("open_answer");
        question.setText("Describe the policy management process.");
        question.setPractice(practice);

        practice.setQuestions(List.of(question));
        module.setPractices(List.of(practice));
        dimension.setModules(List.of(module));
        model.setDimensions(List.of(dimension));
        return model;
    }

    private MaturityLevel level(int number) {
        MaturityLevel level = new MaturityLevel();
        level.setNumber(number);
        level.setLevelNumber(number);
        level.setName("Level " + number);
        return level;
    }
}
