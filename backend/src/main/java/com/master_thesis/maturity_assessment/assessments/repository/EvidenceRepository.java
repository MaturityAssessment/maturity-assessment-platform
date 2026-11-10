package com.master_thesis.maturity_assessment.assessments.repository;

import com.master_thesis.maturity_assessment.assessments.models.Evidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvidenceRepository extends JpaRepository<Evidence, Long> {
    @EntityGraph(attributePaths = "referencedQuestions")
    List<Evidence> findByAssessmentId(Long assessmentId);
    @EntityGraph(attributePaths = "referencedQuestions")
    List<Evidence> findByAssessmentIdOrderByIdAsc(Long assessmentId);
    @EntityGraph(attributePaths = "referencedQuestions")
    List<Evidence> findByAssessmentIdAndPracticeId(Long assessmentId, Long practiceId);

    boolean existsByPractice_Module_Dimension_MaturityModel_Id(Long maturityModelId);
}
