package com.master_thesis.maturity_assessment.campaigns.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class CampaignParticipantResponse {
    private Long id;
    private String email;
    private boolean completed;
    private Long assessmentId;
    private String assessmentStatus;
    private Instant revokedAt;
    private Instant createdAt;
}
