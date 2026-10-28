package com.master_thesis.maturity_assessment.auth.controllers;

import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
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
public class AuthenticationController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    public AuthenticationController(AuthenticationManager authenticationManager,
                                    JwtUtils jwtUtils,
                                    UserRepository userRepository,
                                    PasswordEncoder passwordEncoder,
                                    RefreshTokenService refreshTokenService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticate(@RequestBody AuthenticationRequest request) {
        final Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (DisabledException ex) {
            return ResponseEntity.status(403).body(
                    new ErrorResponse(
                            "ACCOUNT_PENDING_APPROVAL",
                            "Your request was submitted and is awaiting admin approval."));
        } catch (CredentialsExpiredException ex) {
            return ResponseEntity.status(401).body(new ErrorResponse(
                    "TEMPORARY_PASSWORD_EXPIRED",
                    "Your temporary password has expired. Contact an administrator for another reset."));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(401).body(
                    new ErrorResponse(
                            "INVALID_CREDENTIALS",
                            "Invalid email or password."));
        }

        // Issue tokens for the exact credential version that was authenticated.
        // Reloading the user here could issue a valid session after a concurrent reset.
        if (authentication.getPrincipal() instanceof User user) {
            String accessToken = jwtUtils.generateAccessToken(user);
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
        if (!user.isCredentialsNonExpired()) {
            refreshTokenService.revokeAllUserTokens(user);
            return ResponseEntity.status(401).body(new ErrorResponse(
                    "TEMPORARY_PASSWORD_EXPIRED",
                    "Your temporary password has expired. Contact an administrator for another reset."));
        }
        if (user.getApprovalStatus() != UserApprovalStatus.APPROVED) {
            refreshTokenService.revokeAllUserTokens(user);
            return ResponseEntity.status(403).body(
                    new ErrorResponse(
                            "ACCOUNT_PENDING_APPROVAL",
                            "Your request was submitted and is awaiting admin approval."));
        }

        // Revoke old refresh token (token rotation)
        refreshTokenService.revokeRefreshToken(refreshTokenString);

        // Generate new tokens
        String accessToken = jwtUtils.generateAccessToken(user);
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);

        AuthenticationResponse response = new AuthenticationResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(newRefreshToken.getToken());
        return ResponseEntity.ok(response);
    }

}
