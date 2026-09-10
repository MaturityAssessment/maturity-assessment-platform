package com.master_thesis.maturity_assessment.maturity_models.dto;

import com.master_thesis.maturity_assessment.maturity_models.models.GatingComparisonOperator;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingScoreOperation;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingSelection;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class GatingRuleDTO {
    private Integer order;
    private GatingSelection selection;
    private String childCode;
    private GatingComparisonOperator operator;
    private BigDecimal threshold;
    private GatingScoreOperation operation;
    private BigDecimal value;
}
