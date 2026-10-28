package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.auth.dto.ChangePasswordRequest;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.config.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final RefreshTokenService tokens = mock(RefreshTokenService.class);
    private final PasswordEmailService email = mock(PasswordEmailService.class);
    private final PasswordService service = new PasswordService(users, encoder, tokens, email,
            mock(jakarta.persistence.EntityManager.class));
    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(7L);
        user.setEmail("person@example.com");
        user.setPassword(encoder.encode("old-password-123"));
        when(users.findByIdForUpdate(7L)).thenReturn(Optional.of(user));
    }

    @Test
    void changesPasswordAndRevokesEverySession() {
        user.setPasswordChangeRequired(true);
        user.setTemporaryPasswordExpiresAt(Instant.now().plusSeconds(300));
        service.changePassword(7L, request("old-password-123", "new-password-456"));

        assertTrue(encoder.matches("new-password-456", user.getPassword()));
        assertFalse(encoder.matches("old-password-123", user.getPassword()));
        assertEquals(1, user.getPasswordVersion());
        assertFalse(user.isPasswordChangeRequired());
        assertNull(user.getTemporaryPasswordExpiresAt());
        verify(tokens).revokeAllUserTokens(user);
        verifyNoInteractions(email);
    }

    @Test
    void rejectsWrongCurrentPasswordWithoutChangingCredentialsOrSessions() {
        String original = user.getPassword();
        IllegalOperationException error = assertThrows(IllegalOperationException.class,
                () -> service.changePassword(7L, request("incorrect", "new-password-456")));
        assertEquals("INCORRECT_CURRENT_PASSWORD", error.getErrorCode());
        assertEquals(original, user.getPassword());
        verify(users, never()).save(any());
        verifyNoInteractions(tokens, email);
    }

    @Test
    void rejectsConfirmationMismatch() {
        ChangePasswordRequest request = request("old-password-123", "new-password-456");
        request.setConfirmPassword("new-password-789");
        assertEquals("PASSWORD_CONFIRMATION_MISMATCH", assertThrows(IllegalOperationException.class,
                () -> service.changePassword(7L, request)).getErrorCode());
        verifyNoInteractions(tokens, email);
    }

    @Test
    void rejectsSamePassword() {
        assertEquals("PASSWORD_UNCHANGED", assertThrows(IllegalOperationException.class,
                () -> service.changePassword(7L, request("old-password-123", "old-password-123"))).getErrorCode());
    }

    @Test
    void rejectsShortBlankAndOverlongUtf8Passwords() {
        for (String password : new String[]{"short", " ".repeat(12), "a".repeat(73), "é".repeat(37)}) {
            assertEquals("INVALID_NEW_PASSWORD", assertThrows(IllegalOperationException.class,
                    () -> service.changePassword(7L, request("old-password-123", password))).getErrorCode());
        }
        verifyNoInteractions(tokens, email);
    }

    @Test
    void expiredTemporaryPasswordCannotBeUsedToChangePassword() {
        user.setTemporaryPasswordExpiresAt(Instant.now().minusSeconds(1));
        assertEquals("TEMPORARY_PASSWORD_EXPIRED", assertThrows(IllegalOperationException.class,
                () -> service.changePassword(7L, request("old-password-123", "new-password-456"))).getErrorCode());
        verifyNoInteractions(tokens, email);
    }

    @Test
    void resetEmailsUniqueGeneratedPasswordsAndStoresOnlyHashes() {
        Instant before = Instant.now();
        service.resetPassword(7L);
        String firstHash = user.getPassword();
        assertTrue(user.isPasswordChangeRequired());
        assertTrue(user.getTemporaryPasswordExpiresAt().isAfter(before.plus(23, ChronoUnit.HOURS)));
        assertTrue(user.getTemporaryPasswordExpiresAt().isBefore(Instant.now().plus(25, ChronoUnit.HOURS)));
        service.resetPassword(7L);

        ArgumentCaptor<String> passwords = ArgumentCaptor.forClass(String.class);
        verify(email, times(2)).sendTemporaryPassword(eq(user.getEmail()), passwords.capture());
        String first = passwords.getAllValues().get(0);
        String second = passwords.getAllValues().get(1);
        assertEquals(32, first.length());
        assertNotEquals(first, second);
        assertTrue(encoder.matches(first, firstHash));
        assertTrue(encoder.matches(second, user.getPassword()));
        assertFalse(encoder.matches(first, user.getPassword()));
        assertNotEquals(second, user.getPassword());
        assertEquals(2, user.getPasswordVersion());
        verify(tokens, times(2)).revokeAllUserTokens(user);
    }

    @Test
    void rejectsPendingAndMissingAccountsWithoutSendingEmail() {
        user.setApprovalStatus(UserApprovalStatus.PENDING);
        assertEquals("ACCOUNT_NOT_APPROVED", assertThrows(IllegalOperationException.class,
                () -> service.resetPassword(7L)).getErrorCode());
        when(users.findByIdForUpdate(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.resetPassword(99L));
        verifyNoInteractions(tokens, email);
    }

    private ChangePasswordRequest request(String current, String next) {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(current);
        request.setNewPassword(next);
        request.setConfirmPassword(next);
        return request;
    }
}
