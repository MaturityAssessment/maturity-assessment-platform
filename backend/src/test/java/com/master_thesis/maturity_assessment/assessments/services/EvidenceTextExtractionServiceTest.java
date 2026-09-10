package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.Evidence;
import com.master_thesis.maturity_assessment.assessments.models.EvidenceType;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvidenceTextExtractionServiceTest {

    @Mock
    private FileStorageService fileStorageService;

    @Test
    void extractionCapsTextAndMarksTruncation() throws Exception {
        LocalAgentProperties properties = new LocalAgentProperties();
        properties.setMaxEvidenceChars(5);
        EvidenceTextExtractionService service =
                new EvidenceTextExtractionService(fileStorageService, properties);

        Evidence evidence = fileEvidence();
        when(fileStorageService.loadFileAsResource("23/1001/example.txt"))
                .thenReturn(new ByteArrayResource("abcdefghij".getBytes()));

        EvidenceTextExtractionService.ExtractedEvidence extracted = service.extract(evidence);

        assertEquals("abcde", extracted.extractedText());
        assertEquals(5, extracted.summary().getExtractedCharacters());
        assertTrue(extracted.summary().getTruncated());
    }

    @Test
    void urlEvidenceIsMetadataOnly() {
        LocalAgentProperties properties = new LocalAgentProperties();
        EvidenceTextExtractionService service =
                new EvidenceTextExtractionService(fileStorageService, properties);

        Evidence evidence = new Evidence();
        evidence.setId(45L);
        evidence.setEvidenceType(EvidenceType.URL);
        evidence.setExternalUrl("https://example.com/path/to/evidence");
        Question question = new Question();
        question.setId(1001L);
        evidence.setQuestion(question);

        EvidenceTextExtractionService.ExtractedEvidence extracted = service.extract(evidence);

        assertEquals("", extracted.extractedText());
        assertEquals("example.com", extracted.summary().getUrlHost());
        assertEquals("/path/to/evidence", extracted.summary().getUrlPath());
    }

    private Evidence fileEvidence() {
        Assessment assessment = new Assessment();
        assessment.setId(23L);
        Question question = new Question();
        question.setId(1001L);

        Evidence evidence = new Evidence();
        evidence.setId(45L);
        evidence.setAssessment(assessment);
        evidence.setQuestion(question);
        evidence.setEvidenceType(EvidenceType.FILE);
        evidence.setFileName("example.txt");
        evidence.setFilePath("23/1001/example.txt");
        evidence.setFileType("text/plain");
        evidence.setFileSize(10L);
        return evidence;
    }
}
