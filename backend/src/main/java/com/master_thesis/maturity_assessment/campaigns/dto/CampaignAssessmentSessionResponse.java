package com.master_thesis.maturity_assessment.campaigns.dto;

import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import lombok.Data;

import java.time.Instant;

@Data
public class CampaignAssessmentSessionResponse {
    private String campaignName;
    private String participantEmail;
    private Instant endsAt;
    private AssessmentResponse assessment;
}
