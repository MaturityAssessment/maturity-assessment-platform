package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.auth.dto.CreateUserRequest;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminUserService {
    private final UserRepository userRepository;
    private final AccountProvisioningService provisioning;

    public AdminUserService(UserRepository userRepository,
                            AccountProvisioningService provisioning) {
        this.provisioning = provisioning;
        this.userRepository = userRepository;
    }

    @Transactional
    public User createUser(CreateUserRequest request) {
        String email = request.getEmail().trim();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with this email already exists.");
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setOrganizationName(request.getOrganizationName().trim());
        user.setRole(request.getRole() == null ? UserRole.USER : request.getRole());
        user.setApprovalStatus(UserApprovalStatus.APPROVED);
        user.setPassword("!");
        try {
            // Detect a concurrent duplicate before sending credentials. Mail failure rolls back the insert.
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            if (exception.getMostSpecificCause() instanceof java.sql.SQLException sql
                    && "23505".equals(sql.getSQLState())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with this email already exists.");
            }
            throw exception;
        }
        provisioning.issueWelcomeCredentials(user);
        return user;
    }
}
