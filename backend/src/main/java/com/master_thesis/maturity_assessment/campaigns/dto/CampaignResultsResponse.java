package com.master_thesis.maturity_assessment.campaigns.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CampaignResultsResponse {
    private Long campaignId;
    private long participantCount;
    private long submittedParticipantCount;
    private long evaluatedParticipantCount;
    private Double overallAverage;
    private List<MaturityLevelResult> maturityLevels;
    private List<DimensionResult> dimensions;
    private List<ParticipantResult> participants;

    @Data
    public static class MaturityLevelResult {
        private String maturityLevel;
        private long participantCount;
        private double percentage;
    }

    @Data
    public static class DimensionResult {
        private String dimensionId;
        private String dimensionName;
        private double averageScore;
        private long responseCount;
    }

    @Data
    public static class ParticipantResult {
        private Long participantId;
        private String email;
        private Long assessmentId;
        private double overallScore;
        private String overallMaturityLevel;
        private LocalDateTime evaluatedAt;
    }
}
