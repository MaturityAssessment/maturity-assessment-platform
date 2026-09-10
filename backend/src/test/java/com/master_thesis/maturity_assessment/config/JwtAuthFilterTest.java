package com.master_thesis.maturity_assessment.config;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;
class JwtAuthFilterTest {

    @Test
    void shouldContinueFilterChainWhenTokenIsExpired() throws Exception {
        SecurityContextHolder.clearContext();

        JwtAuthFilter jwtAuthFilter = new JwtAuthFilter();
        UserDetailsService userDetailsService = username -> {
            throw new UsernameNotFoundException("User not found");
        };
        JwtUtils jwtUtils = new JwtUtils() {
            @Override
            public String extractUsername(String token) {
                throw new ExpiredJwtException(null, null, "Token is expired");
            }
        };

        jwtAuthFilter.setUserDetailsService(userDetailsService);
        jwtAuthFilter.setJwtUtils(jwtUtils);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/user/me");
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer expired-token");
        AtomicBoolean chainCalled = new AtomicBoolean(false);
        FilterChain filterChain = (req, res) -> chainCalled.set(true);

        jwtAuthFilter.doFilter(request, response, filterChain);

        assertTrue(chainCalled.get());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void shouldContinueFilterChainWhenTokenIsMalformed() throws Exception {
        SecurityContextHolder.clearContext();

        JwtAuthFilter jwtAuthFilter = new JwtAuthFilter();
        UserDetailsService userDetailsService = username -> {
            throw new UsernameNotFoundException("User not found");
        };
        JwtUtils jwtUtils = new JwtUtils() {
            @Override
            public String extractUsername(String token) {
                throw new JwtException("Malformed JWT token");
            }
        };

        jwtAuthFilter.setUserDetailsService(userDetailsService);
        jwtAuthFilter.setJwtUtils(jwtUtils);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/user/me");
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer malformed-token");
        AtomicBoolean chainCalled = new AtomicBoolean(false);
        FilterChain filterChain = (req, res) -> chainCalled.set(true);

        jwtAuthFilter.doFilter(request, response, filterChain);

        assertTrue(chainCalled.get());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
