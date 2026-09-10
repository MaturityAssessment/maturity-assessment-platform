package com.master_thesis.maturity_assessment.campaigns.email;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class CampaignInvitationEmailServiceTest {

    private JavaMailSender mailSender;
    private CampaignMailProperties properties;
    private CampaignInvitationEmailService service;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        properties = new CampaignMailProperties();
        properties.setFrom("campaigns@example.com");
        properties.setFrontendBaseUrl("https://assessments.example.com/");
        service = new CampaignInvitationEmailService(mailSender, properties);
    }

    @Test
    void sendsOnePersonalizedAssessmentLinkPerParticipant() {
        properties.setEnabled(true);
        CampaignInvitationsCreatedEvent event = event();

        service.sendInvitations(event);

        ArgumentCaptor<SimpleMailMessage> messageCaptor =
                ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, org.mockito.Mockito.times(2)).send(messageCaptor.capture());
        List<SimpleMailMessage> messages = messageCaptor.getAllValues();

        SimpleMailMessage aliceMessage = messages.get(0);
        assertEquals("campaigns@example.com", aliceMessage.getFrom());
        assertEquals("alice@example.com", aliceMessage.getTo()[0]);
        assertEquals("Assessment invitation: Quarterly review", aliceMessage.getSubject());
        assertTrue(aliceMessage.getText().contains("Security (version 3)"));
        assertTrue(aliceMessage.getText().contains("31 Aug 2026 at 18:30 UTC"));
        assertTrue(aliceMessage.getText().contains(
                "https://assessments.example.com/assessment?campaignToken=" + "A".repeat(43)
        ));
        assertFalse(aliceMessage.getText().contains("bob@example.com"));
        assertFalse(aliceMessage.getText().contains("B".repeat(43)));

        SimpleMailMessage bobMessage = messages.get(1);
        assertEquals("bob@example.com", bobMessage.getTo()[0]);
        assertTrue(bobMessage.getText().contains(
                "https://assessments.example.com/assessment?campaignToken=" + "B".repeat(43)
        ));
        assertFalse(bobMessage.getText().contains("alice@example.com"));
        assertFalse(bobMessage.getText().contains("A".repeat(43)));
    }

    @Test
    void doesNotContactSmtpWhileEmailIsDisabled() {
        properties.setEnabled(false);

        service.sendInvitations(event());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void doesNotContactSmtpWhenEnabledWithoutASenderAddress() {
        properties.setEnabled(true);
        properties.setFrom(" ");

        service.sendInvitations(event());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    private CampaignInvitationsCreatedEvent event() {
        return new CampaignInvitationsCreatedEvent(
                "Quarterly review",
                "Security",
                3,
                Instant.parse("2026-08-31T18:30:00Z"),
                List.of(
                        new CampaignInvitationsCreatedEvent.Invitation(
                                "alice@example.com",
                                "A".repeat(43)
                        ),
                        new CampaignInvitationsCreatedEvent.Invitation(
                                "bob@example.com",
                                "B".repeat(43)
                        )
                )
        );
    }
}
