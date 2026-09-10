package com.master_thesis.maturity_assessment.campaigns.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class CampaignSummaryResponse {
    private Long id;
    private String name;
    private Instant endsAt;
    private Long maturityModelId;
    private String maturityModelName;
    private Integer maturityModelVersion;
    private long participantCount;
    private long completedParticipantCount;
    private Instant createdAt;
}
