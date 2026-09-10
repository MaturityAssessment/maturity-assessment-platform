package com.master_thesis.maturity_assessment.assessments.dto;

import com.master_thesis.maturity_assessment.assessments.models.EvidenceType;
import lombok.Data;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@Builder
public class EvidenceDTO {
    private Long id;
    private String clientKey;
    private Long assessmentId;
    private Long questionId;
    private String description;
    private EvidenceType evidenceType;
    private String fileName;
    private Long fileSize;
    private String fileType;
    private String url;
    private LocalDateTime createdAt;
    private String downloadUrl;
}
