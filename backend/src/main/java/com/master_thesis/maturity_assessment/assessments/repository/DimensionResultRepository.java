package com.master_thesis.maturity_assessment.assessments.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.master_thesis.maturity_assessment.assessments.models.DimensionResult;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface DimensionResultRepository extends JpaRepository<DimensionResult, Long> {
    List<DimensionResult> findByAssessmentId(Long assessmentId);
    void deleteByAssessmentId(Long assessmentId);

    List<DimensionResult> findByDimensionId(String dimensionId);

    List<DimensionResult> findByMaturityLevel(String maturityLevel);

    @Query("""
            SELECT result
            FROM DimensionResult result
            WHERE result.assessment.campaign.id = :campaignId
              AND result.assessment.status = :status
            """)
    List<DimensionResult> findByCampaignIdAndAssessmentStatus(
            @Param("campaignId") Long campaignId,
            @Param("status") AssessmentStatus status
    );
}
