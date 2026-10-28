package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.auth.dto.ChangePasswordRequest;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.config.ResourceNotFoundException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class PasswordService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEmailService passwordEmailService;
    private final EntityManager entityManager;
    private final SecureRandom random = new SecureRandom();

    public PasswordService(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           RefreshTokenService refreshTokenService,
                           PasswordEmailService passwordEmailService,
                           EntityManager entityManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
        this.passwordEmailService = passwordEmailService;
        this.entityManager = entityManager;
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = findForUpdate(userId);
        if (!user.isCredentialsNonExpired()) {
            throw new IllegalOperationException("TEMPORARY_PASSWORD_EXPIRED",
                    "Your temporary password has expired. Contact an administrator for another reset.");
        }
        if (request.getCurrentPassword() == null
                || !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalOperationException("INCORRECT_CURRENT_PASSWORD", "Current password is incorrect.");
        }
        String newPassword = request.getNewPassword();
        if (newPassword == null || newPassword.isBlank() || newPassword.length() < 12
                || newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalOperationException("INVALID_NEW_PASSWORD",
                    "New password must contain at least 12 characters and at most 72 UTF-8 bytes.");
        }
        if (!newPassword.equals(request.getConfirmPassword())) {
            throw new IllegalOperationException("PASSWORD_CONFIRMATION_MISMATCH", "New passwords do not match.");
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalOperationException("PASSWORD_UNCHANGED", "Choose a password different from your current password.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangeRequired(false);
        user.setTemporaryPasswordExpiresAt(null);
        invalidateSessions(user);
    }

    @Transactional
    public void resetPassword(Long userId) {
        User user = findForUpdate(userId);
        if (user.getApprovalStatus() != UserApprovalStatus.APPROVED) {
            throw new IllegalOperationException("ACCOUNT_NOT_APPROVED", "Approve the account before resetting its password.");
        }
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        String temporaryPassword = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setPasswordChangeRequired(true);
        user.setTemporaryPasswordExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        invalidateSessions(user);
        // Surface database errors before handing the temporary password to SMTP.
        userRepository.flush();
        passwordEmailService.sendTemporaryPassword(user.getEmail(), temporaryPassword);
    }

    private User findForUpdate(Long userId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "User not found."));
        // Authentication may already have loaded this entity before another request changed it.
        // Refresh under the lock so password verification and version increments use current state.
        entityManager.refresh(user, LockModeType.PESSIMISTIC_WRITE);
        return user;
    }

    private void invalidateSessions(User user) {
        user.setPasswordVersion(user.getPasswordVersion() + 1);
        userRepository.save(user);
        refreshTokenService.revokeAllUserTokens(user);
    }
}
