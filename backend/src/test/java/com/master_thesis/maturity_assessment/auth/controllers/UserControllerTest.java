package com.master_thesis.maturity_assessment.auth.controllers;

import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.auth.dto.CompleteHelpTourRequest;
import com.master_thesis.maturity_assessment.auth.dto.UserDTO;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.auth.services.UserHelpTourService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserControllerTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void currentUserResponseIncludesHelpTourState() {
        UserRepository userRepository = mock(UserRepository.class);
        UserHelpTourService helpTourService = mock(UserHelpTourService.class);
        UserController controller = new UserController(userRepository, helpTourService);
        User user = userWithHelpState();
        authenticate(user);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(user);

        ResponseEntity<UserDTO> response = controller.getCurrentUser();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isHelpBalloonsEnabled());
        assertEquals(Map.of("dashboard", 1), response.getBody().getCompletedHelpTours());
        assertEquals(
                Map.of("assessment-module", 1),
                response.getBody().getDismissedHelpTourPrompts()
        );
    }

    @Test
    void completingTourUsesAuthenticatedPrincipalAndReturnsUpdatedState() {
        UserRepository userRepository = mock(UserRepository.class);
        UserHelpTourService helpTourService = mock(UserHelpTourService.class);
        UserController controller = new UserController(userRepository, helpTourService);
        User authenticatedUser = userWithHelpState();
        authenticatedUser.setCompletedHelpTours(Map.of());
        User updatedUser = userWithHelpState();
        authenticate(authenticatedUser);

        CompleteHelpTourRequest request = new CompleteHelpTourRequest();
        request.setVersion(1);
        when(helpTourService.completeTour(authenticatedUser, "dashboard", 1))
                .thenReturn(updatedUser);

        ResponseEntity<UserDTO> response = controller.completeHelpTour(
                "dashboard",
                request
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(Map.of("dashboard", 1), response.getBody().getCompletedHelpTours());
        verify(helpTourService).completeTour(authenticatedUser, "dashboard", 1);
    }

    @Test
    void completingTourRejectsUnauthenticatedRequest() {
        UserRepository userRepository = mock(UserRepository.class);
        UserHelpTourService helpTourService = mock(UserHelpTourService.class);
        UserController controller = new UserController(userRepository, helpTourService);
        CompleteHelpTourRequest request = new CompleteHelpTourRequest();
        request.setVersion(1);

        ResponseEntity<UserDTO> response = controller.completeHelpTour(
                "dashboard",
                request
        );

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void dismissingTourPromptUsesAuthenticatedPrincipalAndReturnsUpdatedState() {
        UserRepository userRepository = mock(UserRepository.class);
        UserHelpTourService helpTourService = mock(UserHelpTourService.class);
        UserController controller = new UserController(userRepository, helpTourService);
        User authenticatedUser = userWithHelpState();
        authenticatedUser.setCompletedHelpTours(Map.of());
        authenticatedUser.setDismissedHelpTourPrompts(Map.of());
        User updatedUser = userWithHelpState();
        updatedUser.setCompletedHelpTours(Map.of());
        updatedUser.setDismissedHelpTourPrompts(Map.of("dashboard", 1));
        authenticate(authenticatedUser);

        CompleteHelpTourRequest request = new CompleteHelpTourRequest();
        request.setVersion(1);
        when(helpTourService.dismissPrompt(authenticatedUser, "dashboard", 1))
                .thenReturn(updatedUser);

        ResponseEntity<UserDTO> response = controller.dismissHelpTourPrompt(
                "dashboard",
                request
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(
                Map.of("dashboard", 1),
                response.getBody().getDismissedHelpTourPrompts()
        );
        verify(helpTourService).dismissPrompt(authenticatedUser, "dashboard", 1);
    }

    @Test
    void adminUserResponseIncludesHelpTourState() {
        UserRepository userRepository = mock(UserRepository.class);
        AdminController controller = new AdminController(
                userRepository,
                mock(AssessmentRepository.class),
                mock(PasswordEncoder.class)
        );
        User user = userWithHelpState();
        when(userRepository.findAll()).thenReturn(List.of(user));

        ResponseEntity<List<UserDTO>> response = controller.getAllUsers(null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().get(0).isHelpBalloonsEnabled());
        assertEquals(
                Map.of("dashboard", 1),
                response.getBody().get(0).getCompletedHelpTours()
        );
        assertEquals(
                Map.of("assessment-module", 1),
                response.getBody().get(0).getDismissedHelpTourPrompts()
        );
    }

    private User userWithHelpState() {
        User user = new User();
        user.setId(17L);
        user.setEmail("person@example.com");
        user.setName("Person");
        user.setRole(UserRole.USER);
        user.setApprovalStatus(UserApprovalStatus.APPROVED);
        user.setHelpBalloonsEnabled(true);
        user.setCompletedHelpTours(Map.of("dashboard", 1));
        user.setDismissedHelpTourPrompts(Map.of("assessment-module", 1));
        return user;
    }

    private void authenticate(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        user.getAuthorities()
                )
        );
    }
}
