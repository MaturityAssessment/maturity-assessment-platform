package com.master_thesis.maturity_assessment.auth.controllers;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.master_thesis.maturity_assessment.auth.dto.UserDTO;
import com.master_thesis.maturity_assessment.auth.dto.CreateUserRequest;
import com.master_thesis.maturity_assessment.auth.dto.UpdateUserRequest;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final AssessmentRepository assessmentRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDTO>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String approvalStatus) {

        List<User> users = userRepository.findAll();

        if (role != null && !role.isEmpty()) {
            try {
                UserRole roleEnum = UserRole.valueOf(role.toUpperCase());
                users = users.stream()
                    .filter(user -> user.getRole() == roleEnum)
                    .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }

        if (approvalStatus != null && !approvalStatus.isEmpty()) {
            try {
                UserApprovalStatus approvalStatusEnum = UserApprovalStatus.valueOf(approvalStatus.toUpperCase());
                users = users.stream()
                    .filter(user -> user.getApprovalStatus() == approvalStatusEnum)
                    .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }

        List<UserDTO> userDTOs = users.stream()
            .map(this::toUserDTO)
            .collect(Collectors.toList());

        return ResponseEntity.ok(userDTOs);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> createUser(@RequestBody CreateUserRequest request) {

        // Validate request
        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getRole() == null) {
            return ResponseEntity.badRequest().build();
        }

        // Check if email already exists
        if (userRepository.findByEmail(request.getEmail()) != null) {
            return ResponseEntity.badRequest().build();
        }

        // Create new user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setApprovalStatus(UserApprovalStatus.APPROVED);
        user = userRepository.save(user);

        return ResponseEntity.ok(toUserDTO(user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request) {
        
        User currentUser = getCurrentUser();

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Update email if provided
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            // Check if email is already taken by another user
            User existingUser = userRepository.findByEmail(request.getEmail());
            if (existingUser != null && !existingUser.getId().equals(id)) {
                return ResponseEntity.badRequest().build();
            }
            user.setEmail(request.getEmail());
        }

        // Update password if provided
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        // Update role if provided
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        user = userRepository.save(user);

        return ResponseEntity.ok(toUserDTO(user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        // Prevent deleting yourself
        if (currentUser.getId().equals(id)) {
            return ResponseEntity.badRequest().build();
        }

        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        List<Assessment> userAssessments = assessmentRepository.findByUserIdOrderByCreatedAtDescIdDesc(id);
        if (!userAssessments.isEmpty()) {
            assessmentRepository.deleteAll(userAssessments);
        }

        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> approvePendingUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (user.getApprovalStatus() != UserApprovalStatus.PENDING) {
            return ResponseEntity.badRequest().build();
        }

        user.setApprovalStatus(UserApprovalStatus.APPROVED);
        user = userRepository.save(user);

        return ResponseEntity.ok(toUserDTO(user));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> rejectPendingUser(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        if (currentUser.getId().equals(id)) {
            return ResponseEntity.badRequest().build();
        }

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (user.getApprovalStatus() != UserApprovalStatus.PENDING) {
            return ResponseEntity.badRequest().build();
        }

        userRepository.delete(user);
        return ResponseEntity.ok().build();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            return (User) authentication.getPrincipal();
        }
        return null;
    }

    private UserDTO toUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setOrganizationName(user.getOrganizationName());
        dto.setRole(user.getRole());
        dto.setApprovalStatus(user.getApprovalStatus());
        dto.setHelpBalloonsEnabled(user.isHelpBalloonsEnabled());
        dto.setCompletedHelpTours(
                user.getCompletedHelpTours() == null
                        ? new LinkedHashMap<>()
                        : new LinkedHashMap<>(user.getCompletedHelpTours())
        );
        dto.setDismissedHelpTourPrompts(
                user.getDismissedHelpTourPrompts() == null
                        ? new LinkedHashMap<>()
                        : new LinkedHashMap<>(user.getDismissedHelpTourPrompts())
        );
        return dto;
    }
}
