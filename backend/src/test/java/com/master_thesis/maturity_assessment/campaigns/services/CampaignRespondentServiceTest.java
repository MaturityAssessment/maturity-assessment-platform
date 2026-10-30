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
                assessmentService,
                mock(AssessmentEvidenceWorkflowService.class),
                evidenceService
        );

        Campaign campaign = new Campaign();
        campaign.setName("Security review");
        campaign.setEndsAt(Instant.now().plusSeconds(3_600));
        participant = new CampaignParticipant();
        participant.setId(8L);
        var user = new com.master_thesis.maturity_assessment.auth.models.User();
        user.setId(2L);
        participant.setUser(user);
        participant.setEmail("respondent@example.com");
        participant.setCampaign(campaign);
    }

    @Test
    void opensOnlyTheAssessmentOwnedByTheInvitationParticipant() {
        when(participantRepository.findForResponse(1L, 2L))
                .thenReturn(Optional.of(participant));
        AssessmentResponse assessment = new AssessmentResponse();
        assessment.setId(31L);
        when(assessmentService.ensureCampaignAssessment(participant))
                .thenReturn(assessment);
        when(evidenceService.getEvidenceByAssessment(31L, participant))
                .thenReturn(List.of());

        CampaignAssessmentSessionResponse session = service.openAssessment(1L, participant.getUser());

        assertEquals("Security review", session.getCampaignName());
        assertEquals("respondent@example.com", session.getParticipantEmail());
        assertEquals(31L, session.getAssessment().getId());
        verify(assessmentService).ensureCampaignAssessment(participant);
    }

    @Test
    void rejectsRevokedInvitationsBeforeCreatingAnAssessment() {
        participant.setRevokedAt(Instant.now());
        when(participantRepository.findForResponse(1L, 2L))
                .thenReturn(Optional.of(participant));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.openAssessment(1L, participant.getUser())
        );

        assertEquals(HttpStatus.GONE, exception.getStatusCode());
        verify(assessmentService, never()).ensureCampaignAssessment(participant);
    }

    @Test
    void rejectsExpiredCampaignsBeforeCreatingAnAssessment() {
        participant.getCampaign().setEndsAt(Instant.now().minusSeconds(1));
        when(participantRepository.findForResponse(1L, 2L))
                .thenReturn(Optional.of(participant));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.openAssessment(1L, participant.getUser())
        );

        assertEquals(HttpStatus.GONE, exception.getStatusCode());
        verify(assessmentService, never()).ensureCampaignAssessment(participant);
    }
    @Test
    void wrongAccountAndIncompleteAccountsCannotOpenCampaign() {
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.openAssessment(1L, participant.getUser())).getStatusCode());
        participant.getUser().setProfileCompletionRequired(true);
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.openAssessment(1L, participant.getUser())).getStatusCode());
        participant.getUser().setProfileCompletionRequired(false);
        participant.getUser().setApprovalStatus(com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus.PENDING);
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.openAssessment(1L, participant.getUser())).getStatusCode());
        verify(assessmentService, never()).ensureCampaignAssessment(participant);
    }
}
