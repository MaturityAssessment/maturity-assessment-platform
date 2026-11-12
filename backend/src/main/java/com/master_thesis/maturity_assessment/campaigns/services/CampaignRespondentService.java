package com.master_thesis.maturity_assessment.campaigns.services;

import com.master_thesis.maturity_assessment.assessments.dto.AssessmentRequest;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceSubmissionItemRequest;
import com.master_thesis.maturity_assessment.assessments.services.AssessmentEvidenceWorkflowService;
import com.master_thesis.maturity_assessment.assessments.services.AssessmentService;
import com.master_thesis.maturity_assessment.assessments.services.EvidenceService;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignAssessmentSessionResponse;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignParticipantRepository;
import com.master_thesis.maturity_assessment.config.ResourceNotFoundException;
import com.master_thesis.maturity_assessment.assessments.services.AssessmentAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CampaignRespondentService {

    private final CampaignParticipantRepository participantRepository;
    private final AssessmentService assessmentService;
    private final AssessmentEvidenceWorkflowService evidenceWorkflowService;
    private final EvidenceService evidenceService;

    @Transactional
    public CampaignAssessmentSessionResponse openAssessment(Long campaignId, com.master_thesis.maturity_assessment.auth.models.User user) {
        CampaignParticipant participant = requireActiveParticipant(campaignId, user, true);
        AssessmentResponse assessment = assessmentService.ensureCampaignAssessment(participant);
        assessment.setEvidence(
                evidenceService.getEvidenceByAssessment(assessment.getId(), participant)
        );

        CampaignAssessmentSessionResponse session = new CampaignAssessmentSessionResponse();
        session.setCampaignName(participant.getCampaign().getName());
        session.setParticipantEmail(participant.getEmail());
        session.setEndsAt(participant.getCampaign().getEndsAt());
        session.setAssessment(assessment);
        return session;
    }

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse saveDraft(
            Long campaignId, com.master_thesis.maturity_assessment.auth.models.User user,
            AssessmentRequest request,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) throws IOException {
        CampaignParticipant participant = requireActiveParticipant(campaignId, user, true);
        assessmentService.ensureCampaignAssessment(participant);
        return evidenceWorkflowService.saveCampaignDraft(
                request,
                participant,
                metadata,
                evidenceFiles,
                evidenceFileKeys
        );
    }

    @Transactional(rollbackFor = Exception.class)
    public AssessmentResponse submitAssessment(
            Long campaignId, com.master_thesis.maturity_assessment.auth.models.User user,
            AssessmentRequest request,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) throws IOException {
        CampaignParticipant participant = requireActiveParticipant(campaignId, user, true);
        assessmentService.ensureCampaignAssessment(participant);
        return evidenceWorkflowService.submitCampaignAssessment(
                request,
                participant,
                metadata,
                evidenceFiles,
                evidenceFileKeys
        );
    }

    @Transactional(readOnly = true)
    public AssessmentAuditService.LogPage logs(
            Long campaignId, com.master_thesis.maturity_assessment.auth.models.User user, int page) {
        return logs(campaignId, user, page, null);
    }

    @Transactional(readOnly = true)
    public AssessmentAuditService.LogPage logs(
            Long campaignId, com.master_thesis.maturity_assessment.auth.models.User user, int page, Long questionId) {
        return assessmentService.getCampaignLogs(requireActiveParticipant(campaignId, user, false), page, questionId);
    }

    @Transactional(readOnly = true)
    public AssessmentAuditService.LogPage logs(Long campaignId,
            com.master_thesis.maturity_assessment.auth.models.User user, int page,
            String dimensionId, String moduleCode, Long practiceId, Long questionId) {
        return assessmentService.getCampaignLogs(requireActiveParticipant(campaignId, user, false),
                page, dimensionId, moduleCode, practiceId, questionId);
    }

    @Transactional(readOnly = true)
    public Resource downloadEvidence(Long campaignId, com.master_thesis.maturity_assessment.auth.models.User user, Long evidenceId) throws IOException {
        CampaignParticipant participant = requireActiveParticipant(campaignId, user, false);
        return evidenceService.downloadEvidence(evidenceId, participant);
    }

    private CampaignParticipant requireActiveParticipant(Long campaignId, com.master_thesis.maturity_assessment.auth.models.User user, boolean lock) {
        if (user == null || !user.isEnabled() || user.isPasswordChangeRequired() || user.isProfileCompletionRequired()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account setup and approval are required.");
        }
        CampaignParticipant participant = (lock
                ? participantRepository.findForResponse(campaignId, user.getId())
                : participantRepository.findByCampaignIdAndUserId(campaignId, user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "This account is not invited to the campaign. Sign in with the invited account."));
        if (participant.getRevokedAt() != null) {
            throw new ResponseStatusException(
                    HttpStatus.GONE,
                    "This campaign invitation has been revoked."
            );
        }
        if (participant.getCampaign().getEndsAt() == null
                || !participant.getCampaign().getEndsAt().isAfter(Instant.now())) {
            throw new ResponseStatusException(
                    HttpStatus.GONE,
                    "This campaign has ended."
            );
        }
        return participant;
    }
}
