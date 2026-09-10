package com.master_thesis.maturity_assessment.auth.controllers;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.master_thesis.maturity_assessment.auth.dto.CompleteHelpTourRequest;
import com.master_thesis.maturity_assessment.auth.dto.UserDTO;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.auth.services.UserHelpTourService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserHelpTourService userHelpTourService;

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email);

        if (user == null) {
            return ResponseEntity.status(404).build();
        }

        return ResponseEntity.ok(toUserDTO(user));
    }

    @PutMapping("/me/help-tours/{tourKey}/complete")
    public ResponseEntity<UserDTO> completeHelpTour(
            @PathVariable String tourKey,
            @Valid @RequestBody CompleteHelpTourRequest request
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        User user = authentication.getPrincipal() instanceof User authenticatedUser
                ? authenticatedUser
                : userRepository.findByEmail(authentication.getName());

        if (user == null) {
            return ResponseEntity.status(404).build();
        }

        User updatedUser = userHelpTourService.completeTour(
                user,
                tourKey,
                request.getVersion()
        );

        return ResponseEntity.ok(toUserDTO(updatedUser));
    }

    @PutMapping("/me/help-tours/{tourKey}/dismiss-prompt")
    public ResponseEntity<UserDTO> dismissHelpTourPrompt(
            @PathVariable String tourKey,
            @Valid @RequestBody CompleteHelpTourRequest request
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        User user = authentication.getPrincipal() instanceof User authenticatedUser
                ? authenticatedUser
                : userRepository.findByEmail(authentication.getName());

        if (user == null) {
            return ResponseEntity.status(404).build();
        }

        User updatedUser = userHelpTourService.dismissPrompt(
                user,
                tourKey,
                request.getVersion()
        );

        return ResponseEntity.ok(toUserDTO(updatedUser));
    }

    private UserDTO toUserDTO(User user) {
        UserDTO userDTO = new UserDTO();
        userDTO.setId(user.getId());
        userDTO.setName(user.getName());
        userDTO.setOrganizationName(user.getOrganizationName());
        userDTO.setEmail(user.getEmail());
        userDTO.setRole(user.getRole());
        userDTO.setApprovalStatus(user.getApprovalStatus());
        userDTO.setHelpBalloonsEnabled(user.isHelpBalloonsEnabled());
        userDTO.setCompletedHelpTours(
                user.getCompletedHelpTours() == null
                        ? new LinkedHashMap<>()
                        : new LinkedHashMap<>(user.getCompletedHelpTours())
        );
        userDTO.setDismissedHelpTourPrompts(
                user.getDismissedHelpTourPrompts() == null
                        ? new LinkedHashMap<>()
                        : new LinkedHashMap<>(user.getDismissedHelpTourPrompts())
        );
        return userDTO;
    }
}
