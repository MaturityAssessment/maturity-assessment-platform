package com.master_thesis.maturity_assessment.campaigns.repository;

import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CampaignParticipantRepository extends JpaRepository<CampaignParticipant, Long> {
    List<CampaignParticipant> findByCampaignIdOrderByCreatedAtAsc(Long campaignId);

    @EntityGraph(attributePaths = "assessment")
    @Query("""
            SELECT participant
            FROM CampaignParticipant participant
            WHERE participant.campaign.id = :campaignId
            ORDER BY participant.createdAt ASC
            """)
    List<CampaignParticipant> findWithAssessmentByCampaignId(
            @Param("campaignId") Long campaignId);

    long countByCampaignId(Long campaignId);

    @Query("""
            SELECT COUNT(participant)
            FROM CampaignParticipant participant
            JOIN participant.assessment assessment
            WHERE participant.campaign.id = :campaignId
              AND assessment.status IN :completedStatuses
            """)
    long countCompletedByCampaignId(
            @Param("campaignId") Long campaignId,
            @Param("completedStatuses") Collection<AssessmentStatus> completedStatuses
    );

    @EntityGraph(attributePaths = { "campaign", "campaign.maturityModel", "assessment" })
    Optional<CampaignParticipant> findByInvitationTokenHash(String invitationTokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = { "campaign", "campaign.maturityModel", "assessment" })
    @Query("""
            SELECT participant
            FROM CampaignParticipant participant
            WHERE participant.invitationTokenHash = :invitationTokenHash
            """)
    Optional<CampaignParticipant> findByInvitationTokenHashForUpdate(
            @Param("invitationTokenHash") String invitationTokenHash
    );

    @EntityGraph(attributePaths = { "campaign", "campaign.createdBy" })
    Optional<CampaignParticipant> findByIdAndCampaignIdAndCampaignCreatedById(
            Long id,
            Long campaignId,
            Long creatorId
    );

    @Query("""
            SELECT CASE WHEN COUNT(participant) > 0 THEN true ELSE false END
            FROM CampaignParticipant participant
            WHERE participant.campaign.id = :campaignId
              AND lower(participant.email) = lower(:email)
            """)
    boolean existsByCampaignIdAndEmailIgnoreCase(
            @Param("campaignId") Long campaignId,
            @Param("email") String email
    );
}
