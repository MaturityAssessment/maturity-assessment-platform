package com.master_thesis.maturity_assessment.assessments.dto;

import com.master_thesis.maturity_assessment.assessments.models.EvidenceType;
import lombok.Data;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.List;

@Data
public class EvidenceSubmissionItemRequest {
    private Long evidenceId;
    private String itemKey;
    private String clientKey;
    private Long practiceId;
    @JsonDeserialize(contentUsing = QuestionReferenceIdDeserializer.class)
    private List<Long> referencedQuestionIds;
    private EvidenceType type;
    private String description;
    private String url;
}
