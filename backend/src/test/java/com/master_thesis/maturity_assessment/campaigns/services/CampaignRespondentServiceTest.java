package com.master_thesis.maturity_assessment.campaigns.services;

import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.services.AssessmentEvidenceWorkflowService;
import com.master_thesis.maturity_assessment.assessments.services.AssessmentService;
import com.master_thesis.maturity_assessment.assessments.services.EvidenceService;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignAssessmentSessionResponse;
import com.master_thesis.maturity_assessment.campaigns.models.Campaign;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignParticipantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CampaignRespondentServiceTest {

    private CampaignParticipantRepository participantRepository;
    private AssessmentService assessmentService;
    private EvidenceService evidenceService;
    private CampaignRespondentService service;
    private CampaignParticipant participant;

    @BeforeEach
    void setUp() {
        participantRepository = mock(CampaignParticipantRepository.class);
        assessmentService = mock(AssessmentService.class);
        evidenceService = mock(EvidenceService.class);
        service = new CampaignRespondentService(
                participantRepository,
                new CampaignInvitationTokenService(),
                assessmentService,
                mock(AssessmentEvidenceWorkflowService.class),
                evidenceService
        );

        Campaign campaign = new Campaign();
        campaign.setName("Security review");
        campaign.setEndsAt(Instant.now().plusSeconds(3_600));
        participant = new CampaignParticipant();
        participant.setId(8L);
        participant.setEmail("respondent@example.com");
        participant.setCampaign(campaign);
    }

    @Test
    void opensOnlyTheAssessmentOwnedByTheInvitationParticipant() {
        when(participantRepository.findByInvitationTokenHashForUpdate(anyString()))
                .thenReturn(Optional.of(participant));
        AssessmentResponse assessment = new AssessmentResponse();
        assessment.setId(31L);
        when(assessmentService.ensureCampaignAssessment(participant))
                .thenReturn(assessment);
        when(evidenceService.getEvidenceByAssessment(31L, participant))
                .thenReturn(List.of());

        CampaignAssessmentSessionResponse session = service.openAssessment("a".repeat(43));

        assertEquals("Security review", session.getCampaignName());
        assertEquals("respondent@example.com", session.getParticipantEmail());
        assertEquals(31L, session.getAssessment().getId());
        verify(assessmentService).ensureCampaignAssessment(participant);
    }

    @Test
    void rejectsRevokedInvitationsBeforeCreatingAnAssessment() {
        participant.setRevokedAt(Instant.now());
        when(participantRepository.findByInvitationTokenHashForUpdate(anyString()))
                .thenReturn(Optional.of(participant));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.openAssessment("b".repeat(43))
        );

        assertEquals(HttpStatus.GONE, exception.getStatusCode());
        verify(assessmentService, never()).ensureCampaignAssessment(participant);
    }

    @Test
    void rejectsExpiredCampaignsBeforeCreatingAnAssessment() {
        participant.getCampaign().setEndsAt(Instant.now().minusSeconds(1));
        when(participantRepository.findByInvitationTokenHashForUpdate(anyString()))
                .thenReturn(Optional.of(participant));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.openAssessment("c".repeat(43))
        );

        assertEquals(HttpStatus.GONE, exception.getStatusCode());
        verify(assessmentService, never()).ensureCampaignAssessment(participant);
    }
}
