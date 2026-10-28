package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.campaigns.email.CampaignMailProperties;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordEmailServiceTest {
    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final CampaignMailProperties properties = new CampaignMailProperties();
    private final PasswordEmailService service = new PasswordEmailService(sender, properties);

    @Test
    void sendsTemporaryPasswordOnlyToTheAccountEmail() {
        enable();
        properties.setFrontendBaseUrl("https://example.com/filipevm/");
        service.sendTemporaryPassword("person@example.com", "temporary-secret");

        ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(message.capture());
        assertArrayEquals(new String[]{"person@example.com"}, message.getValue().getTo());
        assertEquals("accounts@example.com", message.getValue().getFrom());
        assertTrue(message.getValue().getText().contains("temporary-secret"));
        assertTrue(message.getValue().getText().contains("https://example.com/filipevm/login"));
        assertTrue(message.getValue().getText().contains("24 hours"));
    }

    @Test
    void disabledEmailFailsRatherThanSilentlyResettingPassword() {
        assertEquals(503, assertThrows(ResponseStatusException.class,
                () -> service.sendTemporaryPassword("person@example.com", "secret")).getStatusCode().value());
        verifyNoInteractions(sender);
    }

    @Test
    void missingSenderFailsBeforeContactingSmtp() {
        properties.setEnabled(true);
        assertThrows(ResponseStatusException.class,
                () -> service.sendTemporaryPassword("person@example.com", "secret"));
        verifyNoInteractions(sender);
    }

    @Test
    void smtpErrorIsSanitizedAndPropagatedForRollback() {
        enable();
        doThrow(new MailSendException("Diagnostic contains temporary-secret"))
                .when(sender).send(any(SimpleMailMessage.class));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.sendTemporaryPassword("person@example.com", "temporary-secret"));
        assertEquals(503, error.getStatusCode().value());
        assertFalse(error.getMessage().contains("temporary-secret"));
        assertNull(error.getCause());
    }

    private void enable() {
        properties.setEnabled(true);
        properties.setFrom("accounts@example.com");
    }
}
