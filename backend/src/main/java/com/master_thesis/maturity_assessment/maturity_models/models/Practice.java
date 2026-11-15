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
import java.util.List;

@Entity
@Table(name = "practices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = { "module", "questions" })
@EqualsAndHashCode(exclude = { "module", "questions" })
public class Practice {

    @ElementCollection
    @CollectionTable(name = "practice_evidence_requirements", joinColumns = @JoinColumn(name = "practice_id"))
    @OrderColumn(name = "sort_order")
    private List<EvidenceRequirement> evidenceRequirements = new java.util.ArrayList<>();

    @Column(name = "requires_evidence", nullable = false)
    private Boolean requiresEvidence = false;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Double weight = 1.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "aggregation_rule", nullable = false, length = 32)
    private AggregationRule aggregationRule = AggregationRule.WEIGHTED_AVERAGE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    private Module module;

    @OneToMany(mappedBy = "practice", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<Question> questions;

    @Column(name = "minimum_coverage", nullable = false)
    private Double minimumCoverage = 0.0;

    @Column(name = "minimum_included_count", nullable = false)
    private Double minimumIncludedCount = 0.0;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "child_state_gating_rules", columnDefinition = "jsonb", nullable = false)
    private List<ChildStateGatingRule> childStateGatingRules = new java.util.ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
