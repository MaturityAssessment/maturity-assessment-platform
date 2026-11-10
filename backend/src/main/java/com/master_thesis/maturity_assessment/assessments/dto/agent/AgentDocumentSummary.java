package com.master_thesis.maturity_assessment.assessments.dto.agent;

import lombok.Data;
import java.util.List;

@Data
public class AgentDocumentSummary {
    private Long evidenceId;
    private Long practiceId;
    private List<Long> referencedQuestionIds = List.of();
    private String evidenceType;
    private String fileName;
    private String urlHost;
    private String urlPath;
    private String summary;
    private Integer extractedCharacters;
    private Boolean truncated;
    private String warning;
}
