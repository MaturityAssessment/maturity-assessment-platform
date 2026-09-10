package com.master_thesis.maturity_assessment.campaigns.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignInvitationEmailService {

    private static final DateTimeFormatter DEADLINE_FORMAT = DateTimeFormatter
            .ofPattern("dd MMM uuuu 'at' HH:mm 'UTC'")
            .withZone(ZoneOffset.UTC);

    private final JavaMailSender mailSender;
    private final CampaignMailProperties properties;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendInvitations(CampaignInvitationsCreatedEvent event) {
        if (!properties.isEnabled()) {
            log.info(
                    "Campaign invitation email is disabled; skipped {} invitation(s)",
                    event.invitations().size()
            );
            return;
        }
        if (properties.getFrom() == null || properties.getFrom().isBlank()) {
            log.error("Campaign invitation email is enabled, but MAIL_FROM/MAIL_USERNAME is empty");
            return;
        }

        for (CampaignInvitationsCreatedEvent.Invitation invitation : event.invitations()) {
            try {
                mailSender.send(buildMessage(event, invitation));
                log.info("Sent campaign invitation email to {}", invitation.email());
            } catch (MailException exception) {
                log.error(
                        "Could not send campaign invitation email to {}: {}",
                        invitation.email(),
                        exception.getMessage()
                );
            }
        }
    }

    private SimpleMailMessage buildMessage(
            CampaignInvitationsCreatedEvent event,
            CampaignInvitationsCreatedEvent.Invitation invitation
    ) {
        String assessmentLink = frontendBaseUrl()
                + "/assessment?campaignToken="
                + invitation.rawToken();
        String modelVersion = event.maturityModelVersion() == null
                ? ""
                : " (version " + event.maturityModelVersion() + ")";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getFrom().trim());
        message.setTo(invitation.email());
        message.setSubject("Assessment invitation: " + singleLine(event.campaignName()));
        message.setText("""
                Hello,

                You have been invited to complete a maturity assessment.

                Campaign: %s
                Maturity model: %s%s
                Complete by: %s

                Start or resume your assessment:
                %s

                No account is required. This personal link is intended only for you.
                If you were not expecting this invitation, you can ignore this email.
                """.formatted(
                event.campaignName(),
                event.maturityModelName(),
                modelVersion,
                DEADLINE_FORMAT.format(event.endsAt()),
                assessmentLink
        ));
        return message;
    }

    private String frontendBaseUrl() {
        String configured = properties.getFrontendBaseUrl();
        String baseUrl = configured == null || configured.isBlank()
                ? "http://localhost:3000"
                : configured.trim();
        return baseUrl.replaceAll("/+$", "");
    }

    private String singleLine(String value) {
        return value.replace('\r', ' ').replace('\n', ' ').trim();
    }
}
