package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.EvidenceDTO;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceSubmissionItemRequest;
import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import com.master_thesis.maturity_assessment.assessments.models.Evidence;
import com.master_thesis.maturity_assessment.assessments.models.EvidenceType;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.assessments.repository.EvidenceRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.repository.PracticeRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvidenceServiceTest {

    private static final long ASSESSMENT_ID = 10L;
    private static final long MODEL_ID = 20L;
    private static final long PRACTICE_ID = 30L;

    @Mock
    private EvidenceRepository evidenceRepository;
    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private AssessmentRepository assessmentRepository;
    @Mock
    private PracticeRepository practiceRepository;

    private EvidenceService evidenceService;
    private User owner;
    private Assessment assessment;
    private Practice practice;

    @BeforeEach
    void setUp() {
        evidenceService = new EvidenceService(
                evidenceRepository,
                fileStorageService,
                assessmentRepository,
                practiceRepository
        );
        ReflectionTestUtils.setField(evidenceService, "maxRequestFileSize", 250L * 1024 * 1024);

        owner = new User();
        owner.setId(1L);
        owner.setRole(UserRole.USER);

        assessment = new Assessment();
        assessment.setId(ASSESSMENT_ID);
        assessment.setUser(owner);
        assessment.setMaturityModelId(MODEL_ID);
        assessment.setStatus(AssessmentStatus.DRAFT);

        practice = practiceForModel();

        when(assessmentRepository.findById(ASSESSMENT_ID)).thenReturn(Optional.of(assessment));
        lenient().when(practiceRepository.findById(PRACTICE_ID)).thenReturn(Optional.of(practice));

        AtomicLong ids = new AtomicLong(100);
        lenient().when(evidenceRepository.save(any(Evidence.class))).thenAnswer(invocation -> {
            Evidence evidence = invocation.getArgument(0);
            if (evidence.getId() == null) {
                evidence.setId(ids.incrementAndGet());
            }
            return evidence;
        });

        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void authoritativeSnapshotUpdatesRetainedCreatesNewAndDeletesOmitted() throws Exception {
        Evidence retained = urlEvidence(1L, "https://old.example.com");
        Evidence omitted = urlEvidence(2L, "https://remove.example.com");
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of(retained, omitted));

        EvidenceSubmissionItemRequest retainedRequest = urlItem(
                1L,
                "Retained description",
                "https://new.example.com"
        );
        retainedRequest.setClientKey("retained-client-key");
        EvidenceSubmissionItemRequest newRequest = urlItem(
                null,
                "",
                "https://created.example.com"
        );
        newRequest.setClientKey("new-client-key");

        List<EvidenceDTO> result = evidenceService.synchronizeEvidence(
                ASSESSMENT_ID,
                MODEL_ID,
                owner,
                List.of(retainedRequest, newRequest),
                List.of(),
                List.of(),
                true
        );

        assertEquals(2, result.size());
        assertEquals("retained-client-key", result.get(0).getClientKey());
        assertEquals("new-client-key", result.get(1).getClientKey());
        assertEquals("Retained description", retained.getDescription());
        assertEquals("https://new.example.com", retained.getExternalUrl());
        verify(evidenceRepository).delete(omitted);
    }

    @Test
    void rejectsSixEvidenceItemsForOnePractice() {
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of());
        List<EvidenceSubmissionItemRequest> items = java.util.stream.IntStream.range(0, 6)
                .mapToObj(index -> urlItem(
                        null,
                        "",
                        "https://example.com/" + index
                ))
                .toList();

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> evidenceService.synchronizeEvidence(
                        ASSESSMENT_ID,
                        MODEL_ID,
                        owner,
                        items,
                        List.of(),
                        List.of(),
                        true
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void rejectsInsecureEvidenceUrl() {
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> evidenceService.synchronizeEvidence(
                        ASSESSMENT_ID,
                        MODEL_ID,
                        owner,
                        List.of(urlItem(null, "", "http://example.com")),
                        List.of(),
                        List.of(),
                        true
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void campaignEvidenceUsesTheParticipantUploaderIdentity() throws Exception {
        CampaignParticipant participant = new CampaignParticipant();
        participant.setId(77L);
        assessment.setUser(null);
        assessment.setCampaignParticipant(participant);
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of());

        evidenceService.synchronizeCampaignEvidence(
                ASSESSMENT_ID,
                MODEL_ID,
                participant,
                List.of(urlItem(null, "", "https://evidence.example.com")),
                List.of(),
                List.of(),
                true
        );

        ArgumentCaptor<Evidence> evidenceCaptor = ArgumentCaptor.forClass(Evidence.class);
        verify(evidenceRepository).save(evidenceCaptor.capture());
        assertEquals(participant, evidenceCaptor.getValue().getUploadedByCampaignParticipant());
        assertEquals(null, evidenceCaptor.getValue().getUploadedBy());
    }

    @Test
    void rejectsMoreThan250MbOfNewFiles() {
        MultipartFile first = mock(MultipartFile.class);
        MultipartFile second = mock(MultipartFile.class);
        when(first.isEmpty()).thenReturn(false);
        when(second.isEmpty()).thenReturn(false);
        when(first.getSize()).thenReturn(150L * 1024 * 1024);
        when(second.getSize()).thenReturn(150L * 1024 * 1024);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> evidenceService.synchronizeEvidence(
                        ASSESSMENT_ID,
                        MODEL_ID,
                        owner,
                        List.of(),
                        List.of(first, second),
                        List.of("first", "second"),
                        true
                )
        );

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, exception.getStatusCode());
    }

    @Test
    void curatorCannotListAnotherUsersDraftEvidence() {
        User curator = new User();
        curator.setId(99L);
        curator.setRole(UserRole.CURATOR);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> evidenceService.getEvidenceByAssessment(ASSESSMENT_ID, curator)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void newlyStoredFileIsDeletedWhenTheTransactionRollsBack() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "evidenceFile",
                "policy.txt",
                "text/plain",
                "policy".getBytes()
        );
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of());
        when(fileStorageService.storeFile(file, ASSESSMENT_ID, PRACTICE_ID))
                .thenReturn("10/30/generated_policy.txt");

        EvidenceSubmissionItemRequest item = new EvidenceSubmissionItemRequest();
        item.setPracticeId(PRACTICE_ID);
        item.setType(EvidenceType.FILE);
        item.setItemKey("new-file");

        evidenceService.synchronizeEvidence(
                ASSESSMENT_ID,
                MODEL_ID,
                owner,
                List.of(item),
                List.of(file),
                List.of("new-file"),
                true
        );
        TransactionSynchronizationUtils.triggerAfterCompletion(
                TransactionSynchronization.STATUS_ROLLED_BACK
        );

        verify(fileStorageService).deleteFile("10/30/generated_policy.txt");
    }

    @Test
    void clearingDraftEvidenceDeletesDatabaseRowsAndFilesOnlyAfterCommit() throws Exception {
        Evidence fileEvidence = new Evidence();
        fileEvidence.setId(1L);
        fileEvidence.setAssessment(assessment);
        fileEvidence.setPractice(practice);
        fileEvidence.setEvidenceType(EvidenceType.FILE);
        fileEvidence.setFilePath("10/30/policy.pdf");
        fileEvidence.setUploadedBy(owner);
        Evidence urlEvidence = urlEvidence(2L, "https://example.com/policy");
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID))
                .thenReturn(List.of(fileEvidence, urlEvidence));

        evidenceService.clearEvidenceForDraft(ASSESSMENT_ID, owner);

        verify(evidenceRepository).deleteAll(List.of(fileEvidence, urlEvidence));
        verify(evidenceRepository).flush();
        org.mockito.Mockito.verifyNoInteractions(fileStorageService);

        TransactionSynchronizationUtils.triggerAfterCommit();
        verify(fileStorageService).deleteFile("10/30/policy.pdf");
    }

    @Test
    void clearingSubmittedAssessmentEvidenceIsRejected() {
        assessment.setStatus(AssessmentStatus.COMPLETED);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> evidenceService.clearEvidenceForDraft(ASSESSMENT_ID, owner)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void preservesMergedLegacyItemsOverTheLimitButRejectsNewItems() throws Exception {
        List<Evidence> existing = java.util.stream.LongStream.rangeClosed(1, 6)
                .mapToObj(id -> urlEvidence(id, "https://example.com/" + id)).toList();
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID)).thenReturn(existing);
        List<EvidenceSubmissionItemRequest> retained = existing.stream()
                .map(item -> urlItem(item.getId(), "Updated description", item.getExternalUrl())).toList();
        assertEquals(6, evidenceService.synchronizeEvidence(
                ASSESSMENT_ID, MODEL_ID, owner, retained, List.of(), List.of(), true).size());
        var withNew = new java.util.ArrayList<>(retained);
        withNew.add(urlItem(null, "", "https://example.com/new"));
        assertThrows(ResponseStatusException.class, () -> evidenceService.synchronizeEvidence(
                ASSESSMENT_ID, MODEL_ID, owner, withNew, List.of(), List.of(), true));
    }

    @Test
    void rejectsPracticeFromAnotherModelVersion() {
        practice.getModule().getDimension().getMaturityModel().setId(999L);
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID)).thenReturn(List.of());
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> evidenceService.synchronizeEvidence(ASSESSMENT_ID, MODEL_ID, owner,
                        List.of(urlItem(null, "", "https://example.com")), List.of(), List.of(), true));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        assertEquals("Evidence practice does not belong to the assessment maturity model.", error.getReason());
    }

    @Test
    void rejectsLegacyMetadataWithoutPracticeId() {
        EvidenceSubmissionItemRequest legacy = urlItem(null, "", "https://example.com");
        legacy.setPracticeId(null);
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID)).thenReturn(List.of());
        assertThrows(ResponseStatusException.class, () -> evidenceService.synchronizeEvidence(
                ASSESSMENT_ID, MODEL_ID, owner, List.of(legacy), List.of(), List.of(), true));
    }

    @Test
    void textEvidenceCreatesAndUpdatesNotesWithoutFileStorage() throws Exception {
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID)).thenReturn(List.of());
        EvidenceSubmissionItemRequest item = textItem("  Respondent note\n\tSecond line  ");
        item.setClientKey("note-client");
        List<EvidenceDTO> created = evidenceService.synchronizeEvidence(
                ASSESSMENT_ID, MODEL_ID, owner, List.of(item), List.of(), List.of(), true);
        assertEquals(EvidenceType.TEXT, created.getFirst().getEvidenceType());
        assertEquals("Respondent note\n\tSecond line", created.getFirst().getDescription());
        assertEquals("note-client", created.getFirst().getClientKey());
        org.junit.jupiter.api.Assertions.assertNull(created.getFirst().getDownloadUrl());
        org.junit.jupiter.api.Assertions.assertNull(created.getFirst().getUrl());
        ArgumentCaptor<Evidence> captor = ArgumentCaptor.forClass(Evidence.class);
        verify(evidenceRepository).save(captor.capture());
        Evidence persisted = captor.getValue();
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID)).thenReturn(List.of(persisted));
        item.setEvidenceId(persisted.getId());
        item.setDescription("Updated note");
        List<EvidenceDTO> updated = evidenceService.synchronizeEvidence(
                ASSESSMENT_ID, MODEL_ID, owner, List.of(item), List.of(), List.of(), true);
        assertEquals(persisted.getId(), updated.getFirst().getId());
        assertEquals("Updated note", updated.getFirst().getDescription());
        org.mockito.Mockito.verifyNoInteractions(fileStorageService);
    }

    @Test
    void textEvidenceRejectsBlankOversizedOrFileAndUrlReferences() throws Exception {
        when(evidenceRepository.findByAssessmentIdOrderByIdAsc(ASSESSMENT_ID)).thenReturn(List.of());
        for (String text : List.of("", " \n\t", "a".repeat(10001))) {
            assertThrows(RuntimeException.class, () -> evidenceService.synchronizeEvidence(
                    ASSESSMENT_ID, MODEL_ID, owner, List.of(textItem(text)), List.of(), List.of(), true));
        }
        EvidenceSubmissionItemRequest item = textItem("Note");
        item.setUrl("https://example.com");
        assertThrows(ResponseStatusException.class, () -> evidenceService.synchronizeEvidence(
                ASSESSMENT_ID, MODEL_ID, owner, List.of(item), List.of(), List.of(), true));
        item.setUrl(null);
        item.setItemKey("upload-key");
        assertThrows(ResponseStatusException.class, () -> evidenceService.synchronizeEvidence(
                ASSESSMENT_ID, MODEL_ID, owner, List.of(item), List.of(), List.of(), true));
    }

    @Test
    void textEvidenceCannotBeDownloadedAsFile() throws Exception {
        Evidence note = urlEvidence(1L, null);
        note.setEvidenceType(EvidenceType.TEXT);
        when(evidenceRepository.findById(1L)).thenReturn(Optional.of(note));
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> evidenceService.downloadEvidence(1L, owner));
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        org.mockito.Mockito.verifyNoInteractions(fileStorageService);
    }

    private EvidenceSubmissionItemRequest textItem(String text) {
        EvidenceSubmissionItemRequest item = new EvidenceSubmissionItemRequest();
        item.setPracticeId(PRACTICE_ID);
        item.setType(EvidenceType.TEXT);
        item.setDescription(text);
        return item;
    }

    private EvidenceSubmissionItemRequest urlItem(Long evidenceId, String description, String url) {
        EvidenceSubmissionItemRequest item = new EvidenceSubmissionItemRequest();
        item.setEvidenceId(evidenceId);
        item.setPracticeId(PRACTICE_ID);
        item.setType(EvidenceType.URL);
        item.setDescription(description);
        item.setUrl(url);
        return item;
    }

    private Evidence urlEvidence(Long id, String url) {
        Evidence evidence = new Evidence();
        evidence.setId(id);
        evidence.setAssessment(assessment);
        evidence.setPractice(practice);
        evidence.setEvidenceType(EvidenceType.URL);
        evidence.setExternalUrl(url);
        evidence.setFileName("external-url");
        evidence.setFilePath("external-url");
        evidence.setUploadedBy(owner);
        return evidence;
    }

    private Practice practiceForModel() {
        MaturityModel model = new MaturityModel();
        model.setId(MODEL_ID);

        Dimension dimension = new Dimension();
        dimension.setMaturityModel(model);

        Module module = new Module();
        module.setDimension(dimension);

        Practice practice = new Practice();
        practice.setId(PRACTICE_ID);
        practice.setModule(module);
        return practice;
    }
}
