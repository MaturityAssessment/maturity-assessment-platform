package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.auth.dto.CreateUserRequest;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.sql.SQLException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminUserServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final RefreshTokenService tokens = mock(RefreshTokenService.class);
    private final PasswordEmailService email = mock(PasswordEmailService.class);
    private final PasswordService passwords = new PasswordService(users, encoder, tokens, email, mock(EntityManager.class));
    private final AdminUserService service = new AdminUserService(users, passwords, email);

    @Test
    void createsApprovedAccountWithNormalizedProfileAndEmailedTemporaryPassword() {
        Instant before = Instant.now();
        User user = service.createUser(request());

        assertEquals("New User", user.getName());
        assertEquals("New@Example.COM", user.getEmail());
        assertEquals("Example Org", user.getOrganizationName());
        assertEquals(UserRole.USER, user.getRole());
        assertEquals(UserApprovalStatus.APPROVED, user.getApprovalStatus());
        assertTrue(user.isPasswordChangeRequired());
        assertTrue(user.getTemporaryPasswordExpiresAt().isAfter(before.plus(23, ChronoUnit.HOURS)));
        assertTrue(user.getTemporaryPasswordExpiresAt().isBefore(Instant.now().plus(25, ChronoUnit.HOURS)));
        ArgumentCaptor<String> password = ArgumentCaptor.forClass(String.class);
        var order = inOrder(users, email);
        order.verify(users).saveAndFlush(user);
        order.verify(email).sendWelcomePassword(eq("New@Example.COM"), password.capture());
        assertEquals(32, password.getValue().length());
        assertTrue(encoder.matches(password.getValue(), user.getPassword()));
        assertNotEquals(password.getValue(), user.getPassword());
        verifyNoInteractions(tokens);
    }

    @Test
    void rejectsExistingEmailRegardlessOfCaseWithoutSendingCredentials() {
        when(users.existsByEmailIgnoreCase("New@Example.COM")).thenReturn(true);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.createUser(request()))
                .getStatusCode().value());
        verify(users, never()).saveAndFlush(any());
        verifyNoInteractions(email, tokens);
    }

    @Test
    void concurrentDuplicateFailsBeforeEmailIsSent() {
        doThrow(new DataIntegrityViolationException("duplicate", new SQLException("unique violation", "23505")))
                .when(users).saveAndFlush(any());
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.createUser(request()))
                .getStatusCode().value());
        verifyNoInteractions(email);
    }

    @Test
    void retainsOptionalRoleSupportForApiClients() {
        CreateUserRequest request = request();
        request.setRole(UserRole.CURATOR);
        assertEquals(UserRole.CURATOR, service.createUser(request).getRole());
    }

    private CreateUserRequest request() {
        CreateUserRequest request = new CreateUserRequest();
        request.setName("  New User  ");
        request.setEmail("  New@Example.COM  ");
        request.setOrganizationName("  Example Org  ");
        return request;
    }
}
