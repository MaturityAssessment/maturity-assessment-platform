package com.master_thesis.maturity_assessment.campaigns.email;

import java.time.Instant;
import java.util.List;

public record CampaignInvitationsCreatedEvent(
        String campaignName,
        String maturityModelName,
        Integer maturityModelVersion,
        Instant endsAt,
        List<Invitation> invitations
) {

    public CampaignInvitationsCreatedEvent {
        invitations = List.copyOf(invitations);
    }

    public record Invitation(String email, String rawToken) {
    }
}
