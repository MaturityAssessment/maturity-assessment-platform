package com.master_thesis.maturity_assessment.maturity_models.models;

import com.master_thesis.maturity_assessment.auth.models.User;
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
@Table(name = "maturity_models")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = { "createdBy", "levels", "dimensions" })
@EqualsAndHashCode(exclude = { "createdBy", "levels", "dimensions" })
public class MaturityModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "changelog_markdown", columnDefinition = "TEXT")
    private String changelogMarkdown;

    @Column(nullable = false)
    private Boolean isActive = false;

    @Column(nullable = false)
    private Boolean autoEvaluated = true;

    @Column(nullable = false)
    private Integer version = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "aggregation_rule", nullable = false, length = 32)
    private AggregationRule aggregationRule = AggregationRule.WEIGHTED_AVERAGE;

    @Column(name = "base_model_id")
    private Long baseModelId; // Links all versions of the same model (points to version 1)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domain_id")
    private Domain domain;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @OneToMany(mappedBy = "maturityModel", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<MaturityLevel> levels;

    @OneToMany(mappedBy = "maturityModel", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<Dimension> dimensions;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
