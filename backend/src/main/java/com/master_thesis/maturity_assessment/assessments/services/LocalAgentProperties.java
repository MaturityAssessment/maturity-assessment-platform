package com.master_thesis.maturity_assessment.assessments.services;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "local-agent")
@Data
public class LocalAgentProperties {
    private boolean enabled = false;
    private String baseUrl = "http://localhost:1234/v1";
    private String model = "";
    private String apiKey = "";
    private int timeoutSeconds = 120;
    private double temperature = 0.1;
    private int maxOutputTokens = 1800;
    private int maxEvidenceChars = 6000;
    private int maxEvidenceFileBytes = 5_242_880;
    private int maxPromptChars = 45_000;
    private int maxQuestionsPerBatch = 4;
}
