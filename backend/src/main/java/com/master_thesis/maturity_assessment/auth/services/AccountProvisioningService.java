package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.auth.models.*;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.config.ResourceNotFoundException;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AccountProvisioningService {
    private final UserRepository users;
    private final PasswordService passwords;
    private final PasswordEmailService email;
    private final EntityManager entityManager;

    @Transactional
    public User findOrCreateInvitee(String address) {
        String normalized = address.trim().toLowerCase(Locale.ROOT);
        // ON CONFLICT waits for concurrent inserts, then the following statement reads
        // the committed account. Never overwrite credentials or approval on conflict.
        entityManager.createNativeQuery("""
            INSERT INTO users (email, password, role, approval_status,
                profile_completion_required, initial_credentials_pending,
                help_balloons_enabled, completed_help_tours, dismissed_help_tour_prompts)
            VALUES (:email, '!', 'USER', 'PENDING', true, true, true, '{}', '{}')
            ON CONFLICT (lower(email)) DO NOTHING
            """).setParameter("email", normalized).executeUpdate();
        return users.findByEmailIgnoreCase(normalized).orElseThrow();
    }

    public void issueWelcomeCredentials(User user) {
        String password = passwords.assignTemporaryPassword(user);
        user.setInitialCredentialsPending(false);
        users.saveAndFlush(user);
        email.sendWelcomePassword(user.getEmail(), password);
    }

    @Transactional
    public User approve(Long id) {
        User user = users.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        entityManager.refresh(user, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (user.getApprovalStatus() != UserApprovalStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account is not pending approval.");
        }
        user.setApprovalStatus(UserApprovalStatus.APPROVED);
        if (user.isInitialCredentialsPending()) {
            try {
                issueWelcomeCredentials(user);
            } catch (ResponseStatusException exception) {
                throw new ResponseStatusException(exception.getStatusCode(),
                        "Credentials could not be emailed. The account is still awaiting approval; try again.");
            }
        }
        return users.save(user);
    }

    @Transactional
    public User completeProfile(Long id, String name, String organization) {
        User user = users.findByIdForUpdate(id).orElseThrow();
        user.setName(name.trim());
        user.setOrganizationName(organization.trim());
        user.setProfileCompletionRequired(false);
        return users.save(user);
    }
}
