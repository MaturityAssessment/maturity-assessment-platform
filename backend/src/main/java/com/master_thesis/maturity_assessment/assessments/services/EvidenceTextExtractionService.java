package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.agent.AgentDocumentSummary;
import com.master_thesis.maturity_assessment.assessments.models.Evidence;
import com.master_thesis.maturity_assessment.assessments.models.EvidenceType;
import lombok.RequiredArgsConstructor;
import org.apache.tika.Tika;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.net.URI;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class EvidenceTextExtractionService {

    private final FileStorageService fileStorageService;
    private final LocalAgentProperties properties;

    public ExtractedEvidence extract(Evidence evidence) {
        AgentDocumentSummary summary = baseSummary(evidence);
        if (evidence == null) {
            summary.setWarning("Evidence metadata was unavailable.");
            return new ExtractedEvidence(summary, "");
        }

        EvidenceType evidenceType = evidence.getEvidenceType() != null
                ? evidence.getEvidenceType()
                : EvidenceType.FILE;
        summary.setEvidenceType(evidenceType.name());

        if (evidenceType == EvidenceType.URL) {
            summarizeUrl(evidence, summary);
            return new ExtractedEvidence(summary, "");
        }

        String fileType = evidence.getFileType() == null
                ? ""
                : evidence.getFileType().toLowerCase(Locale.ROOT);
        if (fileType.startsWith("image/")) {
            summary.setSummary("Image evidence metadata was included, but image OCR is not part of this beta.");
            summary.setWarning("Image content was not analyzed.");
            summary.setExtractedCharacters(0);
            summary.setTruncated(false);
            return new ExtractedEvidence(summary, "");
        }

        Long fileSize = evidence.getFileSize();
        if (fileSize != null && fileSize > properties.getMaxEvidenceFileBytes()) {
            summary.setSummary("Evidence file metadata was included, but the file was too large for beta extraction.");
            summary.setWarning("File exceeded local-agent.max-evidence-file-bytes.");
            summary.setExtractedCharacters(0);
            summary.setTruncated(false);
            return new ExtractedEvidence(summary, "");
        }

        try {
            Resource resource = fileStorageService.loadFileAsResource(evidence.getFilePath());
            Metadata metadata = new Metadata();
            if (StringUtils.hasText(evidence.getFileName())) {
                metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, evidence.getFileName());
            }
            if (StringUtils.hasText(evidence.getFileType())) {
                metadata.set(Metadata.CONTENT_TYPE, evidence.getFileType());
            }

            Tika tika = new Tika();
            tika.setMaxStringLength(properties.getMaxEvidenceChars() + 1);
            String text;
            try (InputStream stream = resource.getInputStream()) {
                text = tika.parseToString(stream, metadata);
            }

            String normalized = normalizeText(text);
            boolean truncated = normalized.length() > properties.getMaxEvidenceChars();
            String snippet = truncated
                    ? normalized.substring(0, properties.getMaxEvidenceChars())
                    : normalized;

            summary.setExtractedCharacters(snippet.length());
            summary.setTruncated(truncated);
            if (snippet.isBlank()) {
                summary.setSummary("No readable text was extracted from this evidence file.");
                summary.setWarning("Document parsing returned no text.");
                return new ExtractedEvidence(summary, "");
            }

            summary.setSummary("Extracted " + snippet.length() + " characters of document text for local-agent review.");
            if (truncated) {
                summary.setWarning("Extracted text was truncated to the configured character cap.");
            }
            return new ExtractedEvidence(summary, snippet);
        } catch (Exception ex) {
            summary.setSummary("Evidence file metadata was included, but text extraction failed.");
            summary.setWarning("Extraction failed: " + ex.getClass().getSimpleName());
            summary.setExtractedCharacters(0);
            summary.setTruncated(false);
            return new ExtractedEvidence(summary, "");
        }
    }

    private AgentDocumentSummary baseSummary(Evidence evidence) {
        AgentDocumentSummary summary = new AgentDocumentSummary();
        if (evidence != null) {
            summary.setEvidenceId(evidence.getId());
            summary.setQuestionId(
                    evidence.getQuestion() != null ? evidence.getQuestion().getId() : null
            );
            summary.setEvidenceType(
                    evidence.getEvidenceType() != null ? evidence.getEvidenceType().name() : EvidenceType.FILE.name()
            );
            summary.setFileName(evidence.getFileName());
        }
        summary.setExtractedCharacters(0);
        summary.setTruncated(false);
        return summary;
    }

    private void summarizeUrl(Evidence evidence, AgentDocumentSummary summary) {
        String url = evidence.getExternalUrl();
        if (!StringUtils.hasText(url)) {
            summary.setSummary("URL evidence was provided without a readable URL.");
            summary.setWarning("URL metadata was empty.");
            return;
        }
        try {
            URI uri = URI.create(url);
            summary.setUrlHost(uri.getHost());
            summary.setUrlPath(uri.getPath());
            summary.setSummary("URL evidence metadata only: " + nullToEmpty(uri.getHost()) + nullToEmpty(uri.getPath()));
        } catch (IllegalArgumentException ex) {
            summary.setSummary("URL evidence metadata was included, but the URL could not be parsed.");
            summary.setWarning("Invalid URL metadata.");
        }
    }

    private String normalizeText(String text) {
        if (text == null) {
            return "";
        }
        return text.replace('\u0000', ' ')
                .replaceAll("[ \\t\\x0B\\f\\r]+", " ")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public record ExtractedEvidence(AgentDocumentSummary summary, String extractedText) {
    }
}
