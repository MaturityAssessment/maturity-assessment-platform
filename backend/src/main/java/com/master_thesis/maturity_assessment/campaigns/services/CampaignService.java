package com.master_thesis.maturity_assessment.campaigns.services;

import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import com.master_thesis.maturity_assessment.assessments.models.DimensionResult;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.assessments.repository.DimensionResultRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.campaigns.email.CampaignInvitationsCreatedEvent;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignDetailResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignInvitationResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignParticipantResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignSummaryResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignResultsResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CreateCampaignRequest;
import com.master_thesis.maturity_assessment.campaigns.models.Campaign;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignParticipantRepository;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignRepository;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.config.ResourceNotFoundException;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private static final Pattern SIMPLE_EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final CampaignRepository campaignRepository;
    private final CampaignParticipantRepository participantRepository;
    private final AssessmentRepository assessmentRepository;
    private final DimensionResultRepository dimensionResultRepository;
    private final MaturityModelRepository maturityModelRepository;
    private final CampaignInvitationTokenService invitationTokenService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<CampaignSummaryResponse> getCampaignsCreatedBy(User creator) {
        requirePersistedUser(creator);
        return campaignRepository.findByCreatedByIdOrderByCreatedAtDesc(creator.getId())
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public CampaignDetailResponse getCampaign(Long campaignId, User creator) {
        requirePersistedUser(creator);
        Campaign campaign = campaignRepository.findByIdAndCreatedById(campaignId, creator.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found"));
        List<CampaignParticipant> participants =
                participantRepository.findWithAssessmentByCampaignId(campaignId);
        return toDetail(campaign, participants);
    }

    @Transactional(readOnly = true)
    public CampaignResultsResponse getCampaignResults(Long campaignId, User creator) {
        requirePersistedUser(creator);
        Campaign campaign = campaignRepository.findByIdAndCreatedById(campaignId, creator.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found"));
        List<Assessment> campaignAssessments =
                assessmentRepository.findByCampaignIdOrderByCreatedAtDescIdDesc(campaignId);
        List<Assessment> evaluatedAssessments = campaignAssessments.stream()
                .filter(assessment -> assessment.getStatus() == AssessmentStatus.COMPLETED)
                .toList();

        CampaignResultsResponse response = new CampaignResultsResponse();
        response.setCampaignId(campaign.getId());
        response.setParticipantCount(participantRepository.countByCampaignId(campaignId));
        response.setSubmittedParticipantCount(campaignAssessments.stream()
                .filter(assessment -> assessment.getStatus() == AssessmentStatus.PENDING_REVIEW
                        || assessment.getStatus() == AssessmentStatus.COMPLETED)
                .count());
        response.setEvaluatedParticipantCount(evaluatedAssessments.size());
        java.util.OptionalDouble overallAverage = evaluatedAssessments.stream()
                .map(Assessment::getOverallAverage)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average();
        response.setOverallAverage(
                overallAverage.isPresent() ? overallAverage.getAsDouble() : null
        );
        response.setMaturityLevels(buildMaturityLevelResults(evaluatedAssessments));
        response.setDimensions(buildDimensionResults(
                dimensionResultRepository.findByCampaignIdAndAssessmentStatus(
                        campaignId,
                        AssessmentStatus.COMPLETED
                )
        ));
        response.setParticipants(evaluatedAssessments.stream()
                .map(this::toParticipantResult)
                .toList());
        return response;
    }

    @Transactional
    public CampaignDetailResponse createCampaign(CreateCampaignRequest request, User creator) {
        requirePersistedUser(creator);
        validateRequest(request);

        MaturityModel model = maturityModelRepository.findById(request.getMaturityModelId())
                .orElseThrow(() -> new ResourceNotFoundException("Maturity model not found"));
        if (!Boolean.TRUE.equals(model.getIsActive())) {
            throw new IllegalOperationException(
                    "CAMPAIGN_MODEL_INACTIVE",
                    "Campaigns can only be created for an active maturity model."
            );
        }

        List<String> normalizedEmails = normalizeParticipantEmails(request.getParticipantEmails());

        Campaign campaign = new Campaign();
        campaign.setName(request.getName().trim());
        campaign.setEndsAt(request.getEndsAt());
        campaign.setMaturityModel(model);
        campaign.setCreatedBy(creator);
        Campaign savedCampaign = campaignRepository.save(campaign);

        List<CampaignInvitationsCreatedEvent.Invitation> invitations = new ArrayList<>();
        List<CampaignParticipant> participants = normalizedEmails.stream()
                .map(email -> newParticipant(savedCampaign, email, invitations))
                .toList();
        List<CampaignParticipant> savedParticipants = participantRepository.saveAll(participants);
        savedCampaign.setParticipants(new ArrayList<>(savedParticipants));

        eventPublisher.publishEvent(new CampaignInvitationsCreatedEvent(
                savedCampaign.getName(),
                model.getName(),
                model.getVersion(),
                savedCampaign.getEndsAt(),
                invitations
        ));

        return toDetail(savedCampaign, savedParticipants);
    }

    @Transactional
    public void deleteCampaign(Long campaignId, User creator) {
        requirePersistedUser(creator);
        Campaign campaign = campaignRepository.findByIdAndCreatedById(campaignId, creator.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found"));
        if (assessmentRepository.existsByCampaignId(campaignId)) {
            throw new IllegalOperationException(
                    "CAMPAIGN_HAS_ASSESSMENTS",
                    "Campaigns with participant assessments cannot be deleted."
            );
        }
        campaignRepository.delete(campaign);
    }

    @Transactional
    public CampaignInvitationResponse reissueInvitation(
            Long campaignId,
            Long participantId,
            User creator
    ) {
        requirePersistedUser(creator);
        CampaignParticipant participant = participantRepository
                .findByIdAndCampaignIdAndCampaignCreatedById(
                        participantId,
                        campaignId,
                        creator.getId()
                )
                .orElseThrow(() -> new ResourceNotFoundException("Campaign participant not found"));
        if (participant.getCampaign().getEndsAt() == null
                || !participant.getCampaign().getEndsAt().isAfter(Instant.now())) {
            throw new IllegalOperationException(
                    "CAMPAIGN_ENDED",
                    "Invitations cannot be issued after the campaign has ended."
            );
        }
        CampaignInvitationTokenService.IssuedToken issued = invitationTokenService.issue();
        participant.setInvitationTokenHash(issued.tokenHash());
        participant.setRevokedAt(null);
        participantRepository.save(participant);
        return new CampaignInvitationResponse(participant.getId(), issued.rawToken());
    }

    private CampaignParticipant newParticipant(
            Campaign campaign,
            String email,
            List<CampaignInvitationsCreatedEvent.Invitation> invitations
    ) {
        CampaignInvitationTokenService.IssuedToken issued = invitationTokenService.issue();
        CampaignParticipant participant = new CampaignParticipant();
        participant.setCampaign(campaign);
        participant.setEmail(email);
        participant.setInvitationTokenHash(issued.tokenHash());
        invitations.add(new CampaignInvitationsCreatedEvent.Invitation(email, issued.rawToken()));
        return participant;
    }

    private void validateRequest(CreateCampaignRequest request) {
        if (request == null) {
            throw new IllegalOperationException("INVALID_CAMPAIGN", "Campaign data is required.");
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalOperationException("INVALID_CAMPAIGN_NAME", "Campaign name is required.");
        }
        if (request.getName().trim().length() > 150) {
            throw new IllegalOperationException(
                    "INVALID_CAMPAIGN_NAME",
                    "Campaign name must be 150 characters or fewer."
            );
        }
        if (request.getEndsAt() == null || !request.getEndsAt().isAfter(Instant.now())) {
            throw new IllegalOperationException(
                    "INVALID_CAMPAIGN_END",
                    "Campaign end date must be in the future."
            );
        }
        if (request.getMaturityModelId() == null) {
            throw new IllegalOperationException(
                    "INVALID_CAMPAIGN_MODEL",
                    "A maturity model is required."
            );
        }
    }

    private List<String> normalizeParticipantEmails(List<String> participantEmails) {
        if (participantEmails == null || participantEmails.isEmpty()) {
            throw new IllegalOperationException(
                    "CAMPAIGN_PARTICIPANTS_REQUIRED",
                    "At least one participant email is required."
            );
        }

        List<String> normalized = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String rawEmail : participantEmails) {
            String email = rawEmail == null
                    ? ""
                    : rawEmail.trim().toLowerCase(Locale.ROOT);
            if (email.isEmpty() || email.length() > 255
                    || !SIMPLE_EMAIL_PATTERN.matcher(email).matches()) {
                throw new IllegalOperationException(
                        "INVALID_PARTICIPANT_EMAIL",
                        "Every campaign participant must have a valid email address."
                );
            }
            if (!seen.add(email)) {
                throw new IllegalOperationException(
                        "DUPLICATE_PARTICIPANT_EMAIL",
                        "Participant emails must be unique within a campaign."
                );
            }
            normalized.add(email);
        }
        return normalized;
    }

    private CampaignSummaryResponse toSummary(Campaign campaign) {
        CampaignSummaryResponse response = new CampaignSummaryResponse();
        response.setId(campaign.getId());
        response.setName(campaign.getName());
        response.setEndsAt(campaign.getEndsAt());
        response.setMaturityModelId(campaign.getMaturityModel().getId());
        response.setMaturityModelName(campaign.getMaturityModel().getName());
        response.setMaturityModelVersion(campaign.getMaturityModel().getVersion());
        response.setParticipantCount(participantRepository.countByCampaignId(campaign.getId()));
        response.setCompletedParticipantCount(
                participantRepository.countCompletedByCampaignId(
                        campaign.getId(),
                        List.of(AssessmentStatus.PENDING_REVIEW, AssessmentStatus.COMPLETED)
                )
        );
        response.setCreatedAt(campaign.getCreatedAt());
        return response;
    }

    private CampaignDetailResponse toDetail(
            Campaign campaign,
            List<CampaignParticipant> participants
    ) {
        CampaignDetailResponse response = new CampaignDetailResponse();
        response.setId(campaign.getId());
        response.setName(campaign.getName());
        response.setEndsAt(campaign.getEndsAt());
        response.setMaturityModelId(campaign.getMaturityModel().getId());
        response.setMaturityModelName(campaign.getMaturityModel().getName());
        response.setMaturityModelVersion(campaign.getMaturityModel().getVersion());
        response.setCreatedAt(campaign.getCreatedAt());
        response.setUpdatedAt(campaign.getUpdatedAt());
        response.setParticipants(participants.stream().map(this::toParticipant).toList());
        return response;
    }

    private CampaignParticipantResponse toParticipant(CampaignParticipant participant) {
        CampaignParticipantResponse response = new CampaignParticipantResponse();
        response.setId(participant.getId());
        response.setEmail(participant.getEmail());
        response.setCompleted(participant.hasCompleted());
        response.setRevokedAt(participant.getRevokedAt());
        response.setCreatedAt(participant.getCreatedAt());

        Assessment assessment = participant.getAssessment();
        if (assessment != null) {
            response.setAssessmentId(assessment.getId());
            response.setAssessmentStatus(
                    assessment.getStatus() != null ? assessment.getStatus().name() : null
            );
        }
        return response;
    }

    private List<CampaignResultsResponse.MaturityLevelResult> buildMaturityLevelResults(
            List<Assessment> assessments
    ) {
        Map<String, Long> counts = assessments.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        assessment -> assessment.getOverallMaturityLevel() == null
                                || assessment.getOverallMaturityLevel().isBlank()
                                ? "Not available"
                                : assessment.getOverallMaturityLevel(),
                        LinkedHashMap::new,
                        java.util.stream.Collectors.counting()
                ));
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(entry -> {
                    CampaignResultsResponse.MaturityLevelResult result =
                            new CampaignResultsResponse.MaturityLevelResult();
                    result.setMaturityLevel(entry.getKey());
                    result.setParticipantCount(entry.getValue());
                    result.setPercentage(assessments.isEmpty()
                            ? 0
                            : entry.getValue() * 100.0 / assessments.size());
                    return result;
                })
                .toList();
    }

    private List<CampaignResultsResponse.DimensionResult> buildDimensionResults(
            List<DimensionResult> dimensionResults
    ) {
        Map<String, DimensionAccumulator> dimensions = new LinkedHashMap<>();
        for (DimensionResult result : dimensionResults) {
            DimensionAccumulator accumulator = dimensions.computeIfAbsent(
                    result.getDimensionId(),
                    ignored -> new DimensionAccumulator(result.getDimensionName())
            );
            if (result.getAverageScore() != null) {
                accumulator.totalScore += result.getAverageScore();
                accumulator.responseCount += 1;
            }
        }
        return dimensions.entrySet().stream()
                .map(entry -> {
                    CampaignResultsResponse.DimensionResult result =
                            new CampaignResultsResponse.DimensionResult();
                    result.setDimensionId(entry.getKey());
                    result.setDimensionName(entry.getValue().name);
                    result.setResponseCount(entry.getValue().responseCount);
                    result.setAverageScore(entry.getValue().responseCount == 0
                            ? 0
                            : entry.getValue().totalScore / entry.getValue().responseCount);
                    return result;
                })
                .sorted(Comparator.comparing(CampaignResultsResponse.DimensionResult::getDimensionName))
                .toList();
    }

    private CampaignResultsResponse.ParticipantResult toParticipantResult(Assessment assessment) {
        CampaignResultsResponse.ParticipantResult result =
                new CampaignResultsResponse.ParticipantResult();
        CampaignParticipant participant = assessment.getCampaignParticipant();
        result.setParticipantId(participant != null ? participant.getId() : null);
        result.setEmail(participant != null ? participant.getEmail() : "Unknown participant");
        result.setAssessmentId(assessment.getId());
        result.setOverallScore(assessment.getOverallAverage() == null
                ? 0
                : assessment.getOverallAverage());
        result.setOverallMaturityLevel(assessment.getOverallMaturityLevel());
        result.setEvaluatedAt(assessment.getUpdatedAt());
        return result;
    }

    private static final class DimensionAccumulator {
        private final String name;
        private double totalScore;
        private long responseCount;

        private DimensionAccumulator(String name) {
            this.name = name;
        }
    }

    private void requirePersistedUser(User user) {
        if (user == null || user.getId() == null) {
            throw new IllegalOperationException("USER_REQUIRED", "Authenticated user is required.");
        }
    }
}
