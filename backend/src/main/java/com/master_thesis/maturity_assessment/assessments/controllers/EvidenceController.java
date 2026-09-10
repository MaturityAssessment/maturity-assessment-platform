package com.master_thesis.maturity_assessment.assessments.controllers;

import com.master_thesis.maturity_assessment.assessments.dto.EvidenceDTO;
import com.master_thesis.maturity_assessment.assessments.services.EvidenceService;
import com.master_thesis.maturity_assessment.auth.models.User;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/evidence")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EvidenceController {

    private final EvidenceService evidenceService;

    @GetMapping("/assessment/{assessmentId}")
    public ResponseEntity<List<EvidenceDTO>> getEvidenceByAssessment(@PathVariable Long assessmentId) {
        List<EvidenceDTO> evidence = evidenceService.getEvidenceByAssessment(assessmentId, getCurrentUser());
        return ResponseEntity.ok(evidence);
    }

    @GetMapping("/assessment/{assessmentId}/question/{questionId}")
    public ResponseEntity<List<EvidenceDTO>> getEvidenceByAssessmentAndQuestion(
            @PathVariable Long assessmentId,
            @PathVariable Long questionId) {
        List<EvidenceDTO> evidence = evidenceService.getEvidenceByAssessmentAndQuestion(
                assessmentId,
                questionId,
                getCurrentUser()
        );
        return ResponseEntity.ok(evidence);
    }

    @GetMapping("/{evidenceId}/download")
    public ResponseEntity<Resource> downloadEvidence(@PathVariable Long evidenceId) {
        User user = getCurrentUser();
        try {
            Resource resource = evidenceService.downloadEvidence(evidenceId, user);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{evidenceId}")
    public ResponseEntity<Void> deleteEvidence(@PathVariable Long evidenceId) {
        User user = getCurrentUser();
        evidenceService.deleteEvidence(evidenceId, user);
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            return (User) authentication.getPrincipal();
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated.");
    }
}
