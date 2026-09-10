package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserHelpTourServiceTest {

    private UserRepository userRepository;
    private UserHelpTourService service;
    private User user;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        service = new UserHelpTourService(userRepository);

        user = new User();
        user.setId(17L);
        user.setCompletedHelpTours(new LinkedHashMap<>());
        user.setDismissedHelpTourPrompts(new LinkedHashMap<>());
    }

    @Test
    void completesAllowedTourUsingACopyForReliableJsonDirtyTracking() {
        Map<String, Integer> originalState = user.getCompletedHelpTours();
        when(userRepository.findByIdForUpdate(17L)).thenReturn(Optional.of(user));

        User result = service.completeTour(user, "dashboard", 1);

        assertSame(user, result);
        assertNotSame(originalState, result.getCompletedHelpTours());
        assertEquals(Map.of("dashboard", 1), result.getCompletedHelpTours());
        assertEquals(Map.of(), originalState);
        verify(userRepository).findByIdForUpdate(17L);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "assessment-dashboard",
            "assessment-module",
            "assessment-questions"
    })
    void completesEachAssessmentTour(String tourKey) {
        when(userRepository.findByIdForUpdate(17L)).thenReturn(Optional.of(user));

        User result = service.completeTour(user, tourKey, 1);

        assertEquals(Map.of(tourKey, 1), result.getCompletedHelpTours());
        verify(userRepository).findByIdForUpdate(17L);
    }

    @Test
    void completionIsIdempotentAndNeverRegressesPersistedVersion() {
        Map<String, Integer> completedTours = new LinkedHashMap<>();
        completedTours.put("dashboard", 2);
        user.setCompletedHelpTours(completedTours);
        when(userRepository.findByIdForUpdate(17L)).thenReturn(Optional.of(user));

        User result = service.completeTour(user, "dashboard", 1);

        assertSame(completedTours, result.getCompletedHelpTours());
        assertEquals(2, result.getCompletedHelpTours().get("dashboard"));
    }

    @Test
    void dismissesPromptUsingACopyForReliableJsonDirtyTracking() {
        Map<String, Integer> originalState = user.getDismissedHelpTourPrompts();
        when(userRepository.findByIdForUpdate(17L)).thenReturn(Optional.of(user));

        User result = service.dismissPrompt(user, "dashboard", 1);

        assertNotSame(originalState, result.getDismissedHelpTourPrompts());
        assertEquals(Map.of("dashboard", 1), result.getDismissedHelpTourPrompts());
        assertEquals(Map.of(), originalState);
    }

    @Test
    void doesNotDismissPromptForAnAlreadyCompletedTour() {
        user.setCompletedHelpTours(Map.of("dashboard", 1));
        Map<String, Integer> dismissals = user.getDismissedHelpTourPrompts();
        when(userRepository.findByIdForUpdate(17L)).thenReturn(Optional.of(user));

        User result = service.dismissPrompt(user, "dashboard", 1);

        assertSame(dismissals, result.getDismissedHelpTourPrompts());
        assertEquals(Map.of(), result.getDismissedHelpTourPrompts());
    }

    @Test
    void completingTourClearsItsDismissedPromptVersion() {
        user.setDismissedHelpTourPrompts(
                new LinkedHashMap<>(Map.of("dashboard", 1, "assessment-module", 1))
        );
        when(userRepository.findByIdForUpdate(17L)).thenReturn(Optional.of(user));

        User result = service.completeTour(user, "dashboard", 1);

        assertEquals(Map.of("assessment-module", 1), result.getDismissedHelpTourPrompts());
    }

    @Test
    void rejectsUnknownTourBeforeLockingUser() {
        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> service.completeTour(user, "assessment", 1)
        );

        assertEquals("UNKNOWN_HELP_TOUR", exception.getErrorCode());
        verify(userRepository, never()).findByIdForUpdate(17L);
    }

    @Test
    void dismissPromptRejectsUnknownTourBeforeLockingUser() {
        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> service.dismissPrompt(user, "assessment", 1)
        );

        assertEquals("UNKNOWN_HELP_TOUR", exception.getErrorCode());
        verify(userRepository, never()).findByIdForUpdate(17L);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "dashboard",
            "assessment-dashboard",
            "assessment-module",
            "assessment-questions"
    })
    void rejectsUnsupportedTourVersionBeforeLockingUser(String tourKey) {
        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> service.completeTour(user, tourKey, 2)
        );

        assertEquals("INVALID_HELP_TOUR_VERSION", exception.getErrorCode());
        verify(userRepository, never()).findByIdForUpdate(17L);
    }

    @Test
    void rejectsMissingAuthenticatedUser() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.completeTour(null, "dashboard", 1)
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
    }
}
