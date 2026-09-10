package com.master_thesis.maturity_assessment.maturity_models.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;

/** Maps a dimension's normalized score to a maturity level. */
@Entity
@Table(
        name = "dimension_mapping_rules",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_dimension_mapping_rule_level",
                columnNames = { "dimension_id", "level_number" }
        )
)
@Data
@NoArgsConstructor
@ToString(exclude = "dimension")
@EqualsAndHashCode(exclude = "dimension")
public class DimensionMappingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "level_number", nullable = false)
    private Integer levelNumber;

    @Column(name = "minimum_score", nullable = false)
    private Double minimumScore;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dimension_id", nullable = false)
    private Dimension dimension;
}
