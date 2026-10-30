package com.master_thesis.maturity_assessment.auth.controllers;

import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.auth.services.AdminUserService;
import com.master_thesis.maturity_assessment.auth.services.PasswordService;
import com.master_thesis.maturity_assessment.config.JwtAuthFilter;
import com.master_thesis.maturity_assessment.config.JwtUtils;
import com.master_thesis.maturity_assessment.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AdminController.class, properties = {
        "jwt.secret=test-only-secret-key-at-least-32-bytes-long"
})
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtUtils.class})
class AdminUserControllerSecurityTest {
    @MockitoBean private com.master_thesis.maturity_assessment.auth.services.AccountProvisioningService provisioning;
    @MockitoBean private com.master_thesis.maturity_assessment.campaigns.repository.CampaignParticipantRepository participants;
    @Autowired private MockMvc mvc;
    @MockitoBean private UserRepository users;
    @MockitoBean private AssessmentRepository assessments;
    @MockitoBean private PasswordService passwords;
    @MockitoBean private AdminUserService adminUsers;
    @MockitoBean private UserDetailsService userDetails;

    @Test
    void anonymousCannotCreateUsers() throws Exception {
        create(validRequest()).andExpect(status().isUnauthorized());
        verifyNoInteractions(adminUsers);
    }

    @Test
    @WithMockUser(roles = "USER")
    void ordinaryUserCannotCreateUsers() throws Exception {
        create(validRequest()).andExpect(status().isUnauthorized());
        verifyNoInteractions(adminUsers);
    }

    @Test
    @WithMockUser(roles = "CURATOR")
    void curatorCannotCreateUsers() throws Exception {
        create(validRequest()).andExpect(status().isUnauthorized());
        verifyNoInteractions(adminUsers);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createsUserWithoutReturningCredentials() throws Exception {
        User user = new User();
        user.setId(7L);
        user.setName("New User");
        user.setEmail("new@example.com");
        user.setOrganizationName("Example Org");
        user.setRole(UserRole.USER);
        user.setPassword("stored-secret-hash");
        user.setPasswordChangeRequired(true);
        when(adminUsers.createUser(any())).thenReturn(user);

        create(validRequest()).andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("New User"))
                .andExpect(jsonPath("$.email").value("new@example.com"))
                .andExpect(jsonPath("$.organizationName").value("Example Org"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.approvalStatus").value("APPROVED"))
                .andExpect(jsonPath("$.passwordChangeRequired").value(true))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.temporaryPassword").doesNotExist());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void validatesRequiredFieldsEmailAndLengthsBeforeCreatingAccount() throws Exception {
        for (String body : new String[]{"{}", validRequest().replace("New User", "  "),
                validRequest().replace("new@example.com", "invalid"),
                validRequest().replace("Example Org", "  "),
                validRequest().replace("New User", "x".repeat(256)),
                validRequest().replace("Example Org", "x".repeat(256))}) {
            create(body).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));
        }
        verifyNoInteractions(adminUsers);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void reportsDuplicateAndMailFailures() throws Exception {
        when(adminUsers.createUser(any())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                "A user with this email already exists."))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "The temporary password email could not be sent. The account has not been created."));
        create(validRequest()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("A user with this email already exists."));

        create(validRequest()).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("The temporary password email could not be sent. The account has not been created."));
    }

    private org.springframework.test.web.servlet.ResultActions create(String body) throws Exception {
        return mvc.perform(post("/api/v1/admin/users").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String validRequest() {
        return """
                {"name":"New User","email":"new@example.com","organizationName":"Example Org"}
                """;
    }
}
