package com.master_thesis.maturity_assessment.campaigns.dto;

import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class CampaignDetailResponse {
    private Long id;
    private String name;
    private Instant endsAt;
    private Long maturityModelId;
    private String maturityModelName;
    private Integer maturityModelVersion;
    private Instant createdAt;
    private Instant updatedAt;
    private List<CampaignParticipantResponse> participants;
}
