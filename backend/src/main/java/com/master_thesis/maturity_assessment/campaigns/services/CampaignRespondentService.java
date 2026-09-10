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
    private final CampaignInvitationTokenService invitationTokenService;
    private final AssessmentService assessmentService;
    private final AssessmentEvidenceWorkflowService evidenceWorkflowService;
    private final EvidenceService evidenceService;

    @Transactional
    public CampaignAssessmentSessionResponse openAssessment(String rawToken) {
        CampaignParticipant participant = requireActiveParticipant(rawToken, true);
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
            String rawToken,
            AssessmentRequest request,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) throws IOException {
        CampaignParticipant participant = requireActiveParticipant(rawToken, true);
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
            String rawToken,
            AssessmentRequest request,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) throws IOException {
        CampaignParticipant participant = requireActiveParticipant(rawToken, true);
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
    public Resource downloadEvidence(String rawToken, Long evidenceId) throws IOException {
        CampaignParticipant participant = requireActiveParticipant(rawToken, false);
        return evidenceService.downloadEvidence(evidenceId, participant);
    }

    private CampaignParticipant requireActiveParticipant(String rawToken, boolean lock) {
        String tokenHash;
        try {
            tokenHash = invitationTokenService.hash(rawToken);
        } catch (IllegalArgumentException exception) {
            throw new ResourceNotFoundException("Campaign invitation not found");
        }
        CampaignParticipant participant = (lock
                ? participantRepository.findByInvitationTokenHashForUpdate(tokenHash)
                : participantRepository.findByInvitationTokenHash(tokenHash))
                .orElseThrow(() -> new ResourceNotFoundException("Campaign invitation not found"));
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
