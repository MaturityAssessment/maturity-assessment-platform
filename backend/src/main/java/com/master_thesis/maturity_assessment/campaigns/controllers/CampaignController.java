package com.master_thesis.maturity_assessment.campaigns.controllers;

import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignDetailResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignInvitationResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignSummaryResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignResultsResponse;
import com.master_thesis.maturity_assessment.campaigns.dto.CreateCampaignRequest;
import com.master_thesis.maturity_assessment.campaigns.services.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/campaigns")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
public class CampaignController {

    private final CampaignService campaignService;

    @GetMapping
    public ResponseEntity<List<CampaignSummaryResponse>> getMyCampaigns() {
        return ResponseEntity.ok(campaignService.getCampaignsCreatedBy(getCurrentUser()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CampaignDetailResponse> getCampaign(@PathVariable Long id) {
        return ResponseEntity.ok(campaignService.getCampaign(id, getCurrentUser()));
    }

    @GetMapping("/{id}/results")
    public ResponseEntity<CampaignResultsResponse> getCampaignResults(@PathVariable Long id) {
        return ResponseEntity.ok(campaignService.getCampaignResults(id, getCurrentUser()));
    }

    @PostMapping
    public ResponseEntity<CampaignDetailResponse> createCampaign(
            @Valid @RequestBody CreateCampaignRequest request
    ) {
        CampaignDetailResponse created =
                campaignService.createCampaign(request, getCurrentUser());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCampaign(@PathVariable Long id) {
        campaignService.deleteCampaign(id, getCurrentUser());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{campaignId}/participants/{participantId}/invitation")
    public ResponseEntity<CampaignInvitationResponse> reissueInvitation(
            @PathVariable Long campaignId,
            @PathVariable Long participantId
    ) {
        return ResponseEntity.ok(
                campaignService.reissueInvitation(
                        campaignId,
                        participantId,
                        getCurrentUser()
                )
        );
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated.");
    }
}
