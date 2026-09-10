package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.AssessmentRequest;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.dto.DimensionResultResponse;
import com.master_thesis.maturity_assessment.assessments.dto.ManualEvaluationRequest;
import com.master_thesis.maturity_assessment.assessments.dto.QuestionEvaluationRequest;
import com.master_thesis.maturity_assessment.assessments.dto.QuestionEvaluationResponse;
import com.master_thesis.maturity_assessment.assessments.dto.QuestionResponseRequest;
import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import com.master_thesis.maturity_assessment.assessments.models.DimensionResult;
import com.master_thesis.maturity_assessment.assessments.models.Evidence;
import com.master_thesis.maturity_assessment.assessments.models.QuestionEvaluation;
import com.master_thesis.maturity_assessment.assessments.models.QuestionEvaluationStatus;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.auth.utils.RoleUtils;
import com.master_thesis.maturity_assessment.config.ResourceNotFoundException;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.assessments.repository.DimensionResultRepository;
import com.master_thesis.maturity_assessment.assessments.repository.EvidenceRepository;
import com.master_thesis.maturity_assessment.assessments.repository.QuestionEvaluationRepository;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityLevel;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingRule;
import com.master_thesis.maturity_assessment.maturity_models.services.MaturityScoringService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.master_thesis.maturity_assessment.config.TextLimits;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionChoiceDTO;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final DimensionResultRepository dimensionResultRepository;
    private final MaturityModelRepository maturityModelRepository;
    private final EvidenceRepository evidenceRepository;
    private final QuestionEvaluationRepository questionEvaluationRepository;
    private final UserRepository userRepository;
    private final MaturityScoringService maturityScoringService;
    private final ObjectMapper objectMapper;

    // Inner class to store question metadata
    private static class QuestionInfo {
        private final String type;
        private final Double weight;
        private final Double practiceWeight;
        private final Double moduleWeight;
        private final Double dimensionWeight;
        private final AggregationRule practiceAggregationRule;
        private final AggregationRule moduleAggregationRule;
        private final AggregationRule dimensionAggregationRule;
        private final Long questionId;
        private final String dimensionId;
        private final String moduleCode;
        private final String practiceId;
        private final String practiceCode;
        private final String questionCode;
        private final List<GatingRule> practiceGatingRules;
        private final List<GatingRule> moduleGatingRules;
        private final List<GatingRule> dimensionGatingRules;
        private final Boolean requiresEvidence;
        private final Boolean booleanCorrectAnswer;
        /** Non-null for multiple_choice: valid normalized response scores. */
        private final Set<Double> multipleChoiceAllowedScores;
        private final int maxLevelNumber;
        private final int scalePointCount;
        private final boolean scaleHighPointIsMaximum;
        private final int rangeMin;
        private final int rangeMax;
        private final boolean rangeHighValueIsMaximum;

        public QuestionInfo(
                String type,
                Double weight,
                Double practiceWeight,
                Double moduleWeight,
                Double dimensionWeight,
                AggregationRule practiceAggregationRule,
                AggregationRule moduleAggregationRule,
                AggregationRule dimensionAggregationRule,
                Long questionId,
                String dimensionId,
                String moduleCode,
                String practiceId,
                String practiceCode,
                String questionCode,
                List<GatingRule> practiceGatingRules,
                List<GatingRule> moduleGatingRules,
                List<GatingRule> dimensionGatingRules,
                Boolean requiresEvidence,
                Boolean booleanCorrectAnswer,
                Set<Double> multipleChoiceAllowedScores,
                int maxLevelNumber,
                int scalePointCount,
                boolean scaleHighPointIsMaximum,
                int rangeMin,
                int rangeMax,
                boolean rangeHighValueIsMaximum
        ) {
            this.type = type;
            this.weight = weight;
            this.practiceWeight = practiceWeight;
            this.moduleWeight = moduleWeight;
            this.dimensionWeight = dimensionWeight;
            this.practiceAggregationRule = practiceAggregationRule;
            this.moduleAggregationRule = moduleAggregationRule;
            this.dimensionAggregationRule = dimensionAggregationRule;
            this.questionId = questionId;
            this.dimensionId = dimensionId;
            this.moduleCode = moduleCode;
            this.practiceId = practiceId;
            this.practiceCode = practiceCode;
            this.questionCode = questionCode;
            this.practiceGatingRules = practiceGatingRules;
            this.moduleGatingRules = moduleGatingRules;
            this.dimensionGatingRules = dimensionGatingRules;
            this.requiresEvidence = requiresEvidence;
            this.booleanCorrectAnswer = booleanCorrectAnswer;
            this.multipleChoiceAllowedScores = multipleChoiceAllowedScores;
            this.maxLevelNumber = maxLevelNumber;
            this.scalePointCount = scalePointCount;
            this.scaleHighPointIsMaximum = scaleHighPointIsMaximum;
            this.rangeMin = rangeMin;
            this.rangeMax = rangeMax;
            this.rangeHighValueIsMaximum = rangeHighValueIsMaximum;
        }

        public String getType() {
            return type;
        }

        public Double getWeight() {
            return weight;
        }

        public Double getPracticeWeight() {
            return practiceWeight;
        }

        public Double getModuleWeight() {
            return moduleWeight;
        }

        public Double getDimensionWeight() {
            return dimensionWeight;
        }

        public AggregationRule getPracticeAggregationRule() {
            return practiceAggregationRule;
        }

        public AggregationRule getModuleAggregationRule() {
            return moduleAggregationRule;
        }

        public AggregationRule getDimensionAggregationRule() {
            return dimensionAggregationRule;
        }

        /**
         * Returns the effective weight: question weight * practice weight.
         */
        public double getEffectiveWeight() {
            double qw = (weight != null) ? weight : 1.0;
            double pw = (practiceWeight != null) ? practiceWeight : 1.0;
            return qw * pw;
        }

        public Long getQuestionId() {
            return questionId;
        }

        public String getDimensionId() {
            return dimensionId;
        }

        public String getPracticeCode() {
            return practiceCode;
        }

        public String getQuestionCode() {
            return questionCode;
        }

        public List<GatingRule> getPracticeGatingRules() {
            return practiceGatingRules;
        }

        public List<GatingRule> getModuleGatingRules() {
            return moduleGatingRules;
        }

        public List<GatingRule> getDimensionGatingRules() {
            return dimensionGatingRules;
        }

        public String getModuleCode() {
            return moduleCode;
        }

        public String getPracticeId() {
            return practiceId;
        }

        public Boolean getRequiresEvidence() {
            return requiresEvidence;
        }

        public boolean getBooleanCorrectAnswer() {
            return booleanCorrectAnswer == null || booleanCorrectAnswer;
        }

        public Set<Double> getMultipleChoiceAllowedScores() {
            return multipleChoiceAllowedScores;
        }

        public int getMaxLevelNumber() {
            return maxLevelNumber;
        }

        public int getScalePointCount() {
            return scalePointCount;
        }

        public boolean isScaleHighPointMaximum() {
            return scaleHighPointIsMaximum;
        }

        public int getRangeMin() {
            return rangeMin;
        }

        public int getRangeMax() {
            return rangeMax;
        }

        public boolean isRangeHighValueMaximum() {
            return rangeHighValueIsMaximum;
        }
    }

    /**
     * Loads question metadata from maturity model and creates a map of response keys to question info.
     * Response key format: dimensionId_moduleCode_practiceId_questionId
     */
    @Transactional(readOnly = true)
    private Map<String, QuestionInfo> loadQuestionMetadata(Long maturityModelId) {
        if (maturityModelId == null) {
            return new HashMap<>();
        }

        MaturityModel model = maturityModelRepository.findById(maturityModelId)
                .orElseThrow(() -> new RuntimeException("Maturity model not found with id: " + maturityModelId));

        int maxLevelNumber = maturityScoringService.resolveMaxLevelNumber(model.getLevels());

        Map<String, QuestionInfo> metadataMap = new HashMap<>();

        if (model.getDimensions() != null) {
            for (Dimension dimension : model.getDimensions()) {
                String dimensionId = dimension.getDimensionId();

                if (dimension.getModules() != null) {
                    for (Module module : dimension.getModules()) {
                        String moduleCode = module.getCode();

                        if (module.getPractices() != null) {
                            for (Practice practice : module.getPractices()) {
                                // Handle practiceId: could be ID (number) or name (string)
                                // Frontend sends: practice.id || practice.name
                                String practiceId = practice.getId() != null 
                                        ? String.valueOf(practice.getId()) 
                                        : (practice.getName() != null ? practice.getName() : "");

                                Double practiceWeight = practice.getWeight();

                                if (practice.getQuestions() != null) {
                                    for (Question question : practice.getQuestions()) {
                                        if (question.getId() == null) {
                                            continue; // Skip questions without ID
                                        }
                                        String questionId = String.valueOf(question.getId());
                                        String responseKey = dimensionId + "_" + moduleCode + "_" + practiceId + "_" + questionId;

                                        Set<Double> mcqScores = parseMultipleChoiceAllowedScores(question);
                                        int scalePointCount = resolveScalePointCount(question);
                                        QuestionInfo info = new QuestionInfo(
                                                question.getType(),
                                                question.getWeight(),
                                                practiceWeight,
                                                module.getWeight(),
                                                dimension.getWeight(),
                                                practice.getAggregationRule(),
                                                module.getAggregationRule(),
                                                dimension.getAggregationRule(),
                                                question.getId(),
                                                dimensionId,
                                                moduleCode,
                                                practiceId,
                                                practice.getCode(),
                                                question.getCode(),
                                                practice.getGatingRules(),
                                                module.getGatingRules(),
                                                dimension.getGatingRules(),
                                                question.getRequiresEvidence(),
                                                question.getBooleanCorrectAnswer(),
                                                mcqScores,
                                                maxLevelNumber,
                                                scalePointCount,
                                                question.getScaleHighPointIsMaximum() == null
                                                        || question.getScaleHighPointIsMaximum(),
                                                question.getRangeMin() == null ? 0 : question.getRangeMin(),
                                                question.getRangeMax() == null ? 100 : question.getRangeMax(),
                                                question.getRangeHighValueIsMaximum() == null
                                                        || question.getRangeHighValueIsMaximum()
                                        );
                                        metadataMap.put(responseKey, info);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return metadataMap;
    }

    private int resolveScalePointCount(Question question) {
        Integer pointCount = question.getScalePointCount();
        return pointCount == null ? 5 : Math.max(2, Math.min(100, pointCount));
    }

    private Set<Double> parseMultipleChoiceAllowedScores(Question question) {
        if (question.getType() == null || !"multiple_choice".equalsIgnoreCase(question.getType())) {
            return null;
        }
        String raw = question.getChoiceOptions();
        if (raw == null || raw.isBlank()) {
            return Collections.emptySet();
        }
        try {
            List<QuestionChoiceDTO> choices = objectMapper.readValue(
                    raw,
                    new TypeReference<List<QuestionChoiceDTO>>() {
                    });
            if (choices == null || choices.isEmpty()) {
                return Collections.emptySet();
            }
            Set<Double> scores = new HashSet<>();
            for (QuestionChoiceDTO c : choices) {
                if (c != null && c.getScore() != null) {
                    scores.add(c.getScore());
                }
            }
            return scores;
        } catch (Exception e) {
            return Collections.emptySet();
        }
    }

    /**
     * Converts response value to score based on question type.
     * Boolean: curator-selected correct answer → 1, other answer → 0
     * Scale: configured point normalized to 0..1; multiple choice: configured option score in 0..1
     * Numeric/Percentage: bounded integer normalized linearly to 0..1
     * Open answer: null (the evaluator supplies its maturity-scale score later)
     */
    private Double convertResponseToScore(Object responseValue, QuestionInfo questionInfo) {
        String questionType = questionInfo.getType();
        int scalePointCount = questionInfo.getScalePointCount();
        if (responseValue == null) {
            return null;
        }

        if ("open_answer".equals(questionType)) {
            // A numeric-looking free-text response is still respondent text, not a score.
            return null;
        }

        if ("boolean".equals(questionType)) {
            Boolean answer = parseBooleanAnswer(responseValue);
            return answer == null
                    ? null
                    : (answer == questionInfo.getBooleanCorrectAnswer() ? 1.0 : 0.0);
        }

        if ("likert".equals(questionType)) {
            Integer point = parseIntegerResponse(responseValue);
            if (point == null || point < 1 || point > scalePointCount) {
                return null;
            }
            double normalized = (point - 1.0) / (scalePointCount - 1.0);
            return questionInfo.isScaleHighPointMaximum() ? normalized : 1.0 - normalized;
        }

        if ("multiple_choice".equals(questionType)) {
            final double score;
            if (responseValue instanceof Number) {
                score = ((Number) responseValue).doubleValue();
            } else {
                try {
                    score = Double.parseDouble(responseValue.toString());
                } catch (NumberFormatException e) {
                    return null;
                }
            }
            if (!Double.isFinite(score) || score < 0.0 || score > 1.0) {
                return null;
            }
            Set<Double> allowed = questionInfo.getMultipleChoiceAllowedScores();
            if (allowed != null && !allowed.isEmpty()
                    && allowed.stream().noneMatch(configured -> Math.abs(configured - score) <= 1e-9)) {
                return null;
            }
            return score;
        }

        if ("numeric".equals(questionType) || "percentage".equals(questionType)) {
            final double numericValue;
            if (responseValue instanceof Number) {
                numericValue = ((Number) responseValue).doubleValue();
            } else {
                try {
                    numericValue = Double.parseDouble(responseValue.toString());
                } catch (NumberFormatException e) {
                    return null;
                }
            }
            int rangeMin = questionInfo.getRangeMin();
            int rangeMax = questionInfo.getRangeMax();
            if (!Double.isFinite(numericValue) || numericValue != Math.rint(numericValue)
                    || rangeMin >= rangeMax || numericValue < rangeMin || numericValue > rangeMax) {
                return null;
            }
            double normalized = (numericValue - rangeMin) / (rangeMax - rangeMin);
            return questionInfo.isRangeHighValueMaximum() ? normalized : 1.0 - normalized;
        }

        // For other types, try to convert to integer if possible
        try {
            if (responseValue instanceof Number) {
                return ((Number) responseValue).doubleValue();
            }
            return Double.parseDouble(responseValue.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseIntegerResponse(Object responseValue) {
        if (responseValue instanceof Number number) {
            double value = number.doubleValue();
            return Double.isFinite(value) && value == Math.rint(value)
                    ? number.intValue() : null;
        }
        try {
            return Integer.parseInt(responseValue.toString());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private Boolean parseBooleanAnswer(Object responseValue) {
        if (responseValue instanceof Boolean booleanValue) {
            return booleanValue;
        }
        if (responseValue instanceof Number numberValue) {
            double value = numberValue.doubleValue();
            if (Double.compare(value, 0.0) == 0) {
                return false;
            }
            if (Double.compare(value, 1.0) == 0) {
                return true;
            }
            return null;
        }
        String value = responseValue.toString().trim();
        if ("true".equalsIgnoreCase(value) || "1".equals(value)) {
            return true;
        }
        if ("false".equalsIgnoreCase(value) || "0".equals(value)) {
            return false;
        }
        return null;
    }

    @Transactional
    public AssessmentResponse createAssessment(AssessmentRequest request, User user) {
        return submitAssessment(request, user, null, null);
    }

    @Transactional
    public AssessmentResponse submitDraft(Long draftId, AssessmentRequest request, User user) {
        Assessment draft = requireOwnedRespondentAssessmentForUpdate(draftId, user);
        if (request == null || request.getMaturityModelId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maturity model is required.");
        }
        if (!Objects.equals(draft.getMaturityModelId(), request.getMaturityModelId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Draft does not belong to the requested maturity model."
            );
        }
        return submitAssessment(request, user, null, draft);
    }

    @Transactional
    public AssessmentResponse submitCampaignAssessment(
            AssessmentRequest request,
            CampaignParticipant participant
    ) {
        Assessment assessment = requireCampaignRespondentAssessmentForUpdate(participant);
        if (request == null || request.getMaturityModelId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maturity model is required.");
        }
        if (!Objects.equals(assessment.getMaturityModelId(), request.getMaturityModelId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Draft does not belong to the requested maturity model."
            );
        }
        return submitAssessment(request, null, participant, assessment);
    }

    private AssessmentResponse submitAssessment(
            AssessmentRequest request,
            User user,
            CampaignParticipant campaignParticipant,
            Assessment targetDraft
    ) {
        if (request == null || request.getMaturityModelId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maturity model is required.");
        }
        validateQuestionResponses(request);
        validateNumericResponses(request);
        boolean resubmission = targetDraft != null
                && resolveAssessmentStatus(targetDraft) == AssessmentStatus.CHANGES_REQUESTED;
        if (resubmission) {
            validateAcceptedResponsesUnchanged(targetDraft, request);
            requireAllFlaggedResponsesUpdated(targetDraft, request);
        }
        MaturityModel submissionModel = maturityModelRepository.findById(request.getMaturityModelId())
                .orElseThrow(() -> new RuntimeException("Maturity model not found"));
        validateRequiredResponses(submissionModel, request);

        // Check if maturity model is auto-evaluated
        boolean isAutoEvaluated = checkIfMaturityModelIsAutoEvaluated(request.getMaturityModelId());

        // Calculate dimension results from the responses map
        List<DimensionResult> dimensionResults = calculateDimensionResults(
                responseValues(request),
                request.getMaturityModelId()
        );

        // Load model for scoring
        MaturityModel model = request.getMaturityModelId() != null
                ? maturityModelRepository.findById(request.getMaturityModelId()).orElse(null)
                : null;

        int maxLevelNumber = model != null
                ? maturityScoringService.resolveMaxLevelNumber(model.getLevels())
                : maturityScoringService.getMaxLevelNumber();
        List<MaturityLevel> modelLevels = model != null ? model.getLevels() : null;

        double overallAverage = calculateOverallScore(dimensionResults, model);

        // Normalize to percentage and determine maturity level via mapping
        double overallPercentage = maturityScoringService.normalizeToPercentage(overallAverage, maxLevelNumber);
        int overallLevelNumber = maturityScoringService.mapScoreToLevel(overallPercentage, maxLevelNumber);
        String overallMaturityLevelName = maturityScoringService.getLevelName(overallLevelNumber, modelLevels);

        Assessment assessment = targetDraft != null
                ? targetDraft
                : getOrCreateDraftAssessment(user, request.getMaturityModelId());
        assessment.setOverallAverage(overallAverage);
        assessment.setOverallPercentageScore(overallPercentage);
        assessment.setOverallMaturityLevel(overallMaturityLevelName);
        transitionTo(
                assessment,
                isAutoEvaluated ? AssessmentStatus.COMPLETED : AssessmentStatus.PENDING_REVIEW
        );
        populateAssessmentRequestFields(assessment, request, user, campaignParticipant);

        Assessment savedAssessment = assessmentRepository.save(assessment);
        synchronizeQuestionResponses(
                savedAssessment,
                request,
                true,
                resubmission
        );
        if (resubmission) {
            applyRespondentUpdateMarkers(savedAssessment, request, true);
        }

        List<DimensionResult> existingResults = dimensionResultRepository.findByAssessmentId(savedAssessment.getId());
        if (!existingResults.isEmpty()) {
            dimensionResultRepository.deleteAll(existingResults);
        }

        // Set assessment reference and save dimension results
        dimensionResults.forEach(result -> result.setAssessment(savedAssessment));
        dimensionResultRepository.saveAll(dimensionResults);

        AssessmentResponse created = convertToResponse(savedAssessment, dimensionResults);
        enrichModelMetadata(created);
        return created;
    }

    @Transactional
    public AssessmentResponse saveDraft(AssessmentRequest request, User user) {
        validateDraftRequest(request);

        Assessment assessment = getOrCreateDraftAssessment(user, request.getMaturityModelId());
        populateAssessmentRequestFields(assessment, request, user, null);
        initializeDraftState(assessment);

        Assessment savedAssessment = assessmentRepository.save(assessment);
        synchronizeQuestionResponses(savedAssessment, request, false, false);
        AssessmentResponse response = convertToResponse(savedAssessment, List.of());
        enrichModelMetadata(response);
        return response;
    }

    @Transactional
    public AssessmentResponse ensureDraftForModel(Long maturityModelId, User user) {
        MaturityModel model = maturityModelRepository.findById(maturityModelId)
                .orElseThrow(() -> new ResourceNotFoundException("Maturity model not found"));
        if (!Boolean.TRUE.equals(model.getIsActive())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A draft can only be started for an active maturity model."
            );
        }
        User lockedUser = lockUserForDraftCreation(user);
        Optional<Assessment> existing = assessmentRepository
                .findByUserIdAndMaturityModelIdAndStatus(
                        lockedUser.getId(),
                        maturityModelId,
                        AssessmentStatus.DRAFT
                );
        Assessment assessment = existing.orElseGet(() -> {
            Assessment created = new Assessment();
            created.setUser(lockedUser);
            created.setMaturityModelId(maturityModelId);
            initializeDraftState(created);
            return assessmentRepository.saveAndFlush(created);
        });

        AssessmentResponse response = convertToResponse(assessment, List.of());
        enrichModelMetadata(response);
        return response;
    }

    @Transactional
    public AssessmentResponse ensureCampaignAssessment(CampaignParticipant participant) {
        if (participant == null || participant.getId() == null
                || participant.getCampaign() == null
                || participant.getCampaign().getMaturityModel() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Campaign invitation is invalid.");
        }

        Assessment assessment = participant.getAssessment();
        if (assessment == null) {
            assessment = new Assessment();
            assessment.setUser(null);
            assessment.setCampaign(participant.getCampaign());
            assessment.setCampaignParticipant(participant);
            assessment.setMaturityModelId(participant.getCampaign().getMaturityModel().getId());
            initializeDraftState(assessment);
            assessment = assessmentRepository.saveAndFlush(assessment);
            participant.setAssessment(assessment);
        }

        AssessmentResponse response = convertToResponse(assessment);
        enrichModelMetadata(response);
        return response;
    }

    @Transactional
    public AssessmentResponse saveDraft(Long draftId, AssessmentRequest request, User user) {
        Assessment assessment = requireOwnedRespondentAssessmentForUpdate(draftId, user);
        boolean changesRequested =
                resolveAssessmentStatus(assessment) == AssessmentStatus.CHANGES_REQUESTED;
        if (request == null || request.getMaturityModelId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maturity model is required to save a draft.");
        }
        if (!Objects.equals(assessment.getMaturityModelId(), request.getMaturityModelId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Draft does not belong to the requested maturity model."
            );
        }
        validateDraftRequest(request);
        if (changesRequested) {
            validateAcceptedResponsesUnchanged(assessment, request);
        }

        populateAssessmentRequestFields(assessment, request, assessment.getUser(), null);
        if (!changesRequested) {
            initializeDraftState(assessment);
        }
        Assessment savedAssessment = assessmentRepository.save(assessment);
        synchronizeQuestionResponses(
                savedAssessment,
                request,
                false,
                changesRequested
        );
        if (changesRequested) {
            applyRespondentUpdateMarkers(savedAssessment, request, false);
        }
        AssessmentResponse response = convertToResponse(savedAssessment, List.of());
        enrichModelMetadata(response);
        return response;
    }

    @Transactional
    public AssessmentResponse saveCampaignDraft(
            AssessmentRequest request,
            CampaignParticipant participant
    ) {
        Assessment assessment = requireCampaignRespondentAssessmentForUpdate(participant);
        boolean changesRequested =
                resolveAssessmentStatus(assessment) == AssessmentStatus.CHANGES_REQUESTED;
        if (request == null || request.getMaturityModelId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Maturity model is required to save a draft."
            );
        }
        if (!Objects.equals(assessment.getMaturityModelId(), request.getMaturityModelId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Draft does not belong to the requested maturity model."
            );
        }
        validateDraftRequest(request);
        if (changesRequested) {
            validateAcceptedResponsesUnchanged(assessment, request);
        }

        populateAssessmentRequestFields(assessment, request, null, participant);
        if (!changesRequested) {
            initializeDraftState(assessment);
        }
        Assessment savedAssessment = assessmentRepository.save(assessment);
        synchronizeQuestionResponses(savedAssessment, request, false, changesRequested);
        if (changesRequested) {
            applyRespondentUpdateMarkers(savedAssessment, request, false);
        }
        AssessmentResponse response = convertToResponse(savedAssessment, List.of());
        enrichModelMetadata(response);
        return response;
    }

    @Transactional
    public AssessmentResponse resetDraft(Long draftId, User user) {
        Assessment assessment = requireOwnedDraftForUpdate(draftId, user);
        dimensionResultRepository.deleteByAssessmentId(draftId);
        questionEvaluationRepository.deleteByAssessmentId(draftId);

        assessment.setEvaluatorInsight(null);
        initializeDraftState(assessment);

        Assessment savedAssessment = assessmentRepository.save(assessment);
        AssessmentResponse response = convertToResponse(savedAssessment, List.of());
        enrichModelMetadata(response);
        return response;
    }

    private void validateDraftRequest(AssessmentRequest request) {
        if (request == null || request.getMaturityModelId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maturity model is required to save a draft.");
        }
        maturityModelRepository.findById(request.getMaturityModelId())
                .orElseThrow(() -> new ResourceNotFoundException("Maturity model not found"));
        validateQuestionResponses(request);
        validateNumericResponses(request);
    }

    private void validateQuestionResponses(AssessmentRequest request) {
        if (request.getQuestionResponses() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "questionResponses is required; the legacy responses payload is no longer supported."
            );
        }

        Map<String, QuestionInfo> metadata = loadQuestionMetadata(request.getMaturityModelId());
        Set<Long> seenQuestionIds = new HashSet<>();
        for (Map.Entry<String, QuestionResponseRequest> entry : request.getQuestionResponses().entrySet()) {
            String responseKey = entry.getKey();
            QuestionResponseRequest submitted = entry.getValue();
            if (responseKey == null || responseKey.isBlank() || submitted == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question response entries cannot be empty.");
            }

            QuestionInfo question = metadata.get(responseKey);
            if (question == null || question.getQuestionId() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid question response key for this maturity model: " + responseKey
                );
            }
            if (!Objects.equals(question.getQuestionId(), submitted.getQuestionId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "questionId does not match response key: " + responseKey
                );
            }
            if (!seenQuestionIds.add(submitted.getQuestionId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Each question may only appear once in questionResponses."
                );
            }
            if (!isAnswered(submitted.getResponse())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Question response must contain an answer: " + responseKey
                );
            }
            if (submitted.getResponse() instanceof String text && text.length() > TextLimits.OPEN_ANSWER) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Open answer must be " + TextLimits.OPEN_ANSWER + " characters or fewer."
                );
            }
            TextLimits.requireAtMost(
                    submitted.getRespondentJustification(),
                    TextLimits.OPEN_ANSWER,
                    "Respondent justification for " + responseKey
            );
        }
    }

    private Map<String, Object> responseValues(AssessmentRequest request) {
        if (request == null || request.getQuestionResponses() == null) {
            return Map.of();
        }
        Map<String, Object> responses = new LinkedHashMap<>();
        request.getQuestionResponses().forEach((key, value) -> {
            if (value != null) {
                responses.put(key, value.getResponse());
            }
        });
        return responses;
    }

    private Map<String, Object> responseValues(List<QuestionEvaluation> rows) {
        Map<String, Object> responses = new LinkedHashMap<>();
        if (rows == null) {
            return responses;
        }
        for (QuestionEvaluation row : rows) {
            if (row.getResponseKey() != null && row.getResponse() != null) {
                responses.put(
                        row.getResponseKey(),
                        objectMapper.convertValue(row.getResponse(), Object.class)
                );
            }
        }
        return responses;
    }

    private void synchronizeQuestionResponses(
            Assessment assessment,
            AssessmentRequest request,
            boolean calculateInitialScores,
            boolean preserveReviewedRows
    ) {
        Map<String, QuestionResponseRequest> submitted = request.getQuestionResponses();
        Map<String, QuestionInfo> metadata = loadQuestionMetadata(request.getMaturityModelId());
        List<QuestionEvaluation> existingRows =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        Map<String, QuestionEvaluation> existingByKey = existingRows.stream()
                .collect(Collectors.toMap(
                        QuestionEvaluation::getResponseKey,
                        row -> row,
                        (left, right) -> right
                ));
        Map<Long, QuestionEvaluation> existingByQuestionId = existingRows.stream()
                .filter(row -> row.getQuestionId() != null)
                .collect(Collectors.toMap(
                        QuestionEvaluation::getQuestionId,
                        row -> row,
                        (left, right) -> right
                ));

        List<QuestionEvaluation> synchronizedRows = new ArrayList<>();
        Set<QuestionEvaluation> retainedRows =
                Collections.newSetFromMap(new IdentityHashMap<>());
        for (Map.Entry<String, QuestionResponseRequest> entry : submitted.entrySet()) {
            String responseKey = entry.getKey();
            QuestionResponseRequest submittedResponse = entry.getValue();
            QuestionInfo question = metadata.get(responseKey);
            QuestionEvaluation row = existingByKey.get(responseKey);
            if (row == null) {
                row = existingByQuestionId.getOrDefault(
                        submittedResponse.getQuestionId(),
                        new QuestionEvaluation()
                );
            }
            row.setAssessment(assessment);
            row.setResponseKey(responseKey);
            row.setQuestionId(question.getQuestionId());
            row.setResponse(objectMapper.valueToTree(submittedResponse.getResponse()));
            row.setRespondentJustification(normalizeRespondentJustification(
                    submittedResponse.getRespondentJustification()
            ));
            if (calculateInitialScores) {
                row.setInitialScore(
                        convertResponseToScore(submittedResponse.getResponse(), question)
                );
            } else if (row.getId() == null) {
                row.setInitialScore(null);
            }
            synchronizedRows.add(row);
            retainedRows.add(row);
        }

        if (preserveReviewedRows) {
            Set<String> respondentUpdatedKeys =
                    normalizedRespondentUpdatedKeys(request);
            existingRows.stream()
                    .filter(row -> !retainedRows.contains(row))
                    .filter(row -> row.getValidationStatus() != null)
                    .forEach(row -> {
                        if (respondentUpdatedKeys.contains(row.getResponseKey())
                                && row.getValidationStatus()
                                != QuestionEvaluationStatus.ACCEPTED) {
                            row.setResponse(null);
                            row.setRespondentJustification(null);
                            synchronizedRows.add(row);
                        }
                        retainedRows.add(row);
                    });
        }

        List<QuestionEvaluation> removedRows = existingRows.stream()
                .filter(row -> !retainedRows.contains(row))
                .filter(row -> !preserveReviewedRows
                        || row.getValidationStatus() == null)
                .toList();
        if (!removedRows.isEmpty()) {
            questionEvaluationRepository.deleteAll(removedRows);
        }
        if (!synchronizedRows.isEmpty()) {
            questionEvaluationRepository.saveAll(synchronizedRows);
        }
    }

    private String normalizeRespondentJustification(String justification) {
        if (justification == null) {
            return null;
        }
        String trimmed = justification.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Assessment requireOwnedRespondentAssessmentForUpdate(Long draftId, User user) {
        Assessment assessment = assessmentRepository.findByIdForUpdate(draftId)
                .orElseThrow(() -> new ResourceNotFoundException("Draft assessment not found"));
        if (assessment.getUser() == null
                || user == null
                || user.getId() == null
                || !assessment.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to modify this draft.");
        }
        AssessmentStatus status = resolveAssessmentStatus(assessment);
        if (status != AssessmentStatus.DRAFT
                && status != AssessmentStatus.CHANGES_REQUESTED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only a draft or returned assessment can be modified."
            );
        }
        return assessment;
    }

    private Assessment requireCampaignRespondentAssessmentForUpdate(
            CampaignParticipant participant
    ) {
        if (participant == null || participant.getId() == null
                || participant.getAssessment() == null
                || participant.getAssessment().getId() == null) {
            throw new ResourceNotFoundException("Campaign assessment not found");
        }
        Assessment assessment = assessmentRepository
                .findCampaignAssessmentByIdForUpdate(
                        participant.getAssessment().getId(),
                        participant.getId()
                )
                .orElseThrow(() -> new ResourceNotFoundException("Campaign assessment not found"));
        AssessmentStatus status = resolveAssessmentStatus(assessment);
        if (status != AssessmentStatus.DRAFT
                && status != AssessmentStatus.CHANGES_REQUESTED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only a draft or returned assessment can be modified."
            );
        }
        return assessment;
    }

    private Assessment requireOwnedDraftForUpdate(Long draftId, User user) {
        Assessment assessment =
                requireOwnedRespondentAssessmentForUpdate(draftId, user);
        if (resolveAssessmentStatus(assessment) != AssessmentStatus.DRAFT) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only a draft assessment can be reset."
            );
        }
        return assessment;
    }

    private void validateAcceptedResponsesUnchanged(
            Assessment assessment,
            AssessmentRequest request
    ) {
        Map<String, QuestionResponseRequest> submitted =
                request.getQuestionResponses() != null
                        ? request.getQuestionResponses()
                        : Map.of();
        for (QuestionEvaluation row :
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessment.getId())) {
            if (row.getValidationStatus() != QuestionEvaluationStatus.ACCEPTED) {
                continue;
            }
            QuestionResponseRequest candidate = submitted.get(row.getResponseKey());
            boolean sameResponse = row.getResponse() == null
                    ? candidate == null
                    : candidate != null
                    && Objects.equals(
                            row.getResponse(),
                            objectMapper.valueToTree(candidate.getResponse())
                    );
            boolean sameJustification = candidate == null
                    ? row.getRespondentJustification() == null
                    : Objects.equals(
                            normalizeRespondentJustification(row.getRespondentJustification()),
                            normalizeRespondentJustification(candidate.getRespondentJustification())
                    );
            if (!sameResponse || !sameJustification) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Accepted responses cannot be changed: " + row.getResponseKey()
                );
            }
        }
    }

    private void requireAllFlaggedResponsesUpdated(
            Assessment assessment,
            AssessmentRequest request
    ) {
        Set<String> updatedKeys = normalizedRespondentUpdatedKeys(request);
        List<String> unresolved = questionEvaluationRepository
                .findByAssessmentIdOrderByIdAsc(assessment.getId())
                .stream()
                .filter(row -> row.getValidationStatus() == QuestionEvaluationStatus.FLAGGED)
                .filter(row -> !Boolean.TRUE.equals(row.getRespondentUpdated())
                        && !updatedKeys.contains(row.getResponseKey()))
                .map(QuestionEvaluation::getResponseKey)
                .toList();
        if (!unresolved.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Every flagged item must be updated before resubmission: "
                            + String.join(", ", unresolved)
            );
        }
    }

    private void applyRespondentUpdateMarkers(
            Assessment assessment,
            AssessmentRequest request,
            boolean finalizeResubmission
    ) {
        Set<String> updatedKeys = normalizedRespondentUpdatedKeys(request);
        List<QuestionEvaluation> rows =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        for (QuestionEvaluation row : rows) {
            if (updatedKeys.contains(row.getResponseKey())
                    && row.getValidationStatus() != QuestionEvaluationStatus.ACCEPTED) {
                row.setRespondentUpdated(true);
            }
            if (finalizeResubmission
                    && Boolean.TRUE.equals(row.getRespondentUpdated())
                    && row.getValidationStatus() != QuestionEvaluationStatus.ACCEPTED) {
                row.setValidationStatus(null);
            }
        }
        if (!rows.isEmpty()) {
            questionEvaluationRepository.saveAll(rows);
        }
    }

    private Set<String> normalizedRespondentUpdatedKeys(AssessmentRequest request) {
        if (request == null || request.getRespondentUpdatedResponseKeys() == null) {
            return Set.of();
        }
        return request.getRespondentUpdatedResponseKeys().stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(key -> !key.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private void initializeDraftState(Assessment assessment) {
        transitionTo(assessment, AssessmentStatus.DRAFT);
        assessment.setOverallAverage(0.0);
        assessment.setOverallPercentageScore(0.0);
        assessment.setOverallMaturityLevel("Draft");
    }

    private void validateNumericResponses(AssessmentRequest request) {
        Map<String, Object> responses = responseValues(request);
        Map<String, QuestionInfo> metadata = loadQuestionMetadata(request.getMaturityModelId());

        for (Map.Entry<String, Object> entry : responses.entrySet()) {
            QuestionInfo question = metadata.get(entry.getKey());
            if (entry.getValue() instanceof String text && text.length() > TextLimits.OPEN_ANSWER) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Open answer must be " + TextLimits.OPEN_ANSWER + " characters or fewer.");
            }
            if (question == null
                    || (!"numeric".equalsIgnoreCase(question.getType())
                    && !"percentage".equalsIgnoreCase(question.getType()))) {
                continue;
            }

            double value;
            try {
                value = entry.getValue() instanceof Number
                        ? ((Number) entry.getValue()).doubleValue()
                        : Double.parseDouble(String.valueOf(entry.getValue()));
            } catch (NumberFormatException exception) {
                throw invalidNumericResponse(entry.getKey(), "must be a number.");
            }

            if (!Double.isFinite(value) || question.getRangeMin() >= question.getRangeMax()) {
                throw invalidNumericResponse(entry.getKey(), "does not have a valid configured range.");
            }
            if (value != Math.rint(value)) {
                throw invalidNumericResponse(entry.getKey(), "must be an integer.");
            }

            int min = question.getRangeMin();
            int max = question.getRangeMax();
            if (value < min || value > max) {
                throw invalidNumericResponse(
                        entry.getKey(),
                        "must be between " + min + " and " + max + ".");
            }
        }
    }

    private IllegalOperationException invalidNumericResponse(String responseKey, String detail) {
        return new IllegalOperationException(
                "INVALID_NUMERIC_RESPONSE",
                "Response for question '" + responseKey + "' " + detail);
    }

    private Assessment getOrCreateDraftAssessment(User user, Long maturityModelId) {
        User lockedUser = lockUserForDraftCreation(user);
        return assessmentRepository
                .findByUserIdAndMaturityModelIdAndStatus(
                        lockedUser.getId(),
                        maturityModelId,
                        AssessmentStatus.DRAFT
                )
                .orElseGet(Assessment::new);
    }

    private User lockUserForDraftCreation(User user) {
        if (user == null || user.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated.");
        }
        return userRepository.findByIdForUpdate(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated."));
    }

    private void populateAssessmentRequestFields(
            Assessment assessment,
            AssessmentRequest request,
            User user,
            CampaignParticipant campaignParticipant
    ) {
        assessment.setUser(user);
        assessment.setMaturityModelId(request.getMaturityModelId());
        if (campaignParticipant != null) {
            assessment.setCampaign(campaignParticipant.getCampaign());
            assessment.setCampaignParticipant(campaignParticipant);
        }
    }

    public List<AssessmentResponse> getDraftsByUser(User user) {
        List<Assessment> assessments = assessmentRepository
                .findByUserIdAndStatusOrderByUpdatedAtDescIdDesc(user.getId(), AssessmentStatus.DRAFT);
        List<AssessmentResponse> responses = assessments.stream()
                .map(assessment -> convertToResponse(assessment, List.of()))
                .collect(Collectors.toList());
        applyModelMetadata(responses);
        return responses;
    }

    public AssessmentResponse getDraftByMaturityModel(Long maturityModelId, User user) {
        Assessment assessment = assessmentRepository
                .findByUserIdAndMaturityModelIdAndStatus(user.getId(), maturityModelId, AssessmentStatus.DRAFT)
                .orElseThrow(() -> new ResourceNotFoundException("Draft assessment not found"));
        AssessmentResponse response = convertToResponse(assessment, List.of());
        enrichModelMetadata(response);
        return response;
    }

    public List<AssessmentResponse> getDraftsByMaturityModelLineage(Long maturityModelId, User user) {
        MaturityModel selectedModel = maturityModelRepository.findById(maturityModelId)
                .orElseThrow(() -> new ResourceNotFoundException("Maturity model not found"));
        Long lineageRootId = selectedModel.getBaseModelId() != null
                ? selectedModel.getBaseModelId()
                : selectedModel.getId();

        Set<Long> lineageModelIds = maturityModelRepository
                .findByBaseModelIdOrderByVersionAsc(lineageRootId)
                .stream()
                .map(MaturityModel::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        lineageModelIds.add(selectedModel.getId());

        List<AssessmentResponse> responses = assessmentRepository
                .findByUserIdAndStatusAndMaturityModelIdInOrderByUpdatedAtDescIdDesc(
                        user.getId(),
                        AssessmentStatus.DRAFT,
                        lineageModelIds
                )
                .stream()
                .map(assessment -> convertToResponse(assessment, List.of()))
                .collect(Collectors.toList());
        applyModelMetadata(responses);
        return responses;
    }

    public List<AssessmentResponse> getAssessmentsByUser(User user) {
        List<Assessment> assessments = assessmentRepository.findByUserIdOrderByCreatedAtDescIdDesc(user.getId());
        List<AssessmentResponse> list = assessments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
        applyModelMetadata(list);
        return list;
    }

    public List<AssessmentResponse> getAllAssessments() {
        List<Assessment> assessments = assessmentRepository.findAllWithUser();
        List<AssessmentResponse> list = assessments.stream()
                .map(this::convertToResponseWithUserInfo)
                .collect(Collectors.toList());
        applyModelMetadata(list);
        return list;
    }

    public AssessmentResponse getAssessmentById(Long id, User user) {
        // Allow CURATOR and ADMIN to access any assessment, regular users can only access their own
        boolean isCuratorOrAdmin = RoleUtils.hasRequiredRole(user.getRole(), UserRole.CURATOR);
        
        Assessment assessment;
        if (isCuratorOrAdmin) {
            // Load with user info for CURATOR/ADMIN
            assessment = assessmentRepository.findByIdWithUser(id)
                    .orElseThrow(() -> new RuntimeException("Assessment not found"));
        } else {
            // Regular users - check ownership
            assessment = assessmentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Assessment not found"));
            
            if (assessment.getUser() == null
                    || !assessment.getUser().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
            }
        }

        // Include user info if accessed by CURATOR/ADMIN
        if (isCuratorOrAdmin) {
            AssessmentResponse response = convertToResponseWithUserInfo(assessment);
            enrichModelMetadata(response);
            return response;
        }

        AssessmentResponse response = convertToResponse(assessment);
        enrichModelMetadata(response);
        return response;
    }

    public List<AssessmentResponse> getPendingReviewAssessments() {
        List<Assessment> assessments = assessmentRepository.findByStatusOrderByUpdatedAtDescIdDesc(AssessmentStatus.PENDING_REVIEW);
        List<AssessmentResponse> list = assessments.stream()
                .map(this::convertToResponseWithUserInfo)
                .collect(Collectors.toList());
        applyModelMetadata(list);
        return list;
    }

    @Transactional
    public AssessmentResponse completeAssessment(Long id, ManualEvaluationRequest request, User user) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        requirePendingReview(assessment);
        List<QuestionEvaluation> persistedRows =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        List<Evidence> persistedEvidence =
                evidenceRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        Map<String, Object> persistedResponses = responseValues(persistedRows);
        boolean hasReviewableContent = persistedResponses.values().stream()
                .anyMatch(this::isAnswered)
                || !persistedEvidence.isEmpty();
        if (hasReviewableContent) {
            Map<String, QuestionInfo> questionMetadata =
                    loadQuestionMetadata(assessment.getMaturityModelId());
            Set<String> requiredReviewKeys = determineRequiredReviewKeys(
                    assessment.getId(),
                    questionMetadata,
                    persistedResponses
            );
            if (!requiredReviewKeys.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "All answered questions and evidence items must be classified before finishing the assessment."
                );
            }
        }

        TextLimits.requireAtMost(request != null ? request.getEvaluatorInsight() : null,
                TextLimits.DESCRIPTION, "Evaluator insight");
        assessment.setEvaluatorInsight(normalizeEvaluatorInsight(
                request != null ? request.getEvaluatorInsight() : null
        ));
        transitionTo(assessment, AssessmentStatus.COMPLETED);
        Assessment savedAssessment = assessmentRepository.save(assessment);

        AssessmentResponse response = convertToResponse(savedAssessment);
        enrichModelMetadata(response);
        return response;
    }

    @Transactional
    public AssessmentResponse evaluateAssessment(Long id, ManualEvaluationRequest request, User user) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        requirePendingReview(assessment);

        Map<String, Double> manualScores = request != null && request.getManualScores() != null
                ? request.getManualScores()
                : Collections.emptyMap();
        Map<String, QuestionEvaluationRequest> questionEvaluationRequests =
                request != null && request.getQuestionEvaluations() != null
                        ? request.getQuestionEvaluations()
                        : Collections.emptyMap();

        if (manualScores.isEmpty() && questionEvaluationRequests.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one question evaluation is required.");
        }

        Long maturityModelId = assessment.getMaturityModelId();
        if (maturityModelId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assessment is missing maturity model reference.");
        }
        if (checkIfMaturityModelIsAutoEvaluated(maturityModelId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Evaluator insights and manual evaluation are only available for non-auto-evaluated maturity models."
            );
        }

        TextLimits.requireAtMost(request != null ? request.getEvaluatorInsight() : null,
                TextLimits.DESCRIPTION, "Evaluator insight");
        String evaluatorInsight = normalizeEvaluatorInsight(
                request != null ? request.getEvaluatorInsight() : null
        );

        List<QuestionEvaluation> persistedQuestionRows =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        Map<String, Object> responses = responseValues(persistedQuestionRows);

        Map<String, QuestionInfo> questionMetadata = loadQuestionMetadata(maturityModelId);
        int manualMaxLevel = questionMetadata.values().stream()
                .mapToInt(QuestionInfo::getMaxLevelNumber)
                .max()
                .orElse(maturityScoringService.getMaxLevelNumber());

        EvaluationSubmission evaluationSubmission = questionEvaluationRequests.isEmpty()
                ? buildLegacyEvaluationSubmission(assessment, manualScores, questionMetadata, responses, manualMaxLevel)
                : buildStrictEvaluationSubmission(
                        assessment,
                        questionEvaluationRequests,
                        questionMetadata,
                        responses,
                        manualMaxLevel
                );

        Map<String, Double> effectiveScores = persistedQuestionRows.stream()
                .filter(row -> row.getInitialScore() != null)
                .collect(Collectors.toMap(
                        QuestionEvaluation::getResponseKey,
                        QuestionEvaluation::getInitialScore,
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
        effectiveScores.putAll(evaluationSubmission.scoreOverrides);

        List<DimensionResult> recalculatedDimensionResults =
                calculateDimensionResultsFromScores(effectiveScores, maturityModelId);

        MaturityModel evalModel = maturityModelRepository.findById(maturityModelId).orElse(null);
        int maxLevelNumber = evalModel != null
                ? maturityScoringService.resolveMaxLevelNumber(evalModel.getLevels())
                : maturityScoringService.getMaxLevelNumber();
        List<MaturityLevel> evalModelLevels = evalModel != null ? evalModel.getLevels() : null;

        double overallAverage = calculateOverallScore(recalculatedDimensionResults, evalModel);

        double overallPercentage = maturityScoringService.normalizeToPercentage(overallAverage, maxLevelNumber);
        int overallLevelNumber = maturityScoringService.mapScoreToLevel(overallPercentage, maxLevelNumber);
        String overallMaturityLevelName = maturityScoringService.getLevelName(overallLevelNumber, evalModelLevels);

        assessment.setOverallAverage(overallAverage);
        assessment.setOverallPercentageScore(overallPercentage);
        assessment.setOverallMaturityLevel(overallMaturityLevelName);
        transitionTo(assessment, AssessmentStatus.COMPLETED);
        assessment.setEvaluatorInsight(evaluatorInsight);

        Assessment savedAssessment = assessmentRepository.save(assessment);

        mergeReviewerEvaluations(savedAssessment, evaluationSubmission.evaluations);

        dimensionResultRepository.deleteByAssessmentId(savedAssessment.getId());
        recalculatedDimensionResults.forEach(result -> result.setAssessment(savedAssessment));
        dimensionResultRepository.saveAll(recalculatedDimensionResults);

        AssessmentResponse response = convertToResponse(savedAssessment, recalculatedDimensionResults);
        enrichModelMetadata(response);
        return response;
    }

    @Transactional
    public AssessmentResponse saveEvaluationProgress(Long id, ManualEvaluationRequest request, User user) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        requirePendingReview(assessment);
        requireManualEvaluationModel(assessment);

        Map<String, QuestionEvaluationRequest> requestedEvaluations =
                request != null && request.getQuestionEvaluations() != null
                        ? request.getQuestionEvaluations()
                        : Collections.emptyMap();
        if (requestedEvaluations.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one question review is required to save evaluation progress."
            );
        }

        TextLimits.requireAtMost(request.getEvaluatorInsight(),
                TextLimits.DESCRIPTION, "Evaluator insight");

        List<QuestionEvaluation> persistedRows =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        Map<String, Object> responses = responseValues(persistedRows);
        Map<String, QuestionInfo> questionMetadata = loadQuestionMetadata(assessment.getMaturityModelId());
        int manualMaxLevel = questionMetadata.values().stream()
                .mapToInt(QuestionInfo::getMaxLevelNumber)
                .max()
                .orElse(maturityScoringService.getMaxLevelNumber());

        EvaluationSubmission progress = buildEvaluationSubmission(
                assessment,
                requestedEvaluations,
                questionMetadata,
                responses,
                manualMaxLevel,
                false
        );
        mergeReviewerEvaluations(assessment, progress.evaluations);
        assessment.setEvaluatorInsight(normalizeEvaluatorInsight(request.getEvaluatorInsight()));
        Assessment savedAssessment = assessmentRepository.save(assessment);

        AssessmentResponse response = convertToResponse(savedAssessment);
        enrichModelMetadata(response);
        return response;
    }

    @Transactional
    public AssessmentResponse finishEvaluation(Long id, ManualEvaluationRequest request, User user) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        requirePendingReview(assessment);
        requireManualEvaluationModel(assessment);

        List<QuestionEvaluation> persistedRows =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        Map<String, Object> responses = responseValues(persistedRows);
        Map<String, QuestionInfo> questionMetadata = loadQuestionMetadata(assessment.getMaturityModelId());
        Set<String> requiredReviewKeys = determineRequiredReviewKeys(
                assessment.getId(),
                questionMetadata,
                responses
        );

        String evaluatorInsight = request != null ? request.getEvaluatorInsight() : null;
        if (requiredReviewKeys.isEmpty()) {
            ManualEvaluationRequest completionRequest = new ManualEvaluationRequest();
            completionRequest.setEvaluatorInsight(evaluatorInsight);
            return completeAssessment(id, completionRequest, user);
        }

        Map<String, QuestionEvaluationRequest> persistedReviews = new LinkedHashMap<>();
        for (QuestionEvaluation row : persistedRows) {
            if (!requiredReviewKeys.contains(row.getResponseKey())) {
                continue;
            }
            QuestionEvaluationRequest persistedReview = new QuestionEvaluationRequest();
            persistedReview.setQuestionId(row.getQuestionId());
            persistedReview.setValidationStatus(
                    row.getValidationStatus() != null ? row.getValidationStatus().name() : null
            );
            persistedReview.setManualScore(row.getManualScore());
            persistedReview.setReviewerNote(row.getReviewerNote());
            persistedReviews.put(row.getResponseKey(), persistedReview);
        }

        ManualEvaluationRequest finishRequest = new ManualEvaluationRequest();
        finishRequest.setQuestionEvaluations(persistedReviews);
        finishRequest.setEvaluatorInsight(evaluatorInsight);
        return evaluateAssessment(id, finishRequest, user);
    }

    @Transactional
    public AssessmentResponse sendEvaluationBack(Long id, ManualEvaluationRequest request, User user) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        requirePendingReview(assessment);
        requireManualEvaluationModel(assessment);

        List<QuestionEvaluation> persistedRows =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        List<QuestionEvaluation> flaggedRows = persistedRows.stream()
                .filter(row -> row.getValidationStatus() == QuestionEvaluationStatus.FLAGGED)
                .toList();
        if (flaggedRows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one flagged question or evidence item with a reviewer note is required."
            );
        }
        if (flaggedRows.stream().anyMatch(row -> row.getReviewerNote() == null
                || row.getReviewerNote().isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Every flagged question or evidence item requires a reviewer note before sending it back."
            );
        }
        flaggedRows.forEach(row -> row.setRespondentUpdated(false));
        questionEvaluationRepository.saveAll(flaggedRows);

        String evaluatorInsight = request != null ? request.getEvaluatorInsight() : null;
        TextLimits.requireAtMost(evaluatorInsight, TextLimits.DESCRIPTION, "Evaluator insight");
        assessment.setEvaluatorInsight(normalizeEvaluatorInsight(evaluatorInsight));
        transitionTo(assessment, AssessmentStatus.CHANGES_REQUESTED);
        Assessment savedAssessment = assessmentRepository.save(assessment);

        AssessmentResponse response = convertToResponse(savedAssessment);
        enrichModelMetadata(response);
        return response;
    }

    private void requireManualEvaluationModel(Assessment assessment) {
        Long maturityModelId = assessment.getMaturityModelId();
        if (maturityModelId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Assessment is missing maturity model reference."
            );
        }
        if (checkIfMaturityModelIsAutoEvaluated(maturityModelId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Evaluator insights and manual evaluation are only available for non-auto-evaluated maturity models."
            );
        }
    }

    private static class EvaluationSubmission {
        private final List<QuestionEvaluation> evaluations;
        private final Map<String, Double> scoreOverrides;

        private EvaluationSubmission(
                List<QuestionEvaluation> evaluations,
                Map<String, Double> scoreOverrides
        ) {
            this.evaluations = evaluations;
            this.scoreOverrides = scoreOverrides;
        }
    }

    private void mergeReviewerEvaluations(
            Assessment assessment,
            List<QuestionEvaluation> submittedEvaluations
    ) {
        List<QuestionEvaluation> existingRows =
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessment.getId());
        Map<String, QuestionEvaluation> existingByKey = existingRows.stream()
                .collect(Collectors.toMap(
                        QuestionEvaluation::getResponseKey,
                        row -> row,
                        (left, right) -> right
                ));
        Map<Long, QuestionEvaluation> existingByQuestionId = existingRows.stream()
                .filter(row -> row.getQuestionId() != null)
                .collect(Collectors.toMap(
                        QuestionEvaluation::getQuestionId,
                        row -> row,
                        (left, right) -> right
                ));
        List<QuestionEvaluation> rowsToSave = new ArrayList<>();
        for (QuestionEvaluation submitted : submittedEvaluations) {
            QuestionEvaluation persisted = existingByKey.get(submitted.getResponseKey());
            if (persisted == null) {
                persisted = existingByQuestionId.getOrDefault(
                        submitted.getQuestionId(),
                        new QuestionEvaluation()
                );
            }
            persisted.setAssessment(assessment);
            persisted.setResponseKey(submitted.getResponseKey());
            persisted.setQuestionId(submitted.getQuestionId());
            persisted.setValidationStatus(submitted.getValidationStatus());
            persisted.setManualScore(submitted.getManualScore());
            persisted.setReviewerNote(submitted.getReviewerNote());
            rowsToSave.add(persisted);
        }
        if (!rowsToSave.isEmpty()) {
            questionEvaluationRepository.saveAll(rowsToSave);
        }
    }

    private EvaluationSubmission buildLegacyEvaluationSubmission(
            Assessment assessment,
            Map<String, Double> manualScores,
            Map<String, QuestionInfo> questionMetadata,
            Map<String, Object> responses,
            int manualMaxLevel
    ) {
        List<QuestionEvaluation> evaluations = new ArrayList<>();
        Map<String, Double> scoreOverrides = new HashMap<>();

        for (Map.Entry<String, Double> entry : manualScores.entrySet()) {
            String responseKey = entry.getKey();
            Double score = entry.getValue();

            QuestionInfo questionInfo = requireQuestionInfo(questionMetadata, responseKey);
            validateManualScoreKeyAndRange(responseKey, score, manualMaxLevel, questionInfo);
            if (!isEligibleForManualEvaluation(questionInfo, responses.get(responseKey))) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Question is not eligible for manual evaluation: " + responseKey
                );
            }

            QuestionEvaluation evaluation = new QuestionEvaluation();
            evaluation.setAssessment(assessment);
            evaluation.setResponseKey(responseKey);
            evaluation.setQuestionId(questionInfo.getQuestionId());
            evaluation.setValidationStatus(QuestionEvaluationStatus.ACCEPTED);
            evaluation.setManualScore(score);
            evaluations.add(evaluation);
            scoreOverrides.put(responseKey, score);
        }

        return new EvaluationSubmission(evaluations, scoreOverrides);
    }

    private EvaluationSubmission buildStrictEvaluationSubmission(
            Assessment assessment,
            Map<String, QuestionEvaluationRequest> requestedEvaluations,
            Map<String, QuestionInfo> questionMetadata,
            Map<String, Object> responses,
            int manualMaxLevel
    ) {
        return buildEvaluationSubmission(
                assessment,
                requestedEvaluations,
                questionMetadata,
                responses,
                manualMaxLevel,
                true
        );
    }

    private EvaluationSubmission buildEvaluationSubmission(
            Assessment assessment,
            Map<String, QuestionEvaluationRequest> requestedEvaluations,
            Map<String, QuestionInfo> questionMetadata,
            Map<String, Object> responses,
            int manualMaxLevel,
            boolean requireComplete
    ) {
        Set<String> requiredReviewKeys = determineRequiredReviewKeys(
                assessment.getId(),
                questionMetadata,
                responses
        );
        List<QuestionEvaluation> evaluations = new ArrayList<>();
        Map<String, Double> scoreOverrides = new HashMap<>();

        if (requireComplete) {
            for (String requiredKey : requiredReviewKeys) {
                if (!requestedEvaluations.containsKey(requiredKey)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Question must be reviewed before submission: " + requiredKey
                    );
                }
            }
        }

        for (Map.Entry<String, QuestionEvaluationRequest> entry : requestedEvaluations.entrySet()) {
            String responseKey = entry.getKey();
            if (responseKey == null || responseKey.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question evaluation key cannot be empty.");
            }
            if (!requiredReviewKeys.contains(responseKey)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Question is not part of the review scope: " + responseKey
                );
            }

            QuestionInfo questionInfo = requireQuestionInfo(questionMetadata, responseKey);
            QuestionEvaluationRequest requested = entry.getValue();
            if (requested == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Question evaluation payload cannot be empty: " + responseKey
                );
            }

            QuestionEvaluationStatus status = requireComplete
                    ? parseEvaluationStatus(requested.getValidationStatus(), responseKey)
                    : parseOptionalEvaluationStatus(requested.getValidationStatus(), responseKey);
            if (requireComplete && status == QuestionEvaluationStatus.FLAGGED) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Flagged questions or evidence items must be resolved or sent back before finishing: "
                                + responseKey
                );
            }
            if (requested.getQuestionId() != null
                    && !Objects.equals(requested.getQuestionId(), questionInfo.getQuestionId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "questionId does not match evaluation key: " + responseKey
                );
            }
            Double manualScore = requested.getManualScore();
            String reviewerNote = normalizeReviewerNote(requested.getReviewerNote(), responseKey);
            boolean manualScoreRequired = status == QuestionEvaluationStatus.ADJUSTED
                    || ("open_answer".equals(questionInfo.getType()) && isAnswered(responses.get(responseKey)));

            if (requireComplete && manualScoreRequired) {
                validateManualScoreKeyAndRange(responseKey, manualScore, manualMaxLevel, questionInfo);
            } else if (manualScore != null) {
                validateManualScoreKeyAndRange(responseKey, manualScore, manualMaxLevel, questionInfo);
            }

            if (requireComplete
                    && status == QuestionEvaluationStatus.ADJUSTED
                    && reviewerNote == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Adjusted questions require a reviewer note: " + responseKey
                );
            }
            if (requireComplete
                    && status == QuestionEvaluationStatus.FLAGGED
                    && reviewerNote == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Flagged questions require a reviewer note: " + responseKey
                );
            }

            QuestionEvaluation evaluation = new QuestionEvaluation();
            evaluation.setAssessment(assessment);
            evaluation.setResponseKey(responseKey);
            evaluation.setQuestionId(questionInfo.getQuestionId());
            evaluation.setValidationStatus(status);
            evaluation.setManualScore(manualScore);
            evaluation.setReviewerNote(reviewerNote);
            evaluations.add(evaluation);

            if (manualScore != null) {
                scoreOverrides.put(responseKey, manualScore);
            }
        }

        return new EvaluationSubmission(evaluations, scoreOverrides);
    }

    private Set<String> determineRequiredReviewKeys(
            Long assessmentId,
            Map<String, QuestionInfo> questionMetadata,
            Map<String, Object> responses
    ) {
        Set<String> requiredKeys = new LinkedHashSet<>();
        Map<Long, String> responseKeyByQuestionId = new HashMap<>();
        questionMetadata.forEach((responseKey, questionInfo) -> {
            if (questionInfo.getQuestionId() != null) {
                responseKeyByQuestionId.put(questionInfo.getQuestionId(), responseKey);
            }
        });

        responses.forEach((responseKey, value) -> {
            if (questionMetadata.containsKey(responseKey) && isAnswered(value)) {
                requiredKeys.add(responseKey);
            }
        });
        for (Evidence item : evidenceRepository.findByAssessmentIdOrderByIdAsc(assessmentId)) {
            if (item.getQuestion() != null && item.getQuestion().getId() != null) {
                String responseKey = responseKeyByQuestionId.get(item.getQuestion().getId());
                if (responseKey != null) {
                    requiredKeys.add(responseKey);
                }
            }
        }

        return requiredKeys;
    }

    private void validateManualScoreKeyAndRange(
            String responseKey,
            Double score,
            int manualMaxLevel,
            QuestionInfo questionInfo
    ) {
        if (responseKey == null || responseKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manual score key cannot be empty.");
        }
        if (questionInfo != null && "boolean".equalsIgnoreCase(questionInfo.getType())) {
            if (score == null || (Double.compare(score, 0.0) != 0 && Double.compare(score, 1.0) != 0)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Manual results for Boolean questions must be 0 or 1."
                );
            }
            return;
        }
        if (questionInfo != null && "multiple_choice".equalsIgnoreCase(questionInfo.getType())) {
            Set<Double> allowed = questionInfo.getMultipleChoiceAllowedScores();
            boolean configuredScore = score != null && Double.isFinite(score)
                    && score >= 0.0 && score <= 1.0
                    && (allowed == null || allowed.isEmpty()
                    || allowed.stream().anyMatch(configured -> Math.abs(configured - score) <= 1e-9));
            if (!configuredScore) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Manual results for Multiple-choice questions must match a configured option score."
                );
            }
            return;
        }
        if (questionInfo != null && ("likert".equalsIgnoreCase(questionInfo.getType())
                || "numeric".equalsIgnoreCase(questionInfo.getType())
                || "percentage".equalsIgnoreCase(questionInfo.getType()))) {
            if (score == null || !Double.isFinite(score) || score < 0.0 || score > 1.0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Manual results for Scale, Numeric, and Percentage questions must be normalized between 0 and 1."
                );
            }
            return;
        }
        if (questionInfo != null && "open_answer".equalsIgnoreCase(questionInfo.getType())) {
            if (score == null || !Double.isFinite(score) || score != Math.rint(score)
                    || score < 1 || score > manualMaxLevel) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Open Answer scores must select an integer maturity level between 1 and "
                                + manualMaxLevel + "."
                );
            }
            return;
        }
        if (score == null || !Double.isFinite(score) || score != Math.rint(score)
                || score < 1 || score > manualMaxLevel) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Manual scores must be between 1 and " + manualMaxLevel + " for this maturity model."
            );
        }
    }

    private QuestionInfo requireQuestionInfo(Map<String, QuestionInfo> questionMetadata, String responseKey) {
        QuestionInfo questionInfo = questionMetadata.get(responseKey);
        if (questionInfo == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid question key for manual evaluation: " + responseKey
            );
        }
        return questionInfo;
    }

    private QuestionEvaluationStatus parseEvaluationStatus(String rawStatus, String responseKey) {
        if (rawStatus == null || rawStatus.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Question evaluation status is required: " + responseKey
            );
        }
        try {
            return QuestionEvaluationStatus.valueOf(rawStatus.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Question evaluation status must be ACCEPTED, ADJUSTED, or FLAGGED: " + responseKey
            );
        }
    }

    private QuestionEvaluationStatus parseOptionalEvaluationStatus(String rawStatus, String responseKey) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return null;
        }
        return parseEvaluationStatus(rawStatus, responseKey);
    }

    private String normalizeReviewerNote(String reviewerNote, String responseKey) {
        TextLimits.requireAtMost(reviewerNote, TextLimits.DESCRIPTION, "Reviewer note for " + responseKey);
        if (reviewerNote == null) {
            return null;
        }
        String trimmed = reviewerNote.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public Map<String, Object> getOpenAnswerQuestions(Long assessmentId, User user) {
        assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));
        return responseValues(
                questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessmentId)
        );
    }

    public void deleteAssessment(Long id, User user) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        boolean isCuratorOrAdmin = RoleUtils.hasRequiredRole(user.getRole(), UserRole.CURATOR);
        boolean isOwner = assessment.getUser() != null
                && assessment.getUser().getId().equals(user.getId());

        if (!isCuratorOrAdmin && !isOwner) {
            throw new RuntimeException("Access denied");
        }

        // Delete assessment (cascade will automatically delete related DimensionResults)
        assessmentRepository.delete(assessment);
    }

    @Transactional(readOnly = true)
    private List<DimensionResult> calculateDimensionResults(Map<String, Object> responses, Long maturityModelId) {
        Map<String, QuestionInfo> questionMetadata = loadQuestionMetadata(maturityModelId);
        Map<String, Double> scoredResponses = new HashMap<>();
        Map<String, QuestionInfo> dimensionMetadata = new HashMap<>();

        for (Map.Entry<String, Object> entry : Optional.ofNullable(responses).orElse(Map.of()).entrySet()) {
            String responseKey = entry.getKey();
            QuestionInfo questionInfo = questionMetadata.get(responseKey);
            if (questionInfo == null) {
                continue;
            }
            Double score = convertResponseToScore(entry.getValue(), questionInfo);
            if (score != null) {
                scoredResponses.put(responseKey, score);
                dimensionMetadata.put(responseKey, questionInfo);
            }
        }
        return aggregateDimensionResults(scoredResponses, dimensionMetadata, maturityModelId);
    }

    @Transactional(readOnly = true)
    private List<DimensionResult> calculateDimensionResultsFromScores(
            Map<String, Double> scores,
            Long maturityModelId
    ) {
        Map<String, QuestionInfo> questionMetadata = loadQuestionMetadata(maturityModelId);
        Map<String, Double> validScores = new LinkedHashMap<>();
        Map<String, QuestionInfo> dimensionMetadata = new HashMap<>();
        Optional.ofNullable(scores).orElse(Map.of()).forEach((responseKey, score) -> {
            QuestionInfo questionInfo = questionMetadata.get(responseKey);
            if (questionInfo != null && score != null) {
                validScores.put(responseKey, score);
                dimensionMetadata.put(responseKey, questionInfo);
            }
        });
        return aggregateDimensionResults(validScores, dimensionMetadata, maturityModelId);
    }

    private List<DimensionResult> aggregateDimensionResults(
            Map<String, Double> scoredResponses,
            Map<String, QuestionInfo> dimensionMetadata,
            Long maturityModelId
    ) {
        MaturityModel model = maturityModelId != null
                ? maturityModelRepository.findById(maturityModelId).orElse(null)
                : null;
        int finalMaxLevel = model != null
                ? maturityScoringService.resolveMaxLevelNumber(model.getLevels())
                : maturityScoringService.getMaxLevelNumber();
        List<MaturityLevel> modelLevelsForNames = model != null ? model.getLevels() : null;

        Map<PracticeKey, List<ScoreNode>> questionNodes = new LinkedHashMap<>();
        Map<PracticeKey, Double> practiceWeights = new HashMap<>();
        Map<PracticeKey, AggregationRule> practiceRules = new HashMap<>();
        Map<PracticeKey, String> practiceCodes = new HashMap<>();
        Map<PracticeKey, List<GatingRule>> practiceGatingRules = new HashMap<>();
        Map<ModuleKey, Double> moduleWeights = new HashMap<>();
        Map<ModuleKey, AggregationRule> moduleRules = new HashMap<>();
        Map<ModuleKey, List<GatingRule>> moduleGatingRules = new HashMap<>();
        Map<String, Double> dimensionWeights = new HashMap<>();
        Map<String, AggregationRule> dimensionRules = new HashMap<>();
        Map<String, List<GatingRule>> dimensionGatingRules = new HashMap<>();

        scoredResponses.forEach((responseKey, score) -> {
            QuestionInfo info = dimensionMetadata.get(responseKey);
            if (info == null || score == null) {
                return;
            }
            boolean normalizedQuestion = "boolean".equalsIgnoreCase(info.getType())
                    || "likert".equalsIgnoreCase(info.getType())
                    || "multiple_choice".equalsIgnoreCase(info.getType())
                    || "numeric".equalsIgnoreCase(info.getType())
                    || "percentage".equalsIgnoreCase(info.getType());
            double questionScore = maturityScoringService.roundAndClampNormalized(
                    normalizedQuestion ? score : maturityScaleScoreToNormalized(score, finalMaxLevel));
            PracticeKey practiceKey = new PracticeKey(
                    info.getDimensionId(),
                    info.getModuleCode(),
                    info.getPracticeId()
            );
            ModuleKey moduleKey = new ModuleKey(info.getDimensionId(), info.getModuleCode());
            questionNodes.computeIfAbsent(practiceKey, ignored -> new ArrayList<>())
                    .add(new ScoreNode(
                            info.getQuestionCode(),
                            questionScore,
                            positiveWeight(info.getWeight()),
                            1,
                            questionScore * info.getEffectiveWeight(),
                            true
                    ));
            practiceWeights.put(practiceKey, positiveWeight(info.getPracticeWeight()));
            practiceRules.put(practiceKey, info.getPracticeAggregationRule());
            practiceCodes.put(practiceKey, info.getPracticeCode());
            practiceGatingRules.put(practiceKey, info.getPracticeGatingRules());
            moduleWeights.put(moduleKey, positiveWeight(info.getModuleWeight()));
            moduleRules.put(moduleKey, info.getModuleAggregationRule());
            moduleGatingRules.put(moduleKey, info.getModuleGatingRules());
            dimensionWeights.put(info.getDimensionId(), positiveWeight(info.getDimensionWeight()));
            dimensionRules.put(info.getDimensionId(), info.getDimensionAggregationRule());
            dimensionGatingRules.put(info.getDimensionId(), info.getDimensionGatingRules());
        });

        Map<ModuleKey, List<ScoreNode>> practiceNodes = new LinkedHashMap<>();
        questionNodes.forEach((practiceKey, children) -> {
            ScoreNode practiceScore = aggregateNodes(
                    children,
                    practiceRules.get(practiceKey),
                    practiceWeights.get(practiceKey),
                    finalMaxLevel,
                    practiceCodes.get(practiceKey),
                    practiceGatingRules.get(practiceKey)
            );
            ModuleKey moduleKey = new ModuleKey(practiceKey.dimensionId(), practiceKey.moduleCode());
            practiceNodes.computeIfAbsent(moduleKey, ignored -> new ArrayList<>()).add(practiceScore);
        });

        Map<String, List<ScoreNode>> moduleNodes = new LinkedHashMap<>();
        practiceNodes.forEach((moduleKey, children) -> {
            ScoreNode moduleScore = aggregateNodes(
                    children,
                    moduleRules.get(moduleKey),
                    moduleWeights.get(moduleKey),
                    finalMaxLevel,
                    moduleKey.moduleCode(),
                    moduleGatingRules.get(moduleKey)
            );
            moduleNodes.computeIfAbsent(moduleKey.dimensionId(), ignored -> new ArrayList<>()).add(moduleScore);
        });

        Map<String, ScoreNode> dimensionNodes = new LinkedHashMap<>();
        moduleNodes.forEach((dimensionId, children) -> dimensionNodes.put(
                dimensionId,
                aggregateNodes(
                        children,
                        dimensionRules.get(dimensionId),
                        dimensionWeights.get(dimensionId),
                        finalMaxLevel,
                        dimensionId,
                        dimensionGatingRules.get(dimensionId)
                )
        ));

        List<String> orderedDimensionIds = model != null && model.getDimensions() != null
                ? model.getDimensions().stream().map(Dimension::getDimensionId).toList()
                : new ArrayList<>(dimensionNodes.keySet());

        return orderedDimensionIds.stream()
                .filter(dimensionNodes::containsKey)
                .map(dimensionId -> toDimensionResult(
                        dimensionId,
                        dimensionNodes.get(dimensionId),
                        model,
                        finalMaxLevel,
                        modelLevelsForNames
                ))
                .toList();
    }

    private ScoreNode aggregateNodes(
            List<ScoreNode> children,
            AggregationRule rule,
            Double parentWeight,
            int maxLevelNumber,
            String parentCode,
            List<GatingRule> gatingRules
    ) {
        boolean allNormalized = children.stream().allMatch(ScoreNode::normalized);
        boolean mixedDomains = children.stream().anyMatch(ScoreNode::normalized) && !allNormalized;
        double score = maturityScoringService.aggregate(
                children.stream()
                        .map(child -> mixedDomains && child.normalized()
                                ? projectNormalizedScoreToMaturityScale(child.score(), maxLevelNumber)
                                : child.score())
                        .toList(),
                children.stream().map(ScoreNode::weight).toList(),
                rule
        );
        double gatedScore = maturityScoringService.applyGatingRules(
                score,
                children.stream()
                        .map(child -> new MaturityScoringService.ChildScore(
                                child.code(),
                                child.normalized()
                                        ? child.score()
                                        : maturityScaleScoreToNormalized(child.score(), maxLevelNumber)))
                        .toList(),
                gatingRules);
        return new ScoreNode(
                parentCode,
                gatedScore,
                positiveWeight(parentWeight),
                children.stream().mapToInt(ScoreNode::totalQuestions).sum(),
                children.stream().mapToDouble(ScoreNode::totalScore).sum(),
                true
        );
    }

    private DimensionResult toDimensionResult(
            String dimensionId,
            ScoreNode dimensionScore,
            MaturityModel model,
            int maxLevelNumber,
            List<MaturityLevel> levels
    ) {
        double roundedScore = dimensionScore.normalized()
                ? projectNormalizedScoreToMaturityScale(dimensionScore.score(), maxLevelNumber)
                : roundScore(dimensionScore.score());
        double percentageScore = dimensionScore.normalized()
                ? normalizedScoreToPercentage(dimensionScore.score())
                : maturityScoringService.normalizeToPercentage(roundedScore, maxLevelNumber);
        Dimension dimension = model == null || model.getDimensions() == null
                ? null
                : model.getDimensions().stream()
                        .filter(candidate -> dimensionId.equals(candidate.getDimensionId()))
                        .findFirst()
                        .orElse(null);
        int levelNumber = maturityScoringService.mapNormalizedScoreToLevel(
                dimensionScore.normalized()
                        ? clampNormalized(dimensionScore.score())
                        : clampNormalized((dimensionScore.score() - 1.0) / Math.max(1, maxLevelNumber - 1)),
                dimension != null ? dimension.getMappingRules() : null,
                maxLevelNumber
        );

        DimensionResult result = new DimensionResult();
        result.setDimensionId(dimensionId);
        result.setDimensionName(formatDimensionName(dimensionId, model));
        result.setDimensionDescription(getDimensionDescription(dimensionId, model));
        result.setAverageScore(roundedScore);
        result.setPercentageScore(percentageScore);
        result.setMaturityLevel(maturityScoringService.getLevelName(levelNumber, levels));
        result.setMaturityLevelNumber(levelNumber);
        result.setTotalQuestions(dimensionScore.totalQuestions());
        result.setTotalScore(dimensionScore.totalScore());
        return result;
    }

    private double calculateOverallScore(List<DimensionResult> dimensionResults, MaturityModel model) {
        if (dimensionResults == null || dimensionResults.isEmpty()) {
            return 0.0;
        }
        Map<String, Double> weightsByDimension = model == null || model.getDimensions() == null
                ? Map.of()
                : model.getDimensions().stream().collect(Collectors.toMap(
                        Dimension::getDimensionId,
                        dimension -> positiveWeight(dimension.getWeight()),
                        (left, right) -> right
                ));
        double overallScore = maturityScoringService.aggregate(
                dimensionResults.stream()
                        .map(result -> result.getMaturityLevelNumber() != null
                                ? result.getMaturityLevelNumber().doubleValue()
                                : result.getAverageScore())
                        .toList(),
                dimensionResults.stream()
                        .map(result -> weightsByDimension.getOrDefault(result.getDimensionId(), 1.0))
                        .toList(),
                model != null ? model.getAggregationRule() : null
        );
        return roundScore(overallScore);
    }

    private double maturityScaleScoreToNormalized(double score, int maxLevelNumber) {
        if (maxLevelNumber <= 1) {
            return 0.0;
        }
        return clampNormalized((score - 1.0) / (maxLevelNumber - 1.0));
    }

    private double projectNormalizedScoreToMaturityScale(double score, int maxLevelNumber) {
        if (maxLevelNumber <= 1) {
            return 1.0;
        }
        return roundScore(1.0 + clampNormalized(score) * (maxLevelNumber - 1.0));
    }

    private double normalizedScoreToPercentage(double score) {
        return Math.round(clampNormalized(score) * 1000.0) / 10.0;
    }

    private double clampNormalized(double score) {
        return Math.max(0.0, Math.min(1.0, score));
    }

    private double positiveWeight(Double weight) {
        return weight != null && Double.isFinite(weight) && weight > 0.0 ? weight : 1.0;
    }

    private double roundScore(double score) {
        return Math.round(score * 10.0) / 10.0;
    }

    private record PracticeKey(String dimensionId, String moduleCode, String practiceId) {
    }

    private record ModuleKey(String dimensionId, String moduleCode) {
    }

    private record ScoreNode(
            String code,
            double score,
            double weight,
            int totalQuestions,
            double totalScore,
            boolean normalized
    ) {
    }

    private String formatDimensionName(String dimensionId, MaturityModel model) {
        if (model != null && model.getDimensions() != null) {
            Optional<Dimension> dimensionOpt = model.getDimensions().stream()
                    .filter(d -> d.getDimensionId().equals(dimensionId))
                    .findFirst();
            if (dimensionOpt.isPresent()) {
                return dimensionOpt.get().getName();
            }
        }
        // Fallback to formatted dimensionId
        return Arrays.stream(dimensionId.replace("_", " ").split(" "))
                .map(word -> word.length() > 0 ? word.substring(0, 1).toUpperCase() + word.substring(1) : word)
                .collect(Collectors.joining(" "));
    }

    private String getDimensionDescription(String dimensionId, MaturityModel model) {
        if (model != null && model.getDimensions() != null) {
            Optional<Dimension> dimensionOpt = model.getDimensions().stream()
                    .filter(d -> d.getDimensionId().equals(dimensionId))
                    .findFirst();
            if (dimensionOpt.isPresent()) {
                String description = dimensionOpt.get().getDescription();
                if (description != null && !description.isEmpty()) {
                    return description;
                }
            }
        }
        // Fallback to default description
        return "Assessment dimension for " + formatDimensionName(dimensionId, model);
    }

    private boolean isEligibleForManualEvaluation(QuestionInfo questionInfo, Object responseValue) {
        if (questionInfo == null) {
            return false;
        }
        if (!isAnswered(responseValue)) {
            return false;
        }
        return "open_answer".equals(questionInfo.getType()) || Boolean.TRUE.equals(questionInfo.getRequiresEvidence());
    }

    private boolean isAnswered(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof String) {
            return !((String) value).trim().isEmpty();
        }
        return true;
    }

    private String normalizeEvaluatorInsight(String evaluatorInsight) {
        if (evaluatorInsight == null) {
            return null;
        }
        String trimmed = evaluatorInsight.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void applyModelMetadata(List<AssessmentResponse> responses) {
        if (responses == null || responses.isEmpty()) {
            return;
        }
        Set<Long> ids = responses.stream()
                .map(AssessmentResponse::getMaturityModelId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return;
        }

        Map<Long, Object[]> metadataByModelId = maturityModelRepository
                .findAssessmentMetadataByIdIn(ids)
                .stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> row));

        for (AssessmentResponse r : responses) {
            Object[] metadata = metadataByModelId.get(r.getMaturityModelId());
            if (metadata != null) {
                r.setDomainName(metadata.length > 1 ? (String) metadata[1] : null);
                r.setMaturityModelVersion(metadata.length > 2 ? (Integer) metadata[2] : null);
            }
        }
    }

    private void enrichModelMetadata(AssessmentResponse response) {
        if (response == null) {
            return;
        }
        applyModelMetadata(Collections.singletonList(response));
    }

    private AssessmentResponse convertToResponse(Assessment assessment) {
        List<DimensionResult> dimensionResults = dimensionResultRepository.findByAssessmentId(assessment.getId());
        return convertToResponse(assessment, dimensionResults);
    }

    private AssessmentResponse convertToResponse(Assessment assessment, List<DimensionResult> dimensionResults) {
        AssessmentResponse response = new AssessmentResponse();
        AssessmentStatus status = resolveAssessmentStatus(assessment);
        response.setId(assessment.getId());
        response.setOverallAverage(assessment.getOverallAverage());
        response.setOverallPercentageScore(assessment.getOverallPercentageScore());
        response.setOverallMaturityLevel(assessment.getOverallMaturityLevel());
        response.setStatus(status.name());
        response.setIsCompleted(status == AssessmentStatus.COMPLETED);
        response.setMaturityModelId(assessment.getMaturityModelId());
        response.setEvaluatorInsight(assessment.getEvaluatorInsight());

        response.setQuestionEvaluations(readQuestionEvaluations(assessment.getId()));

        response.setCreatedAt(assessment.getCreatedAt());
        response.setUpdatedAt(assessment.getUpdatedAt());

        List<DimensionResultResponse> dimensionResponses = dimensionResults.stream()
                .map(this::convertToDimensionResponse)
                .collect(Collectors.toList());
        response.setDimensionResults(dimensionResponses);

        return response;
    }

    private AssessmentResponse convertToResponseWithUserInfo(Assessment assessment) {
        List<DimensionResult> dimensionResults = dimensionResultRepository.findByAssessmentId(assessment.getId());
        AssessmentResponse response = convertToResponse(assessment, dimensionResults);

        // Include user information
        if (assessment.getUser() != null) {
            response.setUserId(assessment.getUser().getId());
            response.setUserEmail(assessment.getUser().getEmail());
        } else if (assessment.getCampaignParticipant() != null) {
            response.setUserEmail(assessment.getCampaignParticipant().getEmail());
        }

        if (assessment.getCampaign() != null) {
            response.setCampaignId(assessment.getCampaign().getId());
            response.setCampaignName(assessment.getCampaign().getName());
        }
        if (assessment.getCampaignParticipant() != null) {
            response.setCampaignParticipantId(assessment.getCampaignParticipant().getId());
        }

        return response;
    }

    private Map<String, QuestionEvaluationResponse> readQuestionEvaluations(Long assessmentId) {
        if (assessmentId == null) {
            return Map.of();
        }

        return questionEvaluationRepository.findByAssessmentIdOrderByIdAsc(assessmentId)
                .stream()
                .collect(Collectors.toMap(
                        QuestionEvaluation::getResponseKey,
                        this::convertToQuestionEvaluationResponse,
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
    }

    private QuestionEvaluationResponse convertToQuestionEvaluationResponse(QuestionEvaluation evaluation) {
        QuestionEvaluationResponse response = new QuestionEvaluationResponse();
        response.setId(evaluation.getId());
        response.setResponseKey(evaluation.getResponseKey());
        response.setQuestionId(evaluation.getQuestionId());
        response.setResponse(
                evaluation.getResponse() != null
                        ? objectMapper.convertValue(evaluation.getResponse(), Object.class)
                        : null
        );
        response.setInitialScore(evaluation.getInitialScore());
        response.setRespondentJustification(evaluation.getRespondentJustification());
        response.setValidationStatus(
                evaluation.getValidationStatus() != null
                        ? evaluation.getValidationStatus().name()
                        : null
        );
        response.setManualScore(evaluation.getManualScore());
        response.setReviewerNote(evaluation.getReviewerNote());
        response.setRespondentUpdated(
                Boolean.TRUE.equals(evaluation.getRespondentUpdated())
        );
        response.setCreatedAt(evaluation.getCreatedAt());
        response.setUpdatedAt(evaluation.getUpdatedAt());
        return response;
    }

    private DimensionResultResponse convertToDimensionResponse(DimensionResult result) {
        DimensionResultResponse response = new DimensionResultResponse();
        response.setDimensionId(result.getDimensionId());
        response.setDimensionName(result.getDimensionName());
        response.setDimensionDescription(result.getDimensionDescription());
        response.setAverageScore(result.getAverageScore());
        response.setPercentageScore(result.getPercentageScore());
        response.setMaturityLevel(result.getMaturityLevel());
        response.setMaturityLevelNumber(result.getMaturityLevelNumber());
        response.setTotalQuestions(result.getTotalQuestions());
        response.setTotalScore(result.getTotalScore());
        return response;
    }

    private boolean checkIfMaturityModelIsAutoEvaluated(Long maturityModelId) {
        if (maturityModelId == null) {
            return true; // Default to auto-evaluated if no model specified
        }

        return maturityModelRepository.findById(maturityModelId)
                .map(maturityModel -> maturityModel.getAutoEvaluated() != null ? maturityModel.getAutoEvaluated() : true)
                .orElse(true); // Default to auto-evaluated if model not found
    }

    private void validateRequiredResponses(MaturityModel model, AssessmentRequest request) {
        Map<String, Object> responses = responseValues(request);
        int unansweredRequired = 0;

        for (Dimension dimension : Optional.ofNullable(model.getDimensions()).orElse(List.of())) {
            for (Module module : Optional.ofNullable(dimension.getModules()).orElse(List.of())) {
                for (Practice practice : Optional.ofNullable(module.getPractices()).orElse(List.of())) {
                    for (Question question : Optional.ofNullable(practice.getQuestions()).orElse(List.of())) {
                        if (question.getId() == null
                                || !Boolean.TRUE.equals(question.getRequired())
                                || isEvidenceOnlyQuestion(question)
                                || !isQuestionVisible(question, responses)) {
                            continue;
                        }
                        String key = findQuestionKey(question.getId(), responses);
                        if (key == null || !isAnswered(responses.get(key))) {
                            unansweredRequired++;
                        }
                    }
                }
            }
        }

        if (unansweredRequired > 0) {
            throw new IllegalOperationException(
                    "REQUIRED_QUESTIONS_UNANSWERED",
                    unansweredRequired + " required question(s) still need an answer.");
        }
    }

    private boolean isQuestionVisible(Question question, Map<String, Object> responses) {
        return isQuestionVisible(question, responses, new HashSet<>());
    }

    private boolean isEvidenceOnlyQuestion(Question question) {
        if (question == null || question.getType() == null) {
            return false;
        }
        return "evidence".equalsIgnoreCase(question.getType());
    }

    private boolean isQuestionVisible(
            Question question,
            Map<String, Object> responses,
            Set<Long> visitingQuestionIds
    ) {
        Question parent = question.getDependsOnQuestion();
        if (parent == null || parent.getId() == null) return true;

        Long questionId = question.getId();
        if (questionId != null && !visitingQuestionIds.add(questionId)) {
            return false;
        }
        try {
            if (!isQuestionVisible(parent, responses, visitingQuestionIds)) {
                return false;
            }

            String key = findQuestionKey(parent.getId(), responses);
            if (key == null) return false;
            Object value = responses.get(key);
            return value instanceof Number ? ((Number) value).intValue() == 1
                    : "1".equals(String.valueOf(value)) || "true".equalsIgnoreCase(String.valueOf(value))
                    || "yes".equalsIgnoreCase(String.valueOf(value));
        } finally {
            if (questionId != null) {
                visitingQuestionIds.remove(questionId);
            }
        }
    }

    private String findQuestionKey(Long questionId, Map<String, Object> responses) {
        String suffix = "_" + questionId;
        return responses.keySet().stream()
                .filter(key -> key != null && !key.endsWith("_justification") && key.endsWith(suffix))
                .findFirst().orElse(null);
    }

    private AssessmentStatus resolveAssessmentStatus(Assessment assessment) {
        if (assessment.getStatus() != null) {
            return assessment.getStatus();
        }
        return Boolean.TRUE.equals(assessment.getIsCompleted())
                ? AssessmentStatus.COMPLETED
                : AssessmentStatus.PENDING_REVIEW;
    }

    private void transitionTo(Assessment assessment, AssessmentStatus status) {
        assessment.setStatus(status);
        assessment.setIsCompleted(status == AssessmentStatus.COMPLETED);
    }

    private void requirePendingReview(Assessment assessment) {
        AssessmentStatus status = resolveAssessmentStatus(assessment);
        if (status != AssessmentStatus.PENDING_REVIEW) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only assessments pending review can be evaluated. Current status: " + status + "."
            );
        }
    }
}
