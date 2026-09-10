package com.master_thesis.maturity_assessment.auth.services;

import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserHelpTourService {

    private static final Map<String, Integer> SUPPORTED_TOUR_VERSIONS = Map.of(
            "dashboard", 1,
            "assessment-dashboard", 1,
            "assessment-module", 1,
            "assessment-questions", 1
    );

    private final UserRepository userRepository;

    @Transactional
    public User completeTour(User authenticatedUser, String tourKey, Integer version) {
        validateTourVersion(tourKey, version);
        User lockedUser = lockAuthenticatedUser(authenticatedUser);

        Map<String, Integer> completedTours = lockedUser.getCompletedHelpTours();
        int completedVersion = completedTours == null
                ? 0
                : completedTours.getOrDefault(tourKey, 0);
        if (completedVersion >= version) {
            return lockedUser;
        }

        Map<String, Integer> updatedTours = completedTours == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(completedTours);
        updatedTours.put(tourKey, Math.max(completedVersion, version));
        lockedUser.setCompletedHelpTours(updatedTours);

        Map<String, Integer> dismissedPrompts = lockedUser.getDismissedHelpTourPrompts();
        int dismissedVersion = dismissedPrompts == null
                ? 0
                : dismissedPrompts.getOrDefault(tourKey, 0);
        if (dismissedVersion > 0 && dismissedVersion <= version) {
            Map<String, Integer> updatedDismissals = new LinkedHashMap<>(dismissedPrompts);
            updatedDismissals.remove(tourKey);
            lockedUser.setDismissedHelpTourPrompts(updatedDismissals);
        }
        return lockedUser;
    }

    @Transactional
    public User dismissPrompt(User authenticatedUser, String tourKey, Integer version) {
        validateTourVersion(tourKey, version);
        User lockedUser = lockAuthenticatedUser(authenticatedUser);

        Map<String, Integer> completedTours = lockedUser.getCompletedHelpTours();
        if (completedTours != null && completedTours.getOrDefault(tourKey, 0) >= version) {
            return lockedUser;
        }

        Map<String, Integer> dismissedPrompts = lockedUser.getDismissedHelpTourPrompts();
        int dismissedVersion = dismissedPrompts == null
                ? 0
                : dismissedPrompts.getOrDefault(tourKey, 0);
        if (dismissedVersion >= version) {
            return lockedUser;
        }

        Map<String, Integer> updatedDismissals = dismissedPrompts == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(dismissedPrompts);
        updatedDismissals.put(tourKey, Math.max(dismissedVersion, version));
        lockedUser.setDismissedHelpTourPrompts(updatedDismissals);
        return lockedUser;
    }

    private void validateTourVersion(String tourKey, Integer version) {
        Integer supportedVersion = SUPPORTED_TOUR_VERSIONS.get(tourKey);
        if (supportedVersion == null) {
            throw new IllegalOperationException(
                    "UNKNOWN_HELP_TOUR",
                    "Unknown help tour."
            );
        }
        if (version == null || version < 1 || version > supportedVersion) {
            throw new IllegalOperationException(
                    "INVALID_HELP_TOUR_VERSION",
                    "Help tour version must be between 1 and " + supportedVersion + "."
            );
        }
    }

    private User lockAuthenticatedUser(User authenticatedUser) {
        if (authenticatedUser == null || authenticatedUser.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated.");
        }

        return userRepository.findByIdForUpdate(authenticatedUser.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "User not authenticated."
                ));
    }
}
