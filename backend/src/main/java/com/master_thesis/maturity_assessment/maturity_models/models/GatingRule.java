package com.master_thesis.maturity_assessment.maturity_models.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "gating_rules")
@Data
@NoArgsConstructor
@ToString(exclude = { "practice", "module", "dimension" })
@EqualsAndHashCode(exclude = { "practice", "module", "dimension" })
public class GatingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_order", nullable = false)
    private Integer order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private GatingSelection selection;

    @Column(name = "child_code", length = 64)
    private String childCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "comparison_operator", nullable = false, length = 32)
    private GatingComparisonOperator operator;

    @Column(nullable = false, precision = 3, scale = 2)
    private java.math.BigDecimal threshold;

    @Enumerated(EnumType.STRING)
    @Column(name = "score_operation", nullable = false, length = 32)
    private GatingScoreOperation operation;

    @Column(name = "operation_value", nullable = false, precision = 3, scale = 2)
    private java.math.BigDecimal value;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "practice_id")
    private Practice practice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    private Module module;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dimension_id")
    private Dimension dimension;
}
