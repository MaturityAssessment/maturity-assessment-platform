package com.master_thesis.maturity_assessment.campaigns.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CampaignInvitationResponse {
    private Long participantId;
    private String invitationToken;
}
