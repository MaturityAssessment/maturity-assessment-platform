package com.master_thesis.maturity_assessment.campaigns.controllers;

import com.master_thesis.maturity_assessment.auth.models.*;
import com.master_thesis.maturity_assessment.campaigns.services.CampaignRespondentService;
import com.master_thesis.maturity_assessment.config.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CampaignRespondentController.class, properties = {
        "jwt.secret=test-only-secret-key-at-least-32-bytes-long"})
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtUtils.class})
class CampaignRespondentSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired JwtUtils jwt;
    @MockitoBean CampaignRespondentService service;
    @MockitoBean UserDetailsService users;

    @Test
    void anonymousAndLegacyTokenCannotOpenCampaign() throws Exception {
        mvc.perform(get("/api/v1/campaign-response/1").header("X-Campaign-Token", "legacy"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void setupIsRequiredBeforeOpeningCampaign() throws Exception {
        User user = user(); user.setProfileCompletionRequired(true);
        when(users.loadUserByUsername(user.getEmail())).thenReturn(user);
        mvc.perform(get("/api/v1/campaign-response/1").header("Authorization", "Bearer " + jwt.generateAccessToken(user)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.errorCode").value("PROFILE_COMPLETION_REQUIRED"));
        verifyNoInteractions(service);
    }

    @Test
    void approvedCompleteUserReachesMembershipCheck() throws Exception {
        User user = user();
        when(users.loadUserByUsername(user.getEmail())).thenReturn(user);
        mvc.perform(get("/api/v1/campaign-response/1").header("Authorization", "Bearer " + jwt.generateAccessToken(user)))
                .andExpect(status().isOk());
        verify(service).openAssessment(1L, user);
    }

    @Test
    void logsForwardQuestionFilterAndRejectInvalidQuestionIds() throws Exception {
        User user = user();
        when(users.loadUserByUsername(user.getEmail())).thenReturn(user);
        String token = "Bearer " + jwt.generateAccessToken(user);
        mvc.perform(get("/api/v1/campaign-response/1/logs").param("questionId", "42")
                .header("Authorization", token)).andExpect(status().isOk());
        verify(service).logs(1L, user, 0, null, null, null, 42L, com.master_thesis.maturity_assessment.assessments.services.AssessmentAuditService.Category.ALL);
        clearInvocations(service);
        mvc.perform(get("/api/v1/campaign-response/1/logs").param("questionId", "0")
                .header("Authorization", token)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    private User user() {
        User user = new User(); user.setId(3L); user.setEmail("invited@example.com"); user.setRole(UserRole.USER); return user;
    }
}
