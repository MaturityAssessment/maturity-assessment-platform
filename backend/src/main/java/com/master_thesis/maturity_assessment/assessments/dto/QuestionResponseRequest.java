package com.master_thesis.maturity_assessment.assessments.dto;

import lombok.Data;

@Data
public class QuestionResponseRequest {
    private Long questionId;
    private Object response;
    private String respondentJustification;
}
