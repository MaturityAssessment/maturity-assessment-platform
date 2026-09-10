package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MaturityModelSummaryDTO {
    private Long id;
    private String name;
    private String description;
    private Boolean isActive;
    private Boolean autoEvaluated;
    private Integer version;
    private Long baseModelId;
    private Long domainId;
    private String domainName;
    private String domainIconKey;
    private String domainColorKey;
    private String creatorName;
    private LocalDateTime createdAt;
    private int dimensionCount;
    private int moduleCount;
    private int totalQuestions;
    private int levelCount;
}
