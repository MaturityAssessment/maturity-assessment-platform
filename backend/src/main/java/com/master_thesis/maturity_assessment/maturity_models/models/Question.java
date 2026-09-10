package com.master_thesis.maturity_assessment.maturity_models.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = { "practice", "dependsOnQuestion" })
@EqualsAndHashCode(exclude = { "practice", "dependsOnQuestion" })
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private Double weight = 1.0;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;

    @Column(nullable = false)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String help;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "depends_on_question_id")
    private Question dependsOnQuestion;

    @Column(name = "requires_evidence", nullable = false)
    private Boolean requiresEvidence = false;

    @Column(name = "required", nullable = false, columnDefinition = "boolean default false")
    private Boolean required = false;

    /** For boolean questions, the answer that receives normalized score 1. */
    @Column(name = "boolean_correct_answer", nullable = false)
    private Boolean booleanCorrectAnswer = true;

    /** JSON options for multiple-choice answers. */
    @Column(name = "choice_options", columnDefinition = "TEXT")
    private String choiceOptions;

    /** Inclusive integer bounds for Numeric and Percentage questions. */
    @Column(name = "range_min", nullable = false)
    private Integer rangeMin = 0;

    @Column(name = "range_max", nullable = false)
    private Integer rangeMax = 100;

    /** True when the upper bound normalizes to 1; false when the lower bound does. */
    @Column(name = "range_high_value_is_maximum", nullable = false)
    private Boolean rangeHighValueIsMaximum = true;

    /** Independent point count for Scale (internally {@code likert}) questions. */
    @Column(name = "scale_point_count", nullable = false)
    private Integer scalePointCount = 5;

    @Column(name = "scale_min_label", length = 50)
    private String scaleMinLabel;

    @Column(name = "scale_max_label", length = 50)
    private String scaleMaxLabel;

    /** True when the highest numbered point normalizes to 1; false reverses the scale. */
    @Column(name = "scale_high_point_is_maximum", nullable = false)
    private Boolean scaleHighPointIsMaximum = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "practice_id")
    private Practice practice;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
