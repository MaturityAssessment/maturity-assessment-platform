package com.master_thesis.maturity_assessment.assessments.dto;

import com.master_thesis.maturity_assessment.assessments.models.EvidenceType;
import lombok.Data;

@Data
public class EvidenceSubmissionItemRequest {
    private Long evidenceId;
    private String itemKey;
    private String clientKey;
    private Long practiceId;
    private EvidenceType type;
    private String description;
    private String url;
}
