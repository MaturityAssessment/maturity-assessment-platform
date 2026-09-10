package com.master_thesis.maturity_assessment.assessments.models;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "question_evaluations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_question_evaluation_assessment_response_key",
                columnNames = { "assessment_id", "response_key" }
        )
)
@Data
@NoArgsConstructor
@ToString(exclude = "assessment")
@EqualsAndHashCode(exclude = "assessment")
public class QuestionEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @Column(name = "response_key", nullable = false, length = 500)
    private String responseKey;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response", columnDefinition = "jsonb")
    private JsonNode response;

    @Column(name = "initial_score")
    private Double initialScore;

    @Column(name = "respondent_justification", columnDefinition = "TEXT")
    private String respondentJustification;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", length = 20)
    private QuestionEvaluationStatus validationStatus;

    @Column(name = "manual_score")
    private Double manualScore;

    @Column(name = "reviewer_note", columnDefinition = "TEXT")
    private String reviewerNote;

    @Column(name = "respondent_updated", nullable = false)
    private Boolean respondentUpdated = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
