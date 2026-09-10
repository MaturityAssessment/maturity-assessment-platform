package com.master_thesis.maturity_assessment.assessments.repository;

import com.master_thesis.maturity_assessment.assessments.models.QuestionEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionEvaluationRepository extends JpaRepository<QuestionEvaluation, Long> {
    List<QuestionEvaluation> findByAssessmentIdOrderByIdAsc(Long assessmentId);
    void deleteByAssessmentId(Long assessmentId);
}
