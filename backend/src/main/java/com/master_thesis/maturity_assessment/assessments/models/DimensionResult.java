package com.master_thesis.maturity_assessment.assessments.models;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "dimension_results")
public class DimensionResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String dimensionId;

    @Column(nullable = false)
    private String dimensionName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String dimensionDescription;

    @Column(nullable = false)
    private Double averageScore;

    @Column(nullable = false)
    private String maturityLevel;

    @Column(name = "maturity_level_number")
    private Integer maturityLevelNumber;

    @Column(name = "percentage_score")
    private Double percentageScore; // 0-100 normalized score

    @Column(nullable = false)
    private Integer totalQuestions;

    @Column(nullable = false)
    private Double totalScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;
}
