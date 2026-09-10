package com.master_thesis.maturity_assessment.assessments.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.assessments.dto.agent.AgentDocumentSummary;
import com.master_thesis.maturity_assessment.assessments.dto.agent.AgentEvaluationDraftResponse;
import com.master_thesis.maturity_assessment.assessments.dto.agent.AgentEvaluationWarning;
import com.master_thesis.maturity_assessment.assessments.dto.agent.AgentQuestionEvaluationDraft;
import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import com.master_thesis.maturity_assessment.assessments.models.Evidence;
import com.master_thesis.maturity_assessment.assessments.models.QuestionEvaluation;
import com.master_thesis.maturity_assessment.assessments.models.QuestionEvaluationStatus;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.assessments.repository.EvidenceRepository;
import com.master_thesis.maturity_assessment.assessments.repository.QuestionEvaluationRepository;
import com.master_thesis.maturity_assessment.config.ResourceNotFoundException;
import com.master_thesis.maturity_assessment.config.TextLimits;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionChoiceDTO;
import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityLevel;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import com.master_thesis.maturity_assessment.maturity_models.services.MaturityScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocalAgentEvaluationService {

    private static final String GENERIC_MISSING_NOTE =
            "Local agent did not provide a note; curator review required.";

    private final AssessmentRepository assessmentRepository;
    private final MaturityModelRepository maturityModelRepository;
    private final EvidenceRepository evidenceRepository;
    private final QuestionEvaluationRepository questionEvaluationRepository;
    private final EvidenceTextExtractionService evidenceTextExtractionService;
    private final LocalAgentClient localAgentClient;
    private final LocalAgentProperties properties;
    private final MaturityScoringService maturityScoringService;
    private final ObjectMapper objectMapper;

    @Value("classpath:prompts/local-agent-evaluation-system.md")
    private Resource systemPromptResource;

    @Transactional(readOnly = true)
    public AgentEvaluationDraftResponse generateDraft(Long assessmentId) {
        localAgentClient.validateConfiguration();

        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        requirePendingReview(assessment);

        Long maturityModelId = assessment.getMaturityModelId();
        if (maturityModelId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assessment is missing maturity model reference.");
        }

        MaturityModel model = maturityModelRepository.findById(maturityModelId)
                .orElseThrow(() -> new ResourceNotFoundException("Maturity model not found"));
        if (Boolean.TRUE.equals(model.getAutoEvaluated())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Local agent draft evaluation is only available for non-auto-evaluated maturity models."
            );
        }

        Map<String, Object> responses = readQuestionResponses(assessment.getId());
        List<Evidence> evidenceItems = evidenceRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        int maxLevel = Math.max(2, maturityScoringService.resolveMaxLevelNumber(model.getLevels()));

        List<ReviewQuestion> reviewQuestions = buildReviewQuestions(
                model,
                responses,
                evidenceItems,
                maxLevel
        );

        List<String> processingNotes = new ArrayList<>();
        List<EvidenceContext> evidenceContexts = summarizeEvidence(evidenceItems, processingNotes);

        Map<String, AgentQuestionEvaluationDraft> questionEvaluations =
                evaluateQuestionBatches(assessment, model, reviewQuestions, evidenceContexts, maxLevel, processingNotes);

        FinalSynthesis finalSynthesis = synthesizeFinalReport(
                assessment,
                model,
                reviewQuestions,
                questionEvaluations,
                evidenceContexts,
                processingNotes,
                maxLevel
        );

        AgentEvaluationDraftResponse response = new AgentEvaluationDraftResponse();
        response.setAssessmentId(assessment.getId());
        response.setGeneratedAt(LocalDateTime.now());
        response.setModel(properties.getModel());
        response.setConfidence(finalSynthesis.confidence());
        response.setSummary(finalSynthesis.summary());
        response.setFinalRemarks(finalSynthesis.finalRemarks());
        response.setQuestionEvaluations(questionEvaluations);
        response.setWarnings(finalSynthesis.warnings());
        response.setNextSteps(finalSynthesis.nextSteps());
        response.setDocumentSummaries(
                evidenceContexts.stream().map(EvidenceContext::summary).toList()
        );
        response.setProcessingNotes(processingNotes);
        return response;
    }

    private void requirePendingReview(Assessment assessment) {
        AssessmentStatus status = assessment.getStatus();
        if (status == null) {
            status = Boolean.TRUE.equals(assessment.getIsCompleted())
                    ? AssessmentStatus.COMPLETED
                    : AssessmentStatus.PENDING_REVIEW;
        }
        if (status != AssessmentStatus.PENDING_REVIEW || Boolean.TRUE.equals(assessment.getIsCompleted())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only submitted assessments pending review can use local agent draft evaluation."
            );
        }
    }

    private List<EvidenceContext> summarizeEvidence(
            List<Evidence> evidenceItems,
            List<String> processingNotes
    ) {
        List<EvidenceContext> contexts = new ArrayList<>();
        for (Evidence evidence : evidenceItems) {
            EvidenceTextExtractionService.ExtractedEvidence extracted =
                    evidenceTextExtractionService.extract(evidence);
            AgentDocumentSummary summary = extracted.summary();
            if (StringUtils.hasText(summary.getWarning())) {
                processingNotes.add("Evidence " + summary.getEvidenceId() + ": " + summary.getWarning());
            }

            if (StringUtils.hasText(extracted.extractedText())) {
                JsonNode node = localAgentClient.chatJson(
                        "evidence_summary",
                        readSystemPrompt(),
                        limitPrompt("""
                                Summarize this evidence file for later assessment review.
                                Return concise evidence signals only. Do not evaluate the full assessment yet.

                                Evidence metadata and extracted text:
                                """ + toJson(evidenceSummaryPayload(summary, extracted.extractedText()))),
                        evidenceSummarySchema()
                );
                summary.setSummary(limitText(textValue(node, "summary"), TextLimits.DESCRIPTION));
                List<String> limitations = stringList(node.path("limitations"));
                if (!limitations.isEmpty()) {
                    String limitationText = String.join("; ", limitations);
                    summary.setWarning(mergeWarnings(summary.getWarning(), limitText(limitationText, TextLimits.SHORT_GUIDANCE)));
                }
            }
            contexts.add(new EvidenceContext(summary.getQuestionId(), summary, extracted.extractedText()));
        }
        return contexts;
    }

    private Map<String, AgentQuestionEvaluationDraft> evaluateQuestionBatches(
            Assessment assessment,
            MaturityModel model,
            List<ReviewQuestion> reviewQuestions,
            List<EvidenceContext> evidenceContexts,
            int maxLevel,
            List<String> processingNotes
    ) {
        Map<String, ReviewQuestion> questionByKey = reviewQuestions.stream()
                .collect(Collectors.toMap(
                        ReviewQuestion::responseKey,
                        question -> question,
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
        Map<String, AgentQuestionEvaluationDraft> drafts = new LinkedHashMap<>();
        if (reviewQuestions.isEmpty()) {
            return drafts;
        }

        int batchSize = Math.max(1, properties.getMaxQuestionsPerBatch());
        for (int start = 0; start < reviewQuestions.size(); start += batchSize) {
            List<ReviewQuestion> batch = reviewQuestions.subList(
                    start,
                    Math.min(reviewQuestions.size(), start + batchSize)
            );
            JsonNode node = localAgentClient.chatJson(
                    "question_evaluations",
                    readSystemPrompt(),
                    limitPrompt("""
                            Evaluate this small batch of reviewable questions.
                            Return one draft evaluation for each question in the batch.

                            Context:
                            """ + toJson(questionBatchPayload(assessment, model, batch, evidenceContexts, maxLevel))),
                    questionEvaluationSchema()
            );
            JsonNode evaluations = node.path("evaluations");
            if (!evaluations.isArray()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Local agent question evaluation response did not include an evaluations array."
                );
            }
            for (JsonNode evaluationNode : evaluations) {
                String responseKey = textValue(evaluationNode, "responseKey");
                ReviewQuestion question = questionByKey.get(responseKey);
                if (question == null) {
                    processingNotes.add("Local agent returned an evaluation for an unknown question key: " + responseKey);
                    continue;
                }
                drafts.put(responseKey, normalizeQuestionDraft(question, evaluationNode, maxLevel, processingNotes));
            }
        }

        for (ReviewQuestion question : reviewQuestions) {
            if (!drafts.containsKey(question.responseKey())) {
                AgentQuestionEvaluationDraft draft = new AgentQuestionEvaluationDraft();
                draft.setQuestionId(question.questionId());
                draft.setValidationStatus(QuestionEvaluationStatus.FLAGGED.name());
                draft.setReviewerNote("Local agent did not return a draft for this question; curator review required.");
                draft.setConfidence(0.0);
                draft.setRationale("Question was omitted from local agent output.");
                drafts.put(question.responseKey(), draft);
                processingNotes.add("Local agent omitted question " + question.responseKey() + ".");
            }
        }

        return drafts;
    }

    private FinalSynthesis synthesizeFinalReport(
            Assessment assessment,
            MaturityModel model,
            List<ReviewQuestion> reviewQuestions,
            Map<String, AgentQuestionEvaluationDraft> drafts,
            List<EvidenceContext> evidenceContexts,
            List<String> processingNotes,
            int maxLevel
    ) {
        if (reviewQuestions.isEmpty()) {
            return new FinalSynthesis(
                    "No reviewable answers were found for local-agent evaluation.",
                    "No local-agent recommendations were generated because there were no reviewable answers.",
                    0.0,
                    List.of(),
                    List.of("Confirm whether the assessment contains submitted answers or evidence.")
            );
        }

        JsonNode node = localAgentClient.chatJson(
                "evaluation_synthesis",
                readSystemPrompt(),
                limitPrompt("""
                        Synthesize the completed local-agent draft into curator-facing remarks.
                        Use the question drafts and document summaries. Do not invent new evidence.

                        Context:
                        """ + toJson(finalSynthesisPayload(assessment, model, reviewQuestions, drafts, evidenceContexts, processingNotes, maxLevel))),
                finalSynthesisSchema()
        );

        return new FinalSynthesis(
                limitText(textValue(node, "summary"), TextLimits.DESCRIPTION),
                limitText(textValue(node, "finalRemarks"), TextLimits.DESCRIPTION),
                nullableDouble(node.path("confidence")),
                warningsFromNode(node.path("warnings")),
                stringList(node.path("nextSteps")).stream()
                        .map(step -> limitText(step, TextLimits.SHORT_GUIDANCE))
                        .filter(StringUtils::hasText)
                        .toList()
        );
    }

    private AgentQuestionEvaluationDraft normalizeQuestionDraft(
            ReviewQuestion question,
            JsonNode node,
            int maxLevel,
            List<String> processingNotes
    ) {
        AgentQuestionEvaluationDraft draft = new AgentQuestionEvaluationDraft();
        draft.setQuestionId(question.questionId());

        String rawStatus = textValue(node, "validationStatus").toUpperCase();
        QuestionEvaluationStatus status;
        try {
            status = QuestionEvaluationStatus.valueOf(rawStatus);
        } catch (Exception ex) {
            status = QuestionEvaluationStatus.FLAGGED;
            processingNotes.add("Local agent returned invalid status for " + question.responseKey() + "; converted to FLAGGED.");
        }
        draft.setValidationStatus(status.name());

        Double manualScore = nullableDouble(node.path("manualScore"));
        boolean booleanQuestion = "boolean".equalsIgnoreCase(question.type());
        boolean scaleQuestion = "likert".equalsIgnoreCase(question.type());
        boolean multipleChoiceQuestion = "multiple_choice".equalsIgnoreCase(question.type());
        boolean rangeQuestion = "numeric".equalsIgnoreCase(question.type())
                || "percentage".equalsIgnoreCase(question.type());
        Double scoreCandidate = manualScore;
        boolean configuredMultipleChoiceScore = !multipleChoiceQuestion || manualScore == null
                || question.choices().stream()
                .map(choice -> choice.get("score"))
                .filter(Number.class::isInstance)
                .map(Number.class::cast)
                .anyMatch(score -> Math.abs(score.doubleValue() - scoreCandidate) <= 1e-9);
        boolean scoreOutOfRange = manualScore != null
                && (booleanQuestion
                ? (Double.compare(manualScore, 0.0) != 0 && Double.compare(manualScore, 1.0) != 0)
                : scaleQuestion || multipleChoiceQuestion || rangeQuestion
                        ? manualScore < 0.0 || manualScore > 1.0 || !configuredMultipleChoiceScore
                        : manualScore < 1 || manualScore > maxLevel || manualScore != Math.rint(manualScore));
        if (scoreOutOfRange) {
            processingNotes.add("Local agent returned out-of-range score for " + question.responseKey() + "; score was ignored.");
            manualScore = null;
        }
        boolean scoreRequired = question.requiresManualScore() || status == QuestionEvaluationStatus.ADJUSTED;
        if (scoreRequired && manualScore == null) {
            processingNotes.add("Local agent did not provide a required manual score for " + question.responseKey() + ".");
        }
        if (!scoreRequired && status != QuestionEvaluationStatus.ADJUSTED) {
            manualScore = null;
        }
        draft.setManualScore(manualScore);

        String note = limitText(textValue(node, "reviewerNote"), TextLimits.DESCRIPTION);
        if ((status == QuestionEvaluationStatus.ADJUSTED || status == QuestionEvaluationStatus.FLAGGED)
                && !StringUtils.hasText(note)) {
            note = GENERIC_MISSING_NOTE;
        }
        draft.setReviewerNote(StringUtils.hasText(note) ? note : null);
        draft.setConfidence(nullableDouble(node.path("confidence")));
        draft.setRationale(limitText(textValue(node, "rationale"), TextLimits.DESCRIPTION));
        return draft;
    }

    private List<ReviewQuestion> buildReviewQuestions(
            MaturityModel model,
            Map<String, Object> responses,
            List<Evidence> evidenceItems,
            int maxLevel
    ) {
        Map<Long, List<Evidence>> evidenceByQuestion = evidenceItems.stream()
                .filter(item -> item.getQuestion() != null && item.getQuestion().getId() != null)
                .collect(Collectors.groupingBy(item -> item.getQuestion().getId()));
        List<ReviewQuestion> questions = new ArrayList<>();

        for (Dimension dimension : safeList(model.getDimensions())) {
            for (Module module : safeList(dimension.getModules())) {
                for (Practice practice : safeList(module.getPractices())) {
                    String practiceId = practice.getId() != null
                            ? String.valueOf(practice.getId())
                            : nullToEmpty(practice.getName());
                    for (Question question : safeList(practice.getQuestions())) {
                        if (question.getId() == null) {
                            continue;
                        }
                        String responseKey = buildResponseKey(dimension, module, practiceId, question);
                        Object answer = responses.get(responseKey);
                        List<Evidence> questionEvidence = evidenceByQuestion.getOrDefault(question.getId(), List.of());
                        boolean reviewable = isAnswered(answer) || !questionEvidence.isEmpty();
                        if (!reviewable) {
                            continue;
                        }
                        questions.add(new ReviewQuestion(
                                responseKey,
                                question.getId(),
                                question.getCode(),
                                question.getText(),
                                question.getHelp(),
                                normalizeType(question.getType()),
                                question.getBooleanCorrectAnswer() == null
                                        || question.getBooleanCorrectAnswer(),
                                question.getScaleHighPointIsMaximum() == null
                                        || question.getScaleHighPointIsMaximum(),
                                question.getRangeMin() == null ? 0 : question.getRangeMin(),
                                question.getRangeMax() == null ? 100 : question.getRangeMax(),
                                question.getRangeHighValueIsMaximum() == null
                                        || question.getRangeHighValueIsMaximum(),
                                Boolean.TRUE.equals(question.getRequiresEvidence()),
                                "open_answer".equalsIgnoreCase(question.getType()) && isAnswered(answer),
                                dimension.getDimensionId(),
                                dimension.getName(),
                                module.getCode(),
                                module.getName(),
                                practice.getId(),
                                practice.getName(),
                                answer,
                                parseChoices(question),
                                resolveScalePointCount(question),
                                question.getScaleMinLabel(),
                                question.getScaleMaxLabel(),
                                questionEvidence.stream().map(Evidence::getId).toList()
                        ));
                    }
                }
            }
        }
        return questions;
    }

    private Map<String, Object> questionBatchPayload(
            Assessment assessment,
            MaturityModel model,
            List<ReviewQuestion> batch,
            List<EvidenceContext> evidenceContexts,
            int maxLevel
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("assessment", assessmentPayload(assessment, model));
        payload.put("maturityScale", maturityScalePayload(model, maxLevel));
        payload.put("maxLevel", maxLevel);
        payload.put("questions", batch.stream()
                .map(question -> questionPayload(question, evidenceContexts))
                .toList());
        return payload;
    }

    private Map<String, Object> finalSynthesisPayload(
            Assessment assessment,
            MaturityModel model,
            List<ReviewQuestion> reviewQuestions,
            Map<String, AgentQuestionEvaluationDraft> drafts,
            List<EvidenceContext> evidenceContexts,
            List<String> processingNotes,
            int maxLevel
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("assessment", assessmentPayload(assessment, model));
        payload.put("maturityScale", maturityScalePayload(model, maxLevel));
        payload.put("maxLevel", maxLevel);
        payload.put("questionDrafts", reviewQuestions.stream()
                .map(question -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("question", questionPayload(question, evidenceContexts));
                    item.put("draft", drafts.get(question.responseKey()));
                    return item;
                })
                .toList());
        payload.put("documentSummaries", evidenceContexts.stream()
                .map(EvidenceContext::summary)
                .toList());
        payload.put("processingNotes", processingNotes);
        return payload;
    }

    private Map<String, Object> assessmentPayload(Assessment assessment, MaturityModel model) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("assessmentId", assessment.getId());
        payload.put("maturityModelId", model.getId());
        payload.put("maturityModelName", nullToEmpty(model.getName()));
        payload.put("createdAt", assessment.getCreatedAt() != null ? assessment.getCreatedAt().toString() : null);
        payload.put("currentOverallAverage", assessment.getOverallAverage());
        payload.put("currentOverallMaturityLevel", nullToEmpty(assessment.getOverallMaturityLevel()));
        return payload;
    }

    private Map<String, Object> evidenceSummaryPayload(AgentDocumentSummary summary, String extractedText) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("evidenceId", summary.getEvidenceId());
        payload.put("questionId", summary.getQuestionId());
        payload.put("fileName", summary.getFileName());
        payload.put("extractedText", extractedText);
        return payload;
    }

    private List<Map<String, Object>> maturityScalePayload(MaturityModel model, int maxLevel) {
        List<MaturityLevel> levels = new ArrayList<>(safeList(model.getLevels()));
        levels.sort(Comparator.comparing(MaturityLevel::getNumber, Comparator.nullsLast(Integer::compareTo)));
        if (levels.isEmpty()) {
            List<Map<String, Object>> fallback = new ArrayList<>();
            for (int index = 1; index <= maxLevel; index++) {
                fallback.add(Map.of("number", index, "name", "Level " + index, "description", ""));
            }
            return fallback;
        }
        return levels.stream()
                .map(level -> {
                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("number", level.getNumber());
                    payload.put("name", nullToEmpty(level.getName()));
                    payload.put("description", nullToEmpty(level.getDescription()));
                    return payload;
                })
                .toList();
    }

    private Map<String, Object> questionPayload(
            ReviewQuestion question,
            List<EvidenceContext> evidenceContexts
    ) {
        List<AgentDocumentSummary> summaries = evidenceContexts.stream()
                .filter(context -> question.questionId().equals(context.questionId()))
                .map(EvidenceContext::summary)
                .toList();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("responseKey", question.responseKey());
        payload.put("questionId", question.questionId());
        payload.put("questionCode", nullToEmpty(question.questionCode()));
        payload.put("dimension", question.dimensionName());
        payload.put("module", question.moduleName());
        payload.put("practice", question.practiceName());
        payload.put("questionText", question.questionText());
        payload.put("help", nullToEmpty(question.help()));
        payload.put("type", question.type());
        if ("boolean".equalsIgnoreCase(question.type())) {
            payload.put("correctAnswer", question.booleanCorrectAnswer());
        }
        if ("likert".equalsIgnoreCase(question.type())) {
            payload.put("highPointIsMaximum", question.scaleHighPointIsMaximum());
        }
        if ("numeric".equalsIgnoreCase(question.type()) || "percentage".equalsIgnoreCase(question.type())) {
            payload.put("rangeMin", question.rangeMin());
            payload.put("rangeMax", question.rangeMax());
            payload.put("highValueIsMaximum", question.rangeHighValueIsMaximum());
        }
        payload.put("requiresEvidence", question.requiresEvidence());
        payload.put("requiresManualScore", question.requiresManualScore());
        payload.put("answer", question.answer());
        payload.put("choices", question.choices());
        payload.put("scalePointCount", question.scalePointCount());
        payload.put("scaleMinLabel", nullToEmpty(question.scaleMinLabel()));
        payload.put("scaleMaxLabel", nullToEmpty(question.scaleMaxLabel()));
        payload.put("evidence", summaries);
        return payload;
    }

    private String readSystemPrompt() {
        try {
            return StreamUtils.copyToString(systemPromptResource.getInputStream(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Local agent system prompt could not be loaded.");
        }
    }

    private Map<String, Object> evidenceSummarySchema() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("summary", stringSchema());
        props.put("relevantSignals", arraySchema(stringSchema()));
        props.put("limitations", arraySchema(stringSchema()));
        return objectSchema(props, List.of("summary", "relevantSignals", "limitations"));
    }

    private Map<String, Object> questionEvaluationSchema() {
        Map<String, Object> itemProps = new LinkedHashMap<>();
        itemProps.put("responseKey", stringSchema());
        itemProps.put("validationStatus", Map.of("type", "string", "enum", List.of("ACCEPTED", "ADJUSTED", "FLAGGED")));
        itemProps.put("manualScore", Map.of("type", List.of("number", "null")));
        itemProps.put("reviewerNote", Map.of("type", List.of("string", "null")));
        itemProps.put("confidence", Map.of("type", "number"));
        itemProps.put("rationale", stringSchema());

        Map<String, Object> props = new LinkedHashMap<>();
        props.put("evaluations", arraySchema(objectSchema(
                itemProps,
                List.of("responseKey", "validationStatus", "manualScore", "reviewerNote", "confidence", "rationale")
        )));
        return objectSchema(props, List.of("evaluations"));
    }

    private Map<String, Object> finalSynthesisSchema() {
        Map<String, Object> warningProps = new LinkedHashMap<>();
        warningProps.put("severity", Map.of("type", "string", "enum", List.of("low", "medium", "high")));
        warningProps.put("questionId", Map.of("type", List.of("integer", "null")));
        warningProps.put("responseKey", Map.of("type", List.of("string", "null")));
        warningProps.put("message", stringSchema());
        warningProps.put("recommendation", Map.of("type", List.of("string", "null")));

        Map<String, Object> props = new LinkedHashMap<>();
        props.put("summary", stringSchema());
        props.put("finalRemarks", stringSchema());
        props.put("confidence", Map.of("type", "number"));
        props.put("warnings", arraySchema(objectSchema(
                warningProps,
                List.of("severity", "questionId", "responseKey", "message", "recommendation")
        )));
        props.put("nextSteps", arraySchema(stringSchema()));
        return objectSchema(props, List.of("summary", "finalRemarks", "confidence", "warnings", "nextSteps"));
    }

    private Map<String, Object> objectSchema(Map<String, Object> properties, List<String> required) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        schema.put("properties", properties);
        schema.put("required", required);
        return schema;
    }

    private Map<String, Object> arraySchema(Map<String, Object> itemSchema) {
        return Map.of("type", "array", "items", itemSchema);
    }

    private Map<String, Object> stringSchema() {
        return Map.of("type", "string");
    }

    private Map<String, Object> readQuestionResponses(Long assessmentId) {
        Map<String, Object> responses = new LinkedHashMap<>();
        for (QuestionEvaluation row :
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessmentId)) {
            if (row.getResponseKey() != null && row.getResponse() != null) {
                responses.put(
                        row.getResponseKey(),
                        objectMapper.convertValue(row.getResponse(), Object.class)
                );
            }
        }
        return responses;
    }

    private List<Map<String, Object>> parseChoices(Question question) {
        if (!"multiple_choice".equalsIgnoreCase(question.getType()) || !StringUtils.hasText(question.getChoiceOptions())) {
            return List.of();
        }
        try {
            List<QuestionChoiceDTO> choices = objectMapper.readValue(
                    question.getChoiceOptions(),
                    new TypeReference<List<QuestionChoiceDTO>>() {
                    }
            );
            return safeList(choices).stream()
                    .filter(choice -> choice != null)
                    .map(choice -> {
                        Map<String, Object> payload = new LinkedHashMap<>();
                        payload.put("label", nullToEmpty(choice.getLabel()));
                        payload.put("score", choice.getScore());
                        return payload;
                    })
                    .toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    private List<AgentEvaluationWarning> warningsFromNode(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        List<AgentEvaluationWarning> warnings = new ArrayList<>();
        for (JsonNode item : node) {
            AgentEvaluationWarning warning = new AgentEvaluationWarning();
            String severity = textValue(item, "severity").toLowerCase();
            warning.setSeverity(Set.of("low", "medium", "high").contains(severity) ? severity : "medium");
            warning.setQuestionId(nullableLong(item.path("questionId")));
            warning.setResponseKey(nullableText(item.path("responseKey")));
            warning.setMessage(limitText(textValue(item, "message"), TextLimits.DESCRIPTION));
            warning.setRecommendation(limitText(nullableText(item.path("recommendation")), TextLimits.DESCRIPTION));
            if (StringUtils.hasText(warning.getMessage())) {
                warnings.add(warning);
            }
        }
        return warnings;
    }

    private String buildResponseKey(Dimension dimension, Module module, String practiceId, Question question) {
        return nullToEmpty(dimension.getDimensionId())
                + "_"
                + nullToEmpty(module.getCode())
                + "_"
                + nullToEmpty(practiceId)
                + "_"
                + question.getId();
    }

    private boolean isAnswered(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof String text) {
            return StringUtils.hasText(text);
        }
        return true;
    }

    private int resolveScalePointCount(Question question) {
        return question.getScalePointCount() == null
                ? 5
                : Math.max(2, Math.min(100, question.getScalePointCount()));
    }

    private String normalizeType(String type) {
        return type == null ? "" : type.trim().toLowerCase();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Local agent context could not be serialized.");
        }
    }

    private String limitPrompt(String prompt) {
        if (prompt == null || prompt.length() <= properties.getMaxPromptChars()) {
            return prompt;
        }
        return prompt.substring(0, Math.max(0, properties.getMaxPromptChars()))
                + "\n\n[Context truncated to local-agent.max-prompt-chars.]";
    }

    private String limitText(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength).trim();
    }

    private String textValue(JsonNode node, String field) {
        return nullableText(node.path(field));
    }

    private String nullableText(JsonNode node) {
        return node != null && node.isTextual() ? node.asText().trim() : "";
    }

    private Integer nullableInt(JsonNode node) {
        return node != null && node.isNumber() ? node.asInt() : null;
    }

    private Long nullableLong(JsonNode node) {
        return node != null && node.isNumber() ? node.asLong() : null;
    }

    private Double nullableDouble(JsonNode node) {
        return node != null && node.isNumber() ? node.asDouble() : null;
    }

    private List<String> stringList(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            if (item.isTextual() && StringUtils.hasText(item.asText())) {
                values.add(item.asText().trim());
            }
        }
        return values;
    }

    private String mergeWarnings(String left, String right) {
        if (!StringUtils.hasText(left)) {
            return right;
        }
        if (!StringUtils.hasText(right)) {
            return left;
        }
        return left + " " + right;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private <T> List<T> safeList(List<T> value) {
        return value == null ? Collections.emptyList() : value;
    }

    private record EvidenceContext(
            Long questionId,
            AgentDocumentSummary summary,
            String extractedText
    ) {
    }

    private record FinalSynthesis(
            String summary,
            String finalRemarks,
            Double confidence,
            List<AgentEvaluationWarning> warnings,
            List<String> nextSteps
    ) {
    }

    private record ReviewQuestion(
            String responseKey,
            Long questionId,
            String questionCode,
            String questionText,
            String help,
            String type,
            boolean booleanCorrectAnswer,
            boolean scaleHighPointIsMaximum,
            int rangeMin,
            int rangeMax,
            boolean rangeHighValueIsMaximum,
            boolean requiresEvidence,
            boolean requiresManualScore,
            String dimensionId,
            String dimensionName,
            String moduleCode,
            String moduleName,
            Long practiceId,
            String practiceName,
            Object answer,
            List<Map<String, Object>> choices,
            int scalePointCount,
            String scaleMinLabel,
            String scaleMaxLabel,
            List<Long> evidenceIds
    ) {
    }
}
