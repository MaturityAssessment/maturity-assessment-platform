package com.master_thesis.maturity_assessment.campaigns.controllers;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentRequest;
import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceSubmissionItemRequest;
import com.master_thesis.maturity_assessment.campaigns.dto.CampaignAssessmentSessionResponse;
import com.master_thesis.maturity_assessment.campaigns.services.CampaignRespondentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/campaign-response")
@RequiredArgsConstructor
public class CampaignRespondentController {

    public static final String TOKEN_HEADER = "X-Campaign-Token";

    private final CampaignRespondentService respondentService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<CampaignAssessmentSessionResponse> openAssessment(
            @RequestHeader(TOKEN_HEADER) String token
    ) {
        return ResponseEntity.ok(respondentService.openAssessment(token));
    }

    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssessmentResponse> saveDraft(
            @RequestHeader(TOKEN_HEADER) String token,
            @RequestPart("assessment") String assessmentJson,
            @RequestParam("evidenceMetadata") String evidenceMetadataJson,
            @RequestParam(value = "evidenceFile", required = false)
            List<MultipartFile> evidenceFiles,
            @RequestParam(value = "evidenceFileKey", required = false)
            List<String> evidenceFileKeys
    ) throws IOException {
        return ResponseEntity.ok(respondentService.saveDraft(
                token,
                parseAssessment(assessmentJson),
                parseEvidenceMetadata(evidenceMetadataJson),
                evidenceFiles,
                evidenceFileKeys
        ));
    }

    @PostMapping(value = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssessmentResponse> submitAssessment(
            @RequestHeader(TOKEN_HEADER) String token,
            @RequestPart("assessment") String assessmentJson,
            @RequestParam("evidenceMetadata") String evidenceMetadataJson,
            @RequestParam(value = "evidenceFile", required = false)
            List<MultipartFile> evidenceFiles,
            @RequestParam(value = "evidenceFileKey", required = false)
            List<String> evidenceFileKeys
    ) throws IOException {
        return ResponseEntity.ok(respondentService.submitAssessment(
                token,
                parseAssessment(assessmentJson),
                parseEvidenceMetadata(evidenceMetadataJson),
                evidenceFiles,
                evidenceFileKeys
        ));
    }

    @GetMapping("/evidence/{evidenceId}/download")
    public ResponseEntity<Resource> downloadEvidence(
            @RequestHeader(TOKEN_HEADER) String token,
            @PathVariable Long evidenceId
    ) throws IOException {
        Resource resource = respondentService.downloadEvidence(token, evidenceId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resource.getFilename() + "\""
                )
                .body(resource);
    }

    private AssessmentRequest parseAssessment(String assessmentJson) {
        try {
            return objectMapper.readValue(assessmentJson, AssessmentRequest.class);
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid assessment payload."
            );
        }
    }

    private List<EvidenceSubmissionItemRequest> parseEvidenceMetadata(String metadataJson) {
        try {
            return objectMapper.readValue(
                    metadataJson,
                    new TypeReference<List<EvidenceSubmissionItemRequest>>() {
                    }
            );
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid evidenceMetadata payload."
            );
        }
    }
}
