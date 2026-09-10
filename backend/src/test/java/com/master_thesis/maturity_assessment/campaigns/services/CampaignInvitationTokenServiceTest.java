package com.master_thesis.maturity_assessment.campaigns.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CampaignInvitationTokenServiceTest {

    private final CampaignInvitationTokenService service =
            new CampaignInvitationTokenService();

    @Test
    void issuesHighEntropyUrlSafeTokensAndStableSha256Hashes() {
        CampaignInvitationTokenService.IssuedToken first = service.issue();
        CampaignInvitationTokenService.IssuedToken second = service.issue();

        assertTrue(first.rawToken().matches("[A-Za-z0-9_-]{43}"));
        assertTrue(first.tokenHash().matches("[0-9a-f]{64}"));
        assertEquals(first.tokenHash(), service.hash(first.rawToken()));
        assertNotEquals(first.rawToken(), second.rawToken());
        assertNotEquals(first.tokenHash(), second.tokenHash());
    }
}
