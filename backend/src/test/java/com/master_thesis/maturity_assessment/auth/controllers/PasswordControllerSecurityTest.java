package com.master_thesis.maturity_assessment.auth.controllers;

import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.auth.services.PasswordService;
import com.master_thesis.maturity_assessment.auth.services.AdminUserService;
import com.master_thesis.maturity_assessment.auth.services.UserHelpTourService;
import com.master_thesis.maturity_assessment.config.JwtAuthFilter;
import com.master_thesis.maturity_assessment.config.JwtUtils;
import com.master_thesis.maturity_assessment.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {UserController.class, AdminController.class}, properties = {
        "jwt.secret=test-only-secret-key-at-least-32-bytes-long"
})
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtUtils.class})
class PasswordControllerSecurityTest {
    @Autowired private MockMvc mvc;
    @MockitoBean private UserRepository users;
    @MockitoBean private AssessmentRepository assessments;
    @MockitoBean private UserHelpTourService tours;
    @MockitoBean private PasswordService passwords;
    @MockitoBean private AdminUserService adminUsers;
    @MockitoBean private UserDetailsService userDetails;

    @Test
    void anonymousCannotChangeOrResetPasswords() throws Exception {
        mvc.perform(put("/api/v1/user/me/password").contentType(MediaType.APPLICATION_JSON).content(validRequest()))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/users/7/reset-password"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(passwords);
    }

    @Test
    @WithMockUser(username = "person@example.com", roles = "USER")
    void userCannotResetAnotherUsersPassword() throws Exception {
        // Existing application convention returns 401 for role denial.
        mvc.perform(post("/api/v1/admin/users/7/reset-password"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(passwords);
    }

    @Test
    @WithMockUser(username = "person@example.com", roles = "CURATOR")
    void curatorCannotResetPasswords() throws Exception {
        mvc.perform(post("/api/v1/admin/users/7/reset-password"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(passwords);
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = "ADMIN")
    void adminResetReturnsNoPasswordOrOtherBody() throws Exception {
        mvc.perform(post("/api/v1/admin/users/7/reset-password"))
                .andExpect(status().isNoContent()).andExpect(content().string(""));
        verify(passwords).resetPassword(7L);
    }

    @Test
    @WithMockUser(username = "person@example.com", roles = "USER")
    void changeUsesAuthenticatedIdentityEvenIfBodyContainsAnotherUserId() throws Exception {
        User user = new User();
        user.setId(7L);
        when(users.findByEmail("person@example.com")).thenReturn(user);
        mvc.perform(put("/api/v1/user/me/password").contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest().replace("{", "{\"userId\":99,")))
                .andExpect(status().isNoContent());
        verify(passwords).changePassword(eq(7L), any());
    }

    @Test
    @WithMockUser(username = "person@example.com", roles = "USER")
    void validationDoesNotEchoRejectedPasswords() throws Exception {
        mvc.perform(put("/api/v1/user/me/password").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"old-secret-123", "newPassword":"short", "confirmPassword":"short"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(not(containsString("old-secret-123"))))
                .andExpect(content().string(not(containsString("short"))));
        verifyNoInteractions(passwords);
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = "ADMIN")
    void legacyAdminUpdateCannotBypassGeneratedPasswordFlow() throws Exception {
        User user = new User();
        user.setId(7L);
        when(users.findById(7L)).thenReturn(Optional.of(user));
        mvc.perform(put("/api/v1/admin/users/7").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"admin-chosen-password\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PASSWORD_RESET_REQUIRED"));
        verify(users, never()).save(any());
    }

    private String validRequest() {
        return """
                {"currentPassword":"old-secret-123","newPassword":"new-secret-456","confirmPassword":"new-secret-456"}
                """;
    }
}
