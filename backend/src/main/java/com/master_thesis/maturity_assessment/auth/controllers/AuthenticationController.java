package com.master_thesis.maturity_assessment.auth.controllers;

import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import com.master_thesis.maturity_assessment.auth.dto.AuthenticationRequest;
import com.master_thesis.maturity_assessment.auth.dto.AuthenticationResponse;
import com.master_thesis.maturity_assessment.auth.dto.RefreshTokenRequest;
import com.master_thesis.maturity_assessment.config.JwtUtils;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.models.RefreshToken;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.auth.services.RefreshTokenService;
import com.master_thesis.maturity_assessment.config.ErrorResponse;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/login")
    public ResponseEntity<?> authenticate(@RequestBody AuthenticationRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (DisabledException ex) {
            return ResponseEntity.status(403).body(
                    new ErrorResponse(
                            "ACCOUNT_PENDING_APPROVAL",
                            "Your request was submitted and is awaiting admin approval."));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(401).body(
                    new ErrorResponse(
                            "INVALID_CREDENTIALS",
                            "Invalid email or password."));
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
        if (userDetails != null) {
            User user = userRepository.findByEmail(request.getEmail());
            String accessToken = jwtUtils.generateAccessToken(userDetails);
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

            AuthenticationResponse response = new AuthenticationResponse();
            response.setAccessToken(accessToken);
            response.setRefreshToken(refreshToken.getToken());
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.internalServerError().body(
                new ErrorResponse(
                        "INTERNAL_SERVER_ERROR",
                        "Authentication succeeded but user details could not be loaded."));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthenticationRequest request) {
        if (userRepository.findByEmail(request.getEmail()) != null) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setOrganizationName(request.getOrganizationName());
        user.setRole(UserRole.USER);
        user.setApprovalStatus(UserApprovalStatus.PENDING);
        userRepository.save(user);

        return ResponseEntity.ok(
                new ErrorResponse(
                        "REGISTRATION_SUBMITTED",
                        "Your request was submitted. Admins will review it before granting access."));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody RefreshTokenRequest request) {
        String refreshTokenString = request.getRefreshToken();

        if (!refreshTokenService.validateRefreshToken(refreshTokenString)) {
            return ResponseEntity.status(401).body("Invalid or expired refresh token");
        }

        RefreshToken refreshToken = refreshTokenService.findByToken(refreshTokenString)
                .orElseThrow(() -> new RuntimeException("Refresh token not found"));

        User user = refreshToken.getUser();
        if (user.getApprovalStatus() != UserApprovalStatus.APPROVED) {
            refreshTokenService.revokeAllUserTokens(user);
            return ResponseEntity.status(403).body(
                    new ErrorResponse(
                            "ACCOUNT_PENDING_APPROVAL",
                            "Your request was submitted and is awaiting admin approval."));
        }
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());

        // Revoke old refresh token (token rotation)
        refreshTokenService.revokeRefreshToken(refreshTokenString);

        // Generate new tokens
        String accessToken = jwtUtils.generateAccessToken(userDetails);
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);

        AuthenticationResponse response = new AuthenticationResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(newRefreshToken.getToken());
        return ResponseEntity.ok(response);
    }

}
