package com.master_thesis.maturity_assessment.campaigns.repository;

import com.master_thesis.maturity_assessment.campaigns.models.Campaign;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    @EntityGraph(attributePaths = "maturityModel")
    List<Campaign> findByCreatedByIdOrderByCreatedAtDesc(Long createdByUserId);

    List<Campaign> findByMaturityModelIdOrderByCreatedAtDesc(Long maturityModelId);

    @EntityGraph(attributePaths = "maturityModel")
    Optional<Campaign> findByIdAndCreatedById(Long id, Long createdByUserId);
}
