package com.master_thesis.maturity_assessment.assessments.repository;

import com.master_thesis.maturity_assessment.assessments.models.AssessmentLog;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.repository.Repository;

/** No update/delete operations are exposed for audit records. */
public interface AssessmentLogRepository extends Repository<AssessmentLog, Long> {
    AssessmentLog save(AssessmentLog entry);
    Slice<AssessmentLog> findByAssessmentIdOrderByOccurredAtDescIdDesc(Long assessmentId, Pageable pageable);
    @Query(value = """
            SELECT l.* FROM assessment_logs l
            WHERE l.assessment_id = :assessmentId AND (:scoped = false OR (
                (l.target_type = 'QUESTION' AND l.target_id IN (:questionIds)) OR
                (l.target_type = 'EVIDENCE' AND (
                    ((l.before_value ->> 'practiceId')::bigint IN (:practiceIds) AND
                        (CAST(:questionId AS bigint) IS NULL OR coalesce(l.before_value -> 'referencedQuestionIds', '[]'::jsonb) = '[]'::jsonb
                         OR (l.before_value -> 'referencedQuestionIds') @> jsonb_build_array(CAST(:questionId AS bigint)))) OR
                    ((l.after_value ->> 'practiceId')::bigint IN (:practiceIds) AND
                        (CAST(:questionId AS bigint) IS NULL OR coalesce(l.after_value -> 'referencedQuestionIds', '[]'::jsonb) = '[]'::jsonb
                         OR (l.after_value -> 'referencedQuestionIds') @> jsonb_build_array(CAST(:questionId AS bigint))))
                ))
            )) AND (
                :category = 'ALL' OR (:category = 'LIFECYCLE' AND l.action IN ('ASSESSMENT_CREATED','ASSESSMENT_SUBMITTED','ASSESSMENT_RESUBMITTED','ASSESSMENT_RESET','EVALUATION_COMPLETED','CHANGES_REQUESTED','ASSESSMENT_STATUS_CHANGED'))
                OR (:category = 'EVIDENCE' AND l.target_type = 'EVIDENCE')
                OR (:category = 'RESPONDENT' AND l.actor_role = 'RESPONDENT' AND l.target_type <> 'EVIDENCE' AND NOT l.action IN ('ASSESSMENT_CREATED','ASSESSMENT_SUBMITTED','ASSESSMENT_RESUBMITTED','ASSESSMENT_RESET','EVALUATION_COMPLETED','CHANGES_REQUESTED','ASSESSMENT_STATUS_CHANGED'))
                OR (:category = 'EVALUATOR' AND l.actor_role = 'EVALUATOR' AND l.target_type <> 'EVIDENCE' AND NOT l.action IN ('ASSESSMENT_CREATED','ASSESSMENT_SUBMITTED','ASSESSMENT_RESUBMITTED','ASSESSMENT_RESET','EVALUATION_COMPLETED','CHANGES_REQUESTED','ASSESSMENT_STATUS_CHANGED'))
            ) ORDER BY l.occurred_at DESC, l.id DESC
            """, nativeQuery = true)
    Slice<AssessmentLog> findInScope(@Param("assessmentId") Long assessmentId,
            @Param("questionIds") List<Long> questionIds, @Param("practiceIds") List<Long> practiceIds,
            @Param("questionId") Long questionId, @Param("scoped") boolean scoped, @Param("category") String category, Pageable pageable);
}
