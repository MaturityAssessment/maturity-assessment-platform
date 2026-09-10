package com.master_thesis.maturity_assessment.assessments.repository;

import com.master_thesis.maturity_assessment.assessments.models.Evidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvidenceRepository extends JpaRepository<Evidence, Long> {
    List<Evidence> findByAssessmentId(Long assessmentId);
    List<Evidence> findByAssessmentIdOrderByIdAsc(Long assessmentId);
    List<Evidence> findByAssessmentIdAndQuestionId(Long assessmentId, Long questionId);

    boolean existsByQuestion_Practice_Module_Dimension_MaturityModel_Id(Long maturityModelId);
}
