package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.campaigns.email.CampaignMailProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PasswordEmailService {
    private final JavaMailSender mailSender;
    private final CampaignMailProperties properties;

    // Synchronous: an SMTP failure must roll back account creation or the password reset.
    public void sendTemporaryPassword(String email, String temporaryPassword) {
        send(email, temporaryPassword, false);
    }

    public void sendWelcomePassword(String email, String temporaryPassword) {
        send(email, temporaryPassword, true);
    }

    private void send(String email, String temporaryPassword, boolean newAccount) {
        String unchangedMessage = newAccount ? "The account has not been created." : "The password has not been changed.";
        if (!properties.isEnabled() || properties.getFrom() == null || properties.getFrom().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Temporary password email is unavailable. " + unchangedMessage);
        }
        String baseUrl = properties.getFrontendBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://localhost:3000/filipevm";
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getFrom().trim());
        message.setTo(email);
        message.setSubject(newAccount ? "Welcome to Maturity Assessment — your account is ready" : "Your temporary password");
        message.setText("""
                Hello,

                %s

                Temporary password: %s

                Sign in at %s/login using your email address and this temporary password.
                You must choose a new password before continuing. Enter the temporary
                password in the current password field. It expires in 24 hours.

                %s
                If you did not expect this email, contact your administrator.
                """.formatted(
                newAccount ? "An administrator has created a maturity assessment account for you."
                        : "An administrator has reset your maturity assessment account password.",
                temporaryPassword, baseUrl.trim().replaceAll("/+$", ""),
                newAccount ? "Your account is approved and ready to use."
                        : "Your previous password and sessions no longer work."));
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            // Do not expose SMTP diagnostics, which can contain the email body.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The temporary password email could not be sent. " + unchangedMessage);
        }
    }
}
