package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.AssessmentRequest;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceDTO;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceSubmissionItemRequest;
import com.master_thesis.maturity_assessment.assessments.dto.QuestionResponseRequest;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Optional;

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
                : requireNoLegacyFiles(evidenceFiles, evidenceFileKeys);
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

    private List<EvidenceSubmissionItemRequest> requireNoLegacyFiles(
            List<MultipartFile> files, List<String> keys
    ) {
        if ((files != null && !files.isEmpty()) || (keys != null && !keys.isEmpty())) {
            throw badRequest("Evidence uploads require metadata with practiceId.");
        }
        return List.of();
    }

    private void validateRequiredEvidence(AssessmentRequest request, List<EvidenceDTO> evidence) {
        MaturityModel model = requireModel(request.getMaturityModelId());
        Map<String, Object> responses = responseValues(request);
        Set<Long> practiceIds = evidence.stream().map(EvidenceDTO::getPracticeId)
                .collect(java.util.stream.Collectors.toSet());
        for (var dimension : Optional.ofNullable(model.getDimensions()).orElse(List.of())) {
            for (var module : Optional.ofNullable(dimension.getModules()).orElse(List.of())) {
                for (Practice practice : Optional.ofNullable(module.getPractices()).orElse(List.of())) {
                    boolean active = practice.getQuestions() != null && practice.getQuestions().stream()
                            .anyMatch(question -> assessmentService.isQuestionVisible(question, responses));
                    if (active && Boolean.TRUE.equals(practice.getRequiresEvidence())
                            && !practiceIds.contains(practice.getId())) {
                        throw badRequest("Missing required evidence for practiceId: " + practice.getId());
                    }
                }
            }
        }
    }

    private MaturityModel requireModel(Long maturityModelId) {
        if (maturityModelId == null) {
            throw badRequest("Maturity model is required.");
        }
        return maturityModelRepository.findById(maturityModelId)
                .orElseThrow(() -> badRequest("Maturity model not found."));
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
