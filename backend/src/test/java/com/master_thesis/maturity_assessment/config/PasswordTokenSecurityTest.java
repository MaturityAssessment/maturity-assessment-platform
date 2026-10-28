package com.master_thesis.maturity_assessment.config;

import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.models.RefreshToken;
import com.master_thesis.maturity_assessment.auth.repository.RefreshTokenRepository;
import com.master_thesis.maturity_assessment.auth.services.RefreshTokenService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordTokenSecurityTest {
    private static final String SECRET = "test-only-secret-key-at-least-32-bytes-long";
    private final JwtUtils jwt = jwt();

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void passwordVersionImmediatelyInvalidatesOldAccessTokens() {
        User user = user();
        String old = jwt.generateAccessToken(user);
        assertTrue(jwt.validateToken(old, user));
        user.setPasswordVersion(1);
        assertFalse(jwt.validateToken(old, user));
        assertTrue(jwt.validateToken(jwt.generateAccessToken(user), user));
    }

    @Test
    void legacyAccessTokensWorkOnlyUntilTheFirstPasswordChange() {
        User user = user();
        String legacy = Jwts.builder().setSubject(user.getEmail())
                .setExpiration(Date.from(Instant.now().plusSeconds(300)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8))).compact();
        assertTrue(jwt.validateToken(legacy, user));
        user.setPasswordVersion(1);
        assertFalse(jwt.validateToken(legacy, user));
    }

    @Test
    void temporaryPasswordSessionCannotAccessApplicationOrAdminEndpoints() throws Exception {
        for (String path : new String[]{"/api/v1/assessments", "/api/v1/admin/users", "/api/v1/maturity-model"}) {
            SecurityContextHolder.clearContext();
            User user = user();
            user.setPasswordChangeRequired(true);
            MockHttpServletResponse response = invokeFilter(user, "GET", path, false);
            assertEquals(403, response.getStatus());
            assertTrue(response.getContentAsString().contains("PASSWORD_CHANGE_REQUIRED"));
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }
    }

    @Test
    void temporaryPasswordSessionCanReadProfileChangePasswordAndRefresh() throws Exception {
        String[][] requests = {{"GET", "/api/v1/user/me"}, {"PUT", "/api/v1/user/me/password"},
                {"POST", "/api/v1/auth/refresh"}};
        for (String[] request : requests) {
            SecurityContextHolder.clearContext();
            User user = user();
            user.setPasswordChangeRequired(true);
            invokeFilter(user, request[0], request[1], true);
            assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        }
    }

    @Test
    void expiredTemporaryPasswordInvalidatesAnAlreadyIssuedAccessToken() {
        User user = user();
        String token = jwt.generateAccessToken(user);
        user.setTemporaryPasswordExpiresAt(Instant.now().minusSeconds(1));
        assertFalse(jwt.validateToken(token, user));
    }

    @Test
    void refreshTokenIssuedDuringAResetCannotBypassRevocation() {
        RefreshTokenRepository repository = mock(RefreshTokenRepository.class);
        RefreshTokenService service = new RefreshTokenService(repository);
        User user = user();
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setPasswordVersion(0);
        token.setExpiryDate(Date.from(Instant.now().plusSeconds(300)));
        when(repository.findByToken("refresh")).thenReturn(Optional.of(token));
        assertTrue(service.validateRefreshToken("refresh"));

        user.setPasswordVersion(1);
        assertFalse(service.validateRefreshToken("refresh"));
    }

    private MockHttpServletResponse invokeFilter(User user, String method, String path, boolean expectChain) throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter();
        filter.setJwtUtils(jwt);
        filter.setUserDetailsService(email -> user);
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.generateAccessToken(user));
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean called = new AtomicBoolean();
        filter.doFilter(request, response, (req, res) -> called.set(true));
        assertEquals(expectChain, called.get());
        return response;
    }

    private User user() {
        User user = new User();
        user.setEmail("person@example.com");
        user.setRole(UserRole.ADMIN);
        return user;
    }

    private static JwtUtils jwt() {
        JwtUtils jwt = new JwtUtils();
        ReflectionTestUtils.setField(jwt, "secretKey", SECRET);
        ReflectionTestUtils.setField(jwt, "accessTokenExpiration", 300_000L);
        return jwt;
    }
}
