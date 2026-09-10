package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.AssessmentRequest;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceDTO;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceSubmissionItemRequest;
import com.master_thesis.maturity_assessment.assessments.dto.QuestionResponseRequest;
import com.master_thesis.maturity_assessment.assessments.models.EvidenceType;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AssessmentEvidenceWorkflowService {

    private final AssessmentService assessmentService;
    private final EvidenceService evidenceService;
    private final MaturityModelRepository maturityModelRepository;

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse saveJsonDraft(AssessmentRequest request, User user) {
        AssessmentResponse response = assessmentService.saveDraft(request, user);
        response.setEvidence(evidenceService.getEvidenceByAssessment(response.getId(), user));
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse saveMultipartDraft(
            AssessmentRequest request,
            User user,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys,
            boolean metadataProvided
    ) throws IOException {
        AssessmentResponse response = assessmentService.saveDraft(request, user);
        List<EvidenceDTO> synchronizedEvidence = synchronize(
                response,
                request,
                user,
                metadata,
                evidenceFiles,
                evidenceFileKeys,
                metadataProvided
        );
        if (metadataProvided) {
            validateEvidencePlacement(request, synchronizedEvidence);
        }
        response.setEvidence(synchronizedEvidence);
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse saveMultipartDraft(
            Long draftId,
            AssessmentRequest request,
            User user,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) throws IOException {
        AssessmentResponse response = assessmentService.saveDraft(draftId, request, user);
        List<EvidenceDTO> synchronizedEvidence = synchronize(
                response,
                request,
                user,
                metadata,
                evidenceFiles,
                evidenceFileKeys,
                true
        );
        validateEvidencePlacement(request, synchronizedEvidence);
        response.setEvidence(synchronizedEvidence);
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse resetDraft(Long draftId, User user) {
        AssessmentResponse response = assessmentService.resetDraft(draftId, user);
        evidenceService.clearEvidenceForDraft(draftId, user);
        response.setEvidence(List.of());
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse submitAssessment(
            AssessmentRequest request,
            User user,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys,
            boolean metadataProvided
    ) throws IOException {
        AssessmentResponse response = assessmentService.createAssessment(request, user);
        List<EvidenceDTO> synchronizedEvidence = synchronize(
                response,
                request,
                user,
                metadata,
                evidenceFiles,
                evidenceFileKeys,
                metadataProvided
        );
        if (metadataProvided) {
            validateEvidencePlacement(request, synchronizedEvidence);
        }
        validateRequiredEvidence(request, synchronizedEvidence);
        response.setEvidence(synchronizedEvidence);
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse submitAssessment(
            Long draftId,
            AssessmentRequest request,
            User user,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) throws IOException {
        AssessmentResponse response = assessmentService.submitDraft(draftId, request, user);
        List<EvidenceDTO> synchronizedEvidence = synchronize(
                response,
                request,
                user,
                metadata,
                evidenceFiles,
                evidenceFileKeys,
                true
        );
        validateEvidencePlacement(request, synchronizedEvidence);
        validateRequiredEvidence(request, synchronizedEvidence);
        response.setEvidence(synchronizedEvidence);
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse saveCampaignDraft(
            AssessmentRequest request,
            CampaignParticipant participant,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) throws IOException {
        AssessmentResponse response = assessmentService.saveCampaignDraft(request, participant);
        List<EvidenceDTO> synchronizedEvidence = evidenceService.synchronizeCampaignEvidence(
                response.getId(),
                request.getMaturityModelId(),
                participant,
                metadata,
                evidenceFiles,
                evidenceFileKeys,
                true
        );
        validateEvidencePlacement(request, synchronizedEvidence);
        response.setEvidence(synchronizedEvidence);
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse submitCampaignAssessment(
            AssessmentRequest request,
            CampaignParticipant participant,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) throws IOException {
        AssessmentResponse response = assessmentService.submitCampaignAssessment(
                request,
                participant
        );
        List<EvidenceDTO> synchronizedEvidence = evidenceService.synchronizeCampaignEvidence(
                response.getId(),
                request.getMaturityModelId(),
                participant,
                metadata,
                evidenceFiles,
                evidenceFileKeys,
                true
        );
        validateEvidencePlacement(request, synchronizedEvidence);
        validateRequiredEvidence(request, synchronizedEvidence);
        response.setEvidence(synchronizedEvidence);
        return response;
    }

    @Transactional
    public void deleteAssessment(Long assessmentId, User user) {
        evidenceService.scheduleAssessmentFilesForDeletion(assessmentId);
        assessmentService.deleteAssessment(assessmentId, user);
    }

    private List<EvidenceDTO> synchronize(
            AssessmentResponse response,
            AssessmentRequest request,
            User user,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys,
            boolean metadataProvided
    ) throws IOException {
        List<EvidenceSubmissionItemRequest> normalizedMetadata = metadataProvided
                ? metadata
                : legacyFileMetadata(evidenceFiles, evidenceFileKeys);
        return evidenceService.synchronizeEvidence(
                response.getId(),
                request.getMaturityModelId(),
                user,
                normalizedMetadata,
                evidenceFiles,
                evidenceFileKeys,
                metadataProvided
        );
    }

    private List<EvidenceSubmissionItemRequest> legacyFileMetadata(
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) {
        List<MultipartFile> files = evidenceFiles == null ? List.of() : evidenceFiles;
        List<String> keys = evidenceFileKeys == null ? List.of() : evidenceFileKeys;
        if (files.isEmpty() && keys.isEmpty()) {
            return List.of();
        }
        if (files.size() != keys.size()) {
            throw badRequest("Each uploaded evidence file must have exactly one evidenceFileKey.");
        }

        List<EvidenceSubmissionItemRequest> items = new ArrayList<>();
        for (String key : keys) {
            Long questionId = parseQuestionIdFromLegacyKey(key);
            if (questionId == null) {
                throw badRequest("Invalid legacy evidenceFileKey: " + key);
            }
            EvidenceSubmissionItemRequest item = new EvidenceSubmissionItemRequest();
            item.setItemKey(key);
            item.setQuestionId(questionId);
            item.setType(EvidenceType.FILE);
            items.add(item);
        }
        return items;
    }

    private void validateEvidencePlacement(AssessmentRequest request, List<EvidenceDTO> evidence) {
        MaturityModel model = requireModel(request.getMaturityModelId());
        Map<String, Object> responses = responseValues(request);
        Set<Long> evidenceQuestionIds = evidence.stream()
                .map(EvidenceDTO::getQuestionId)
                .collect(java.util.stream.Collectors.toSet());

        for (Question question : allQuestions(model)) {
            if (!evidenceQuestionIds.contains(question.getId())) {
                continue;
            }
            if (!isQuestionVisible(question, responses)
                    || (!isEvidenceOnlyQuestion(question) && !isQuestionAnswered(question, responses))) {
                throw badRequest("Evidence can only be attached to an answered, visible question: " + question.getId());
            }
        }
    }

    private void validateRequiredEvidence(AssessmentRequest request, List<EvidenceDTO> evidence) {
        MaturityModel model = requireModel(request.getMaturityModelId());
        Map<String, Object> responses = responseValues(request);
        Set<Long> evidenceQuestionIds = evidence.stream()
                .map(EvidenceDTO::getQuestionId)
                .collect(java.util.stream.Collectors.toSet());

        for (Question question : allQuestions(model)) {
            boolean evidenceOnly = isEvidenceOnlyQuestion(question);
            if (!isQuestionVisible(question, responses)
                    || (evidenceOnly && !Boolean.TRUE.equals(question.getRequired()))
                    || (!evidenceOnly && (!Boolean.TRUE.equals(question.getRequiresEvidence())
                    || !isQuestionAnswered(question, responses)))) {
                continue;
            }
            if (!evidenceQuestionIds.contains(question.getId())) {
                throw badRequest("Missing required evidence for questionId: " + question.getId());
            }
        }
    }

    private boolean isEvidenceOnlyQuestion(Question question) {
        return question != null && question.getType() != null
                && "evidence".equalsIgnoreCase(question.getType());
    }

    private MaturityModel requireModel(Long maturityModelId) {
        if (maturityModelId == null) {
            throw badRequest("Maturity model is required.");
        }
        return maturityModelRepository.findById(maturityModelId)
                .orElseThrow(() -> badRequest("Maturity model not found."));
    }

    private List<Question> allQuestions(MaturityModel model) {
        List<Question> questions = new ArrayList<>();
        if (model.getDimensions() == null) {
            return questions;
        }
        model.getDimensions().forEach(dimension -> {
            if (dimension.getModules() == null) {
                return;
            }
            dimension.getModules().forEach(module -> {
                if (module.getPractices() == null) {
                    return;
                }
                module.getPractices().forEach(practice -> {
                    if (practice.getQuestions() != null) {
                        questions.addAll(practice.getQuestions());
                    }
                });
            });
        });
        return questions;
    }

    private Long parseQuestionIdFromLegacyKey(String questionKey) {
        if (questionKey == null || questionKey.isBlank()) {
            return null;
        }
        String[] parts = questionKey.split("_");
        try {
            return Long.parseLong(parts[parts.length - 1]);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean isQuestionAnswered(Question question, Map<String, Object> responses) {
        if (question.getId() == null) {
            return false;
        }
        String suffix = "_" + question.getId();
        for (Map.Entry<String, Object> entry : responses.entrySet()) {
            String key = entry.getKey();
            if (key != null && !key.endsWith("_justification") && key.endsWith(suffix)) {
                return isAnswered(entry.getValue());
            }
        }
        return false;
    }

    private boolean isQuestionVisible(Question question, Map<String, Object> responses) {
        Question parent = question.getDependsOnQuestion();
        if (parent == null || parent.getId() == null) {
            return true;
        }
        String suffix = "_" + parent.getId();
        for (Map.Entry<String, Object> entry : responses.entrySet()) {
            if (entry.getKey() == null || !entry.getKey().endsWith(suffix)) {
                continue;
            }
            Object value = entry.getValue();
            if (value instanceof Number && ((Number) value).intValue() == 1) {
                return true;
            }
            if (value instanceof String raw) {
                String normalized = raw.trim();
                return "1".equals(normalized)
                        || "true".equalsIgnoreCase(normalized)
                        || "yes".equalsIgnoreCase(normalized);
            }
        }
        return false;
    }

    private boolean isAnswered(Object value) {
        return value != null && (!(value instanceof String) || !((String) value).trim().isEmpty());
    }

    private Map<String, Object> responseValues(AssessmentRequest request) {
        if (request == null || request.getQuestionResponses() == null) {
            return Map.of();
        }
        Map<String, Object> responses = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, QuestionResponseRequest> entry : request.getQuestionResponses().entrySet()) {
            if (entry.getValue() != null) {
                responses.put(entry.getKey(), entry.getValue().getResponse());
            }
        }
        return responses;
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
