package com.master_thesis.maturity_assessment.maturity_models.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "modules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = { "dimension", "practices", "gatingRules", "prerequisiteModuleCodes", "coRequisiteModuleCodes", "mutexModuleCodes", "reinforcesModuleCodes", "substitutesModuleCodes" })
@EqualsAndHashCode(exclude = { "dimension", "practices", "gatingRules", "prerequisiteModuleCodes", "coRequisiteModuleCodes", "mutexModuleCodes", "reinforcesModuleCodes", "substitutesModuleCodes" })
public class Module {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String code; // Unique within its parent dimension

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Version-scoped inclusion in questionnaires and all evaluation stages.
    @Column(nullable = false)
    @ColumnDefault("true")
    private Boolean visible = true;

    @ElementCollection
    @CollectionTable(name = "module_prerequisites", joinColumns = @JoinColumn(name = "module_id"),
            uniqueConstraints = @UniqueConstraint(columnNames = {"module_id", "prerequisite_module_code"}))
    @OrderColumn(name = "prerequisite_order")
    @Column(name = "prerequisite_module_code", nullable = false, length = 64)
    private List<String> prerequisiteModuleCodes = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "module_corequisites", joinColumns = @JoinColumn(name = "module_id"),
            uniqueConstraints = @UniqueConstraint(columnNames = {"module_id", "related_module_code"}))
    @OrderColumn(name = "relationship_order")
    @Column(name = "related_module_code", nullable = false, length = 64)
    private List<String> coRequisiteModuleCodes = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "module_mutex", joinColumns = @JoinColumn(name = "module_id"),
            uniqueConstraints = @UniqueConstraint(columnNames = {"module_id", "related_module_code"}))
    @OrderColumn(name = "relationship_order")
    @Column(name = "related_module_code", nullable = false, length = 64)
    private List<String> mutexModuleCodes = new ArrayList<>();

    // Informational editor annotations; never used as evaluation or visibility rules.
    @Column(name = "mandatory_badge", nullable = false)
    @ColumnDefault("false")
    private Boolean mandatoryBadge = false;

    @ElementCollection
    @CollectionTable(name = "module_reinforcement_badges", joinColumns = @JoinColumn(name = "module_id"))
    @OrderColumn(name = "badge_order")
    @Column(name = "target_module_code", nullable = false, length = 64)
    private List<String> reinforcesModuleCodes = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "module_substitution_badges", joinColumns = @JoinColumn(name = "module_id"))
    @OrderColumn(name = "badge_order")
    @Column(name = "target_module_code", nullable = false, length = 64)
    private List<String> substitutesModuleCodes = new ArrayList<>();

    // Weighting factor for aggregation (optional, defaults to 1.0)
    @Column(nullable = false)
    private Double weight = 1.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "aggregation_rule", nullable = false, length = 32)
    private AggregationRule aggregationRule = AggregationRule.WEIGHTED_AVERAGE;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dimension_id")
    private Dimension dimension;

    @OneToMany(mappedBy = "module", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Practice> practices;

    @OneToMany(mappedBy = "module", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @OrderBy("order ASC")
    private List<GatingRule> gatingRules;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
