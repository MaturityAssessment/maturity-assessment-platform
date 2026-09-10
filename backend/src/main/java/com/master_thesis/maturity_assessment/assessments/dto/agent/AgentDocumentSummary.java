package com.master_thesis.maturity_assessment.assessments.dto.agent;

import lombok.Data;

@Data
public class AgentDocumentSummary {
    private Long evidenceId;
    private Long questionId;
    private String evidenceType;
    private String fileName;
    private String urlHost;
    private String urlPath;
    private String summary;
    private Integer extractedCharacters;
    private Boolean truncated;
    private String warning;
}
