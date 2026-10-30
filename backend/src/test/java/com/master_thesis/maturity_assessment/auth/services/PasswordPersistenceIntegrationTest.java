package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.auth.dto.ChangePasswordRequest;
import com.master_thesis.maturity_assessment.auth.dto.CreateUserRequest;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.eq;

// This test creates/drops schema: run only against an explicitly supplied disposable database.
@EnabledIfEnvironmentVariable(named = "PASSWORD_TEST_DB_URL", matches = ".+")
@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({AccountProvisioningService.class, PasswordService.class, AdminUserService.class, RefreshTokenService.class, PasswordPersistenceIntegrationTest.Config.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PasswordPersistenceIntegrationTest {
    @Autowired private AccountProvisioningService provisioning;
    @Autowired private PasswordService passwords;
    @Autowired private AdminUserService adminUsers;
    @Autowired private RefreshTokenService tokens;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder encoder;
    @MockitoBean private PasswordEmailService email;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void hibernateSchemaDefaultsKeepExistingAccountsOutOfOnboarding() {
        User user = createUser();
        jdbc.update("UPDATE users SET profile_completion_required = DEFAULT, initial_credentials_pending = DEFAULT WHERE id = ?",
                user.getId());
        User stored = users.findById(user.getId()).orElseThrow();
        assertFalse(stored.isProfileCompletionRequired());
        assertFalse(stored.isInitialCredentialsPending());
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> System.getenv("PASSWORD_TEST_DB_URL"));
        properties.add("spring.datasource.username", () -> System.getenv().getOrDefault("PASSWORD_TEST_DB_USER", "postgres"));
        properties.add("spring.datasource.password", () -> "");
    }

    @Test
    void simultaneousInvitationsReuseOnePendingAccount() throws Exception {
        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_ci ON users(lower(email))");
        String address = "concurrent-" + UUID.randomUUID() + "@example.com";
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var one = pool.submit(() -> { start.await(); return provisioning.findOrCreateInvitee(address).getId(); });
            var two = pool.submit(() -> { start.await(); return provisioning.findOrCreateInvitee(address.toUpperCase()).getId(); });
            start.countDown();
            assertEquals(one.get(10, java.util.concurrent.TimeUnit.SECONDS), two.get(10, java.util.concurrent.TimeUnit.SECONDS));
        }
        org.mockito.Mockito.verifyNoInteractions(email);
    }

    @Test
    void campaignAccountWaitsForApprovalThenCompletesProfile() {
        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_ci ON users(lower(email))");
        String address = "invite-" + UUID.randomUUID() + "@example.com";
        User invited = provisioning.findOrCreateInvitee(address);
        assertEquals(UserApprovalStatus.PENDING, invited.getApprovalStatus());
        assertTrue(invited.isInitialCredentialsPending());
        assertTrue(invited.isProfileCompletionRequired());
        assertNull(invited.getName());
        assertEquals(invited.getId(), provisioning.findOrCreateInvitee(address.toUpperCase()).getId());
        org.mockito.Mockito.verifyNoInteractions(email);
        User approved = provisioning.approve(invited.getId());
        assertEquals(UserApprovalStatus.APPROVED, approved.getApprovalStatus());
        assertTrue(approved.isPasswordChangeRequired());
        assertFalse(approved.isInitialCredentialsPending());
        verify(email).sendWelcomePassword(eq(address), anyString());
        assertThrows(ResponseStatusException.class, () -> provisioning.approve(invited.getId()));
        User completed = provisioning.completeProfile(invited.getId(), " Name ", " Org ");
        assertEquals("Name", completed.getName());
        assertEquals("Org", completed.getOrganizationName());
        assertFalse(completed.isProfileCompletionRequired());
    }

    @Test
    void failedApprovalMailKeepsPendingAccountRetryable() {
        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_ci ON users(lower(email))");
        User invited = provisioning.findOrCreateInvitee("invite-" + UUID.randomUUID() + "@example.com");
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE))
                .when(email).sendWelcomePassword(anyString(), anyString());
        assertThrows(ResponseStatusException.class, () -> provisioning.approve(invited.getId()));
        User stored = users.findById(invited.getId()).orElseThrow();
        assertEquals(UserApprovalStatus.PENDING, stored.getApprovalStatus());
        assertTrue(stored.isInitialCredentialsPending());
        org.mockito.Mockito.reset(email);
        assertEquals(UserApprovalStatus.APPROVED, provisioning.approve(invited.getId()).getApprovalStatus());
    }

    @Test
    void failedWelcomeEmailRollsBackNewAccountSoCreationCanBeRetried() {
        CreateUserRequest request = accountRequest();
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SMTP unavailable"))
                .when(email).sendWelcomePassword(anyString(), anyString());

        assertThrows(ResponseStatusException.class, () -> adminUsers.createUser(request));
        assertFalse(users.existsByEmailIgnoreCase(request.getEmail()));
    }

    @Test
    void existingPendingAccountCannotBeDuplicatedUsingDifferentEmailCase() {
        User pending = createUser();
        pending.setApprovalStatus(UserApprovalStatus.PENDING);
        users.saveAndFlush(pending);
        CreateUserRequest request = accountRequest();
        request.setEmail(pending.getEmail().toUpperCase(java.util.Locale.ROOT));

        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> adminUsers.createUser(request)).getStatusCode().value());
        org.mockito.Mockito.verifyNoInteractions(email);
    }

    @Test
    void createdAccountCanReplaceItsEmailedTemporaryPasswordUsingExistingFlow() {
        User created = adminUsers.createUser(accountRequest());
        ArgumentCaptor<String> temporaryPassword = ArgumentCaptor.forClass(String.class);
        verify(email).sendWelcomePassword(eq(created.getEmail()), temporaryPassword.capture());
        User stored = users.findById(created.getId()).orElseThrow();
        assertEquals("New User", stored.getName());
        assertEquals("Example Org", stored.getOrganizationName());
        assertEquals(UserRole.USER, stored.getRole());
        assertTrue(stored.isEnabled());
        assertTrue(stored.isCredentialsNonExpired());
        assertTrue(stored.isPasswordChangeRequired());
        assertTrue(encoder.matches(temporaryPassword.getValue(), stored.getPassword()));

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(temporaryPassword.getValue());
        request.setNewPassword("chosen-new-password-456");
        request.setConfirmPassword("chosen-new-password-456");
        passwords.changePassword(created.getId(), request);

        User updated = users.findById(created.getId()).orElseThrow();
        assertTrue(encoder.matches("chosen-new-password-456", updated.getPassword()));
        assertFalse(encoder.matches(temporaryPassword.getValue(), updated.getPassword()));
        assertFalse(updated.isPasswordChangeRequired());
        assertNull(updated.getTemporaryPasswordExpiresAt());
    }

    private CreateUserRequest accountRequest() {
        CreateUserRequest request = new CreateUserRequest();
        request.setName("New User");
        request.setEmail(UUID.randomUUID() + "@example.com");
        request.setOrganizationName("Example Org");
        return request;
    }

    @Test
    void failedEmailRollsBackPasswordStateAndTokenDeletion() {
        User user = createUser();
        String token = tokens.createRefreshToken(user).getToken();
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SMTP unavailable"))
                .when(email).sendTemporaryPassword(anyString(), anyString());

        assertThrows(ResponseStatusException.class, () -> passwords.resetPassword(user.getId()));

        User stored = users.findById(user.getId()).orElseThrow();
        assertTrue(encoder.matches("original-password-123", stored.getPassword()));
        assertEquals(0, stored.getPasswordVersion());
        assertFalse(stored.isPasswordChangeRequired());
        assertNull(stored.getTemporaryPasswordExpiresAt());
        assertTrue(tokens.findByToken(token).isPresent());
    }

    @Test
    void successfulResetPersistsTemporaryStateAndDeletesRefreshTokens() {
        User user = createUser();
        String token = tokens.createRefreshToken(user).getToken();
        passwords.resetPassword(user.getId());

        User stored = users.findById(user.getId()).orElseThrow();
        assertFalse(encoder.matches("original-password-123", stored.getPassword()));
        assertEquals(1, stored.getPasswordVersion());
        assertTrue(stored.isPasswordChangeRequired());
        assertNotNull(stored.getTemporaryPasswordExpiresAt());
        assertTrue(tokens.findByToken(token).isEmpty());
    }

    @Test
    void userChangePersistsNewHashAndDeletesRefreshTokens() {
        User user = createUser();
        String token = tokens.createRefreshToken(user).getToken();
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("original-password-123");
        request.setNewPassword("replacement-password-456");
        request.setConfirmPassword("replacement-password-456");
        passwords.changePassword(user.getId(), request);

        User stored = users.findById(user.getId()).orElseThrow();
        assertTrue(encoder.matches("replacement-password-456", stored.getPassword()));
        assertEquals(1, stored.getPasswordVersion());
        assertTrue(tokens.findByToken(token).isEmpty());
    }

    @Test
    void passwordCheckRefreshesAnEntityPreviouslyLoadedByAuthentication() {
        User user = createUser();
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("original-password-123");
        request.setNewPassword("replacement-password-456");
        request.setConfirmPassword("replacement-password-456");

        IllegalOperationException error = assertThrows(IllegalOperationException.class,
                () -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                    users.findById(user.getId()).orElseThrow();
                    // Simulate a cached authentication entity whose database credentials have changed.
                    jdbc.update("UPDATE users SET password = ?, password_version = 5 WHERE id = ?",
                            encoder.encode("concurrently-reset-password"), user.getId());
                    passwords.changePassword(user.getId(), request);
                }));
        assertEquals("INCORRECT_CURRENT_PASSWORD", error.getErrorCode());
    }

    @Test
    void resetIncrementsTheStoredVersionEvenWhenAnOlderEntityIsCached() {
        User user = createUser();
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            users.findById(user.getId()).orElseThrow();
            jdbc.update("UPDATE users SET password_version = 5 WHERE id = ?", user.getId());
            passwords.resetPassword(user.getId());
        });
        assertEquals(6, users.findById(user.getId()).orElseThrow().getPasswordVersion());
    }

    private User createUser() {
        User user = new User();
        user.setEmail(UUID.randomUUID() + "@example.com");
        user.setRole(UserRole.USER);
        user.setPassword(encoder.encode("original-password-123"));
        return users.saveAndFlush(user);
    }

    @TestConfiguration
    static class Config {
        @Bean
        PasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder(4);
        }
    }
}
