package com.master_thesis.maturity_assessment.assessments.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
    List<Assessment> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    List<Assessment> findByOverallMaturityLevel(String maturityLevel);

    List<Assessment> findByStatusOrderByUpdatedAtDescIdDesc(AssessmentStatus status);

    List<Assessment> findByUserIdAndStatusOrderByUpdatedAtDescIdDesc(Long userId, AssessmentStatus status);

    Optional<Assessment> findByUserIdAndMaturityModelIdAndStatus(Long userId, Long maturityModelId, AssessmentStatus status);

    List<Assessment> findByUserIdAndStatusAndMaturityModelIdInOrderByUpdatedAtDescIdDesc(
            Long userId,
            AssessmentStatus status,
            Collection<Long> maturityModelIds
    );

    List<Assessment> findByMaturityModelId(Long maturityModelId);

    @EntityGraph(attributePaths = "campaignParticipant")
    List<Assessment> findByCampaignIdOrderByCreatedAtDescIdDesc(Long campaignId);

    boolean existsByCampaignId(Long campaignId);

    Optional<Assessment> findByCampaignParticipantId(Long campaignParticipantId);

    @Query("""
            SELECT a
            FROM Assessment a
            LEFT JOIN FETCH a.user
            LEFT JOIN FETCH a.campaign
            LEFT JOIN FETCH a.campaignParticipant
            ORDER BY a.createdAt DESC
            """)
    List<Assessment> findAllWithUser();

    @Query("""
            SELECT a
            FROM Assessment a
            LEFT JOIN FETCH a.user
            LEFT JOIN FETCH a.campaign
            LEFT JOIN FETCH a.campaignParticipant
            WHERE a.id = :id
            """)
    Optional<Assessment> findByIdWithUser(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Assessment a JOIN FETCH a.user WHERE a.id = :id")
    Optional<Assessment> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT a
            FROM Assessment a
            JOIN FETCH a.campaignParticipant participant
            JOIN FETCH a.campaign campaign
            WHERE a.id = :id AND participant.id = :participantId
            """)
    Optional<Assessment> findCampaignAssessmentByIdForUpdate(
            @Param("id") Long id,
            @Param("participantId") Long participantId
    );
}
