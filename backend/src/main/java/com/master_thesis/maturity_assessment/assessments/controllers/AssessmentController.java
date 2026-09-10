package com.master_thesis.maturity_assessment.assessments.controllers;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentRequest;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceSubmissionItemRequest;
import com.master_thesis.maturity_assessment.assessments.dto.ManualEvaluationRequest;
import com.master_thesis.maturity_assessment.assessments.dto.agent.AgentEvaluationDraftResponse;
import com.master_thesis.maturity_assessment.assessments.services.AssessmentEvidenceWorkflowService;
import com.master_thesis.maturity_assessment.assessments.services.AssessmentService;
import com.master_thesis.maturity_assessment.assessments.services.EvidenceService;
import com.master_thesis.maturity_assessment.assessments.services.LocalAgentEvaluationService;
import com.master_thesis.maturity_assessment.auth.models.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/assessments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final EvidenceService evidenceService;
    private final AssessmentEvidenceWorkflowService evidenceWorkflowService;
    private final LocalAgentEvaluationService localAgentEvaluationService;
    private final ObjectMapper objectMapper;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssessmentResponse> createAssessment(
            @RequestPart("assessment") String assessmentJson,
            @RequestParam(value = "evidenceFile", required = false) List<MultipartFile> evidenceFiles,
            @RequestParam(value = "evidenceFileKey", required = false) List<String> evidenceFileKeys,
            @RequestParam(value = "evidenceMetadata", required = false) String evidenceMetadataJson
    ) throws java.io.IOException {
        AssessmentRequest request = parseAssessment(assessmentJson);
        boolean metadataProvided = evidenceMetadataJson != null;
        AssessmentResponse response = evidenceWorkflowService.submitAssessment(
                request,
                getCurrentUser(),
                parseEvidenceMetadata(evidenceMetadataJson),
                evidenceFiles,
                evidenceFileKeys,
                metadataProvided
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/drafts", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AssessmentResponse> saveJsonDraft(@RequestBody AssessmentRequest request) {
        return ResponseEntity.ok(evidenceWorkflowService.saveJsonDraft(request, getCurrentUser()));
    }

    @PostMapping(value = "/drafts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssessmentResponse> saveMultipartDraft(
            @RequestPart("assessment") String assessmentJson,
            @RequestParam(value = "evidenceFile", required = false) List<MultipartFile> evidenceFiles,
            @RequestParam(value = "evidenceFileKey", required = false) List<String> evidenceFileKeys,
            @RequestParam(value = "evidenceMetadata", required = false) String evidenceMetadataJson
    ) throws java.io.IOException {
        AssessmentRequest request = parseAssessment(assessmentJson);
        boolean metadataProvided = evidenceMetadataJson != null;
        AssessmentResponse response = evidenceWorkflowService.saveMultipartDraft(
                request,
                getCurrentUser(),
                parseEvidenceMetadata(evidenceMetadataJson),
                evidenceFiles,
                evidenceFileKeys,
                metadataProvided
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/drafts/by-model/{maturityModelId}")
    public ResponseEntity<AssessmentResponse> ensureDraftByMaturityModel(
            @PathVariable Long maturityModelId
    ) {
        User user = getCurrentUser();
        AssessmentResponse response = assessmentService.ensureDraftForModel(maturityModelId, user);
        response.setEvidence(evidenceService.getEvidenceByAssessment(response.getId(), user));
        return ResponseEntity.ok(response);
    }

    @PutMapping(value = "/drafts/{draftId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssessmentResponse> saveMultipartDraftById(
            @PathVariable Long draftId,
            @RequestPart("assessment") String assessmentJson,
            @RequestParam(value = "evidenceFile", required = false) List<MultipartFile> evidenceFiles,
            @RequestParam(value = "evidenceFileKey", required = false) List<String> evidenceFileKeys,
            @RequestParam("evidenceMetadata") String evidenceMetadataJson
    ) throws java.io.IOException {
        AssessmentRequest request = parseAssessment(assessmentJson);
        AssessmentResponse response = evidenceWorkflowService.saveMultipartDraft(
                draftId,
                request,
                getCurrentUser(),
                parseEvidenceMetadata(evidenceMetadataJson),
                evidenceFiles,
                evidenceFileKeys
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/drafts/{draftId}/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssessmentResponse> submitDraftById(
            @PathVariable Long draftId,
            @RequestPart("assessment") String assessmentJson,
            @RequestParam(value = "evidenceFile", required = false) List<MultipartFile> evidenceFiles,
            @RequestParam(value = "evidenceFileKey", required = false) List<String> evidenceFileKeys,
            @RequestParam("evidenceMetadata") String evidenceMetadataJson
    ) throws java.io.IOException {
        AssessmentRequest request = parseAssessment(assessmentJson);
        AssessmentResponse response = evidenceWorkflowService.submitAssessment(
                draftId,
                request,
                getCurrentUser(),
                parseEvidenceMetadata(evidenceMetadataJson),
                evidenceFiles,
                evidenceFileKeys
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/drafts/{draftId}/reset")
    public ResponseEntity<AssessmentResponse> resetDraft(@PathVariable Long draftId) {
        return ResponseEntity.ok(evidenceWorkflowService.resetDraft(draftId, getCurrentUser()));
    }

    @GetMapping
    public ResponseEntity<List<AssessmentResponse>> getUserAssessments() {
        return ResponseEntity.ok(assessmentService.getAssessmentsByUser(getCurrentUser()));
    }

    @GetMapping("/drafts")
    public ResponseEntity<List<AssessmentResponse>> getDrafts() {
        return ResponseEntity.ok(assessmentService.getDraftsByUser(getCurrentUser()));
    }

    @GetMapping("/drafts/by-model/{maturityModelId}")
    public ResponseEntity<AssessmentResponse> getDraftByMaturityModel(@PathVariable Long maturityModelId) {
        User user = getCurrentUser();
        AssessmentResponse response = assessmentService.getDraftByMaturityModel(maturityModelId, user);
        response.setEvidence(evidenceService.getEvidenceByAssessment(response.getId(), user));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/drafts/by-model-lineage/{maturityModelId}")
    public ResponseEntity<List<AssessmentResponse>> getDraftsByMaturityModelLineage(
            @PathVariable Long maturityModelId
    ) {
        return ResponseEntity.ok(
                assessmentService.getDraftsByMaturityModelLineage(maturityModelId, getCurrentUser())
        );
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<List<AssessmentResponse>> getAllAssessments() {
        return ResponseEntity.ok(assessmentService.getAllAssessments());
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<List<AssessmentResponse>> getPendingReviewAssessments() {
        return ResponseEntity.ok(assessmentService.getPendingReviewAssessments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssessmentResponse> getAssessmentById(@PathVariable Long id) {
        User user = getCurrentUser();
        AssessmentResponse response = assessmentService.getAssessmentById(id, user);
        response.setEvidence(evidenceService.getEvidenceByAssessment(id, user));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<AssessmentResponse> completeAssessment(
            @PathVariable Long id,
            @RequestBody(required = false) ManualEvaluationRequest request
    ) {
        return ResponseEntity.ok(assessmentService.completeAssessment(id, request, getCurrentUser()));
    }

    @PutMapping("/{id}/evaluate")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<AssessmentResponse> evaluateAssessment(
            @PathVariable Long id,
            @RequestBody ManualEvaluationRequest request
    ) {
        return ResponseEntity.ok(assessmentService.evaluateAssessment(id, request, getCurrentUser()));
    }

    @PutMapping("/{id}/evaluation/reviews")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<AssessmentResponse> saveEvaluationProgress(
            @PathVariable Long id,
            @RequestBody ManualEvaluationRequest request
    ) {
        return ResponseEntity.ok(assessmentService.saveEvaluationProgress(id, request, getCurrentUser()));
    }

    @PutMapping("/{id}/evaluation/finish")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<AssessmentResponse> finishEvaluation(
            @PathVariable Long id,
            @RequestBody(required = false) ManualEvaluationRequest request
    ) {
        return ResponseEntity.ok(assessmentService.finishEvaluation(id, request, getCurrentUser()));
    }

    @PutMapping("/{id}/evaluation/send-back")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<AssessmentResponse> sendEvaluationBack(
            @PathVariable Long id,
            @RequestBody(required = false) ManualEvaluationRequest request
    ) {
        return ResponseEntity.ok(assessmentService.sendEvaluationBack(id, request, getCurrentUser()));
    }

    @PostMapping("/{id}/agent-evaluation/draft")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<AgentEvaluationDraftResponse> generateLocalAgentEvaluationDraft(@PathVariable Long id) {
        return ResponseEntity.ok(localAgentEvaluationService.generateDraft(id));
    }

    @GetMapping("/{id}/open-answers")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getOpenAnswerQuestions(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentService.getOpenAnswerQuestions(id, getCurrentUser()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','CURATOR','ADMIN')")
    public ResponseEntity<Void> deleteAssessment(@PathVariable Long id) {
        evidenceWorkflowService.deleteAssessment(id, getCurrentUser());
        return ResponseEntity.noContent().build();
    }

    private AssessmentRequest parseAssessment(String assessmentJson) {
        try {
            return objectMapper.readValue(assessmentJson, AssessmentRequest.class);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid assessment payload.");
        }
    }

    private List<EvidenceSubmissionItemRequest> parseEvidenceMetadata(String evidenceMetadataJson) {
        if (evidenceMetadataJson == null || evidenceMetadataJson.trim().isEmpty()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                    evidenceMetadataJson,
                    new TypeReference<List<EvidenceSubmissionItemRequest>>() {
                    }
            );
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid evidenceMetadata payload.");
        }
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated.");
    }
}
