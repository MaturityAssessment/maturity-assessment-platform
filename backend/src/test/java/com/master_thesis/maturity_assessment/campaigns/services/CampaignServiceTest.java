package com.master_thesis.maturity_assessment.campaigns.services;

import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.DimensionResult;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.assessments.repository.DimensionResultRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.campaigns.email.CampaignInvitationsCreatedEvent;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignDetailResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignSummaryResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignResultsResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignInvitationResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CreateCampaignRequest;
import com.master_thesis.maturity_assessment.campaigns.models.Campaign;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignParticipantRepository;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignRepository;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.config.ResourceNotFoundException;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CampaignServiceTest {

    private CampaignRepository campaignRepository;
    private CampaignParticipantRepository participantRepository;
    private AssessmentRepository assessmentRepository;
    private DimensionResultRepository dimensionResultRepository;
    private MaturityModelRepository maturityModelRepository;
    private ApplicationEventPublisher eventPublisher;
    private CampaignInvitationTokenService invitationTokenService;
    private CampaignService service;
    private User creator;
    private MaturityModel model;

    @BeforeEach
    void setUp() {
        campaignRepository = mock(CampaignRepository.class);
        participantRepository = mock(CampaignParticipantRepository.class);
        assessmentRepository = mock(AssessmentRepository.class);
        dimensionResultRepository = mock(DimensionResultRepository.class);
        maturityModelRepository = mock(MaturityModelRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        invitationTokenService = new CampaignInvitationTokenService();
        service = new CampaignService(
                campaignRepository,
                participantRepository,
                assessmentRepository,
                dimensionResultRepository,
                maturityModelRepository,
                invitationTokenService,
                eventPublisher
        );

        creator = new User();
        creator.setId(7L);
        creator.setEmail("curator@example.com");

        model = new MaturityModel();
        model.setId(9L);
        model.setName("Security");
        model.setVersion(3);
        model.setIsActive(true);
    }

    @Test
    void createCampaignNormalizesParticipantsAndStoresOnlyTokenHashes() {
        CreateCampaignRequest request = request(
                List.of(" Alice@Example.com ", "BOB@example.com")
        );
        when(maturityModelRepository.findById(9L)).thenReturn(Optional.of(model));
        when(campaignRepository.save(any(Campaign.class))).thenAnswer(invocation -> {
            Campaign campaign = invocation.getArgument(0);
            campaign.setId(11L);
            campaign.setCreatedAt(Instant.parse("2026-07-26T10:00:00Z"));
            return campaign;
        });
        AtomicLong participantIds = new AtomicLong(20);
        when(participantRepository.saveAll(anyList())).thenAnswer(invocation -> {
            List<CampaignParticipant> participants = invocation.getArgument(0);
            participants.forEach(participant -> {
                participant.setId(participantIds.incrementAndGet());
                participant.setCreatedAt(Instant.parse("2026-07-26T10:00:00Z"));
            });
            return participants;
        });

        CampaignDetailResponse created = service.createCampaign(request, creator);

        assertEquals(11L, created.getId());
        assertEquals("Quarterly review", created.getName());
        assertEquals(2, created.getParticipants().size());
        assertEquals("alice@example.com", created.getParticipants().get(0).getEmail());
        assertEquals("bob@example.com", created.getParticipants().get(1).getEmail());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<CampaignParticipant>> participantCaptor =
                ArgumentCaptor.forClass(List.class);
        verify(participantRepository).saveAll(participantCaptor.capture());
        List<CampaignParticipant> storedParticipants = participantCaptor.getValue();
        String firstHash = storedParticipants.get(0).getInvitationTokenHash();
        String secondHash = storedParticipants.get(1).getInvitationTokenHash();
        assertTrue(firstHash.matches("[0-9a-f]{64}"));
        assertTrue(secondHash.matches("[0-9a-f]{64}"));
        assertNotEquals(firstHash, secondHash);

        ArgumentCaptor<CampaignInvitationsCreatedEvent> eventCaptor =
                ArgumentCaptor.forClass(CampaignInvitationsCreatedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        CampaignInvitationsCreatedEvent event = eventCaptor.getValue();
        assertEquals("Quarterly review", event.campaignName());
        assertEquals("Security", event.maturityModelName());
        assertEquals(3, event.maturityModelVersion());
        assertEquals(2, event.invitations().size());
        assertEquals("alice@example.com", event.invitations().get(0).email());
        assertEquals("bob@example.com", event.invitations().get(1).email());
        assertEquals(
                firstHash,
                invitationTokenService.hash(event.invitations().get(0).rawToken())
        );
        assertEquals(
                secondHash,
                invitationTokenService.hash(event.invitations().get(1).rawToken())
        );
    }

    @Test
    void createCampaignRejectsDuplicateEmailsIgnoringCase() {
        when(maturityModelRepository.findById(9L)).thenReturn(Optional.of(model));

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> service.createCampaign(
                        request(List.of("person@example.com", " PERSON@example.com ")),
                        creator
                )
        );

        assertEquals("DUPLICATE_PARTICIPANT_EMAIL", exception.getErrorCode());
        verify(campaignRepository, never()).save(any(Campaign.class));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void createCampaignRejectsInactiveModels() {
        model.setIsActive(false);
        when(maturityModelRepository.findById(9L)).thenReturn(Optional.of(model));

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> service.createCampaign(
                        request(List.of("person@example.com")),
                        creator
                )
        );

        assertEquals("CAMPAIGN_MODEL_INACTIVE", exception.getErrorCode());
        verify(campaignRepository, never()).save(any(Campaign.class));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void detailLookupIsScopedToTheAuthenticatedCreator() {
        when(campaignRepository.findByIdAndCreatedById(44L, 7L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.getCampaign(44L, creator)
        );
        verify(participantRepository, never()).findWithAssessmentByCampaignId(44L);
    }

    @Test
    void listingReturnsParticipantAndDerivedCompletionCounts() {
        Campaign campaign = campaign();
        when(campaignRepository.findByCreatedByIdOrderByCreatedAtDesc(7L))
                .thenReturn(List.of(campaign));
        when(participantRepository.countByCampaignId(11L)).thenReturn(5L);
        when(participantRepository.countCompletedByCampaignId(
                11L,
                List.of(AssessmentStatus.PENDING_REVIEW, AssessmentStatus.COMPLETED)
        )).thenReturn(2L);

        List<CampaignSummaryResponse> campaigns =
                service.getCampaignsCreatedBy(creator);

        assertEquals(1, campaigns.size());
        assertEquals(5L, campaigns.get(0).getParticipantCount());
        assertEquals(2L, campaigns.get(0).getCompletedParticipantCount());
        assertEquals("Security", campaigns.get(0).getMaturityModelName());
    }

    @Test
    void aggregatesOnlyCompletedCampaignAssessments() {
        Campaign campaign = campaign();
        Assessment first = evaluatedAssessment(31L, 21L, "first@example.com", 3.0, "Managed");
        Assessment second = evaluatedAssessment(32L, 22L, "second@example.com", 5.0, "Optimised");
        Assessment pending = evaluatedAssessment(33L, 23L, "pending@example.com", 4.0, "Defined");
        pending.setStatus(AssessmentStatus.PENDING_REVIEW);
        when(campaignRepository.findByIdAndCreatedById(11L, 7L))
                .thenReturn(Optional.of(campaign));
        when(assessmentRepository.findByCampaignIdOrderByCreatedAtDescIdDesc(11L))
                .thenReturn(List.of(first, pending, second));
        when(participantRepository.countByCampaignId(11L)).thenReturn(4L);
        when(dimensionResultRepository.findByCampaignIdAndAssessmentStatus(
                11L,
                AssessmentStatus.COMPLETED
        )).thenReturn(List.of(
                dimensionResult("people", "People", 2.0),
                dimensionResult("people", "People", 4.0)
        ));

        CampaignResultsResponse results = service.getCampaignResults(11L, creator);

        assertEquals(4L, results.getParticipantCount());
        assertEquals(3L, results.getSubmittedParticipantCount());
        assertEquals(2L, results.getEvaluatedParticipantCount());
        assertEquals(4.0, results.getOverallAverage());
        assertEquals(3.0, results.getDimensions().get(0).getAverageScore());
        assertEquals(2L, results.getDimensions().get(0).getResponseCount());
        assertEquals(2, results.getParticipants().size());
        assertEquals("first@example.com", results.getParticipants().get(0).getEmail());
        assertEquals(2, results.getMaturityLevels().size());
    }

    @Test
    void deletesCreatorOwnedCampaignWithoutAssessmentHistory() {
        Campaign campaign = campaign();
        when(campaignRepository.findByIdAndCreatedById(11L, 7L))
                .thenReturn(Optional.of(campaign));
        when(assessmentRepository.existsByCampaignId(11L)).thenReturn(false);

        service.deleteCampaign(11L, creator);

        verify(campaignRepository).delete(campaign);
    }

    @Test
    void deleteCampaignIsScopedToTheAuthenticatedCreator() {
        when(campaignRepository.findByIdAndCreatedById(44L, 7L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.deleteCampaign(44L, creator)
        );
        verify(assessmentRepository, never()).existsByCampaignId(44L);
        verify(campaignRepository, never()).delete(any(Campaign.class));
    }

    @Test
    void rejectsDeletingCampaignWithAssessmentHistory() {
        Campaign campaign = campaign();
        when(campaignRepository.findByIdAndCreatedById(11L, 7L))
                .thenReturn(Optional.of(campaign));
        when(assessmentRepository.existsByCampaignId(11L)).thenReturn(true);

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> service.deleteCampaign(11L, creator)
        );

        assertEquals("CAMPAIGN_HAS_ASSESSMENTS", exception.getErrorCode());
        verify(campaignRepository, never()).delete(any(Campaign.class));
    }

    @Test
    void reissuingAnInvitationRotatesTheStoredHashAndReturnsRawTokenOnce() {
        Campaign campaign = campaign();
        CampaignParticipant participant = new CampaignParticipant();
        participant.setId(21L);
        participant.setCampaign(campaign);
        participant.setEmail("person@example.com");
        participant.setInvitationTokenHash("a".repeat(64));
        when(participantRepository.findByIdAndCampaignIdAndCampaignCreatedById(
                21L,
                11L,
                7L
        )).thenReturn(Optional.of(participant));

        CampaignInvitationResponse invitation =
                service.reissueInvitation(11L, 21L, creator);

        assertEquals(21L, invitation.getParticipantId());
        assertTrue(invitation.getInvitationToken().matches("[A-Za-z0-9_-]{43}"));
        assertTrue(participant.getInvitationTokenHash().matches("[0-9a-f]{64}"));
        assertNotEquals("a".repeat(64), participant.getInvitationTokenHash());
        verify(participantRepository).save(participant);
    }

    private CreateCampaignRequest request(List<String> participantEmails) {
        CreateCampaignRequest request = new CreateCampaignRequest();
        request.setName("  Quarterly review  ");
        request.setEndsAt(Instant.now().plusSeconds(86_400));
        request.setMaturityModelId(9L);
        request.setParticipantEmails(participantEmails);
        return request;
    }

    private Campaign campaign() {
        Campaign campaign = new Campaign();
        campaign.setId(11L);
        campaign.setName("Quarterly review");
        campaign.setEndsAt(Instant.now().plusSeconds(86_400));
        campaign.setMaturityModel(model);
        campaign.setCreatedBy(creator);
        campaign.setCreatedAt(Instant.parse("2026-07-26T10:00:00Z"));
        return campaign;
    }

    private Assessment evaluatedAssessment(
            Long assessmentId,
            Long participantId,
            String email,
            double score,
            String level
    ) {
        CampaignParticipant participant = new CampaignParticipant();
        participant.setId(participantId);
        participant.setEmail(email);
        Assessment assessment = new Assessment();
        assessment.setId(assessmentId);
        assessment.setCampaignParticipant(participant);
        assessment.setStatus(AssessmentStatus.COMPLETED);
        assessment.setOverallAverage(score);
        assessment.setOverallMaturityLevel(level);
        return assessment;
    }

    private DimensionResult dimensionResult(String id, String name, double score) {
        DimensionResult result = new DimensionResult();
        result.setDimensionId(id);
        result.setDimensionName(name);
        result.setAverageScore(score);
        return result;
    }
}
