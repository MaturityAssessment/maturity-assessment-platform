package com.master_thesis.maturity_assessment.assessments.dto.agent;

import lombok.Data;

@Data
public class AgentEvaluationWarning {
    private String severity;
    private Long questionId;
    private String responseKey;
    private String message;
    private String recommendation;
}
