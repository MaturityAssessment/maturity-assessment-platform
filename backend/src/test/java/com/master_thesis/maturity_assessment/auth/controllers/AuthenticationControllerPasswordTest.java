package com.master_thesis.maturity_assessment.auth.controllers;

import com.master_thesis.maturity_assessment.auth.dto.AuthenticationRequest;
import com.master_thesis.maturity_assessment.auth.dto.RefreshTokenRequest;
import com.master_thesis.maturity_assessment.auth.models.RefreshToken;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.auth.services.RefreshTokenService;
import com.master_thesis.maturity_assessment.config.ErrorResponse;
import com.master_thesis.maturity_assessment.config.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthenticationControllerPasswordTest {
    private final AuthenticationManager manager = mock(AuthenticationManager.class);
    private final JwtUtils jwt = mock(JwtUtils.class);
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenService tokens = mock(RefreshTokenService.class);
    private final AuthenticationController controller = new AuthenticationController(
            manager, jwt, users, mock(PasswordEncoder.class), tokens);

    @Test
    void loginIssuesTokensForTheCredentialsActuallyVerifiedWithoutReloadingTheUser() {
        User verified = user();
        verified.setPasswordVersion(3);
        when(manager.authenticate(any())).thenReturn(
                new UsernamePasswordAuthenticationToken(verified, null, verified.getAuthorities()));
        RefreshToken token = new RefreshToken();
        token.setToken("refresh");
        when(tokens.createRefreshToken(verified)).thenReturn(token);

        assertEquals(200, controller.authenticate(new AuthenticationRequest()).getStatusCode().value());
        verify(jwt).generateAccessToken(verified);
        verify(tokens).createRefreshToken(verified);
        verifyNoInteractions(users);
    }

    @Test
    void expiredTemporaryPasswordLoginHasActionableError() {
        when(manager.authenticate(any())).thenThrow(new CredentialsExpiredException("expired"));
        var response = controller.authenticate(new AuthenticationRequest());
        assertEquals(401, response.getStatusCode().value());
        assertEquals("TEMPORARY_PASSWORD_EXPIRED", ((ErrorResponse) response.getBody()).getErrorCode());
        verifyNoInteractions(tokens, jwt);
    }

    @Test
    void expiredTemporaryPasswordCannotRefreshAnExistingSession() {
        User user = user();
        user.setTemporaryPasswordExpiresAt(Instant.now().minusSeconds(1));
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        when(tokens.validateRefreshToken("refresh")).thenReturn(true);
        when(tokens.findByToken("refresh")).thenReturn(Optional.of(token));
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("refresh");

        var response = controller.refreshToken(request);
        assertEquals(401, response.getStatusCode().value());
        assertEquals("TEMPORARY_PASSWORD_EXPIRED", ((ErrorResponse) response.getBody()).getErrorCode());
        verify(tokens).revokeAllUserTokens(user);
        verifyNoInteractions(jwt);
    }

    private User user() {
        User user = new User();
        user.setEmail("person@example.com");
        user.setRole(UserRole.USER);
        return user;
    }
}
