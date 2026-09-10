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
import com.master_thesis.maturity_assessment.auth.utils.RoleUtils;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.config.ResourceNotFoundException;
import com.master_thesis.maturity_assessment.config.TextLimits;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EvidenceService {

    private static final int MAX_ITEMS_PER_QUESTION = 5;

    private final EvidenceRepository evidenceRepository;
    private final FileStorageService fileStorageService;
    private final AssessmentRepository assessmentRepository;
    private final QuestionRepository questionRepository;

    @Value("${app.evidence.max-request-file-size:262144000}")
    private long maxRequestFileSize;

    @Transactional
    public EvidenceDTO uploadEvidence(MultipartFile file, Long assessmentId, Long questionId, User user) throws IOException {
        return createFileEvidence(file, assessmentId, questionId, user, null);
    }

    @Transactional
    public EvidenceDTO createFileEvidence(
            MultipartFile file,
            Long assessmentId,
            Long questionId,
            User user,
            String description
    ) throws IOException {
        Assessment assessment = requireOwnedAssessment(assessmentId, user);
        Question question = requireQuestionForModel(questionId, assessment.getMaturityModelId());
        Evidence evidence = createFileEntity(file, assessment, question, user, description);
        return toDTO(evidenceRepository.saveAndFlush(evidence));
    }

    @Transactional
    public EvidenceDTO createUrlEvidence(
            Long assessmentId,
            Long questionId,
            User user,
            String description,
            String url
    ) {
        Assessment assessment = requireOwnedAssessment(assessmentId, user);
        Question question = requireQuestionForModel(questionId, assessment.getMaturityModelId());
        Evidence evidence = createUrlEntity(assessment, question, user, description, url);
        return toDTO(evidenceRepository.saveAndFlush(evidence));
    }

    /**
     * Reconciles evidence for an assessment. When authoritative is true, metadata is
     * the complete desired snapshot. Otherwise existing evidence is retained and the
     * supplied items are appended (legacy multipart compatibility).
     */
    @Transactional
    public List<EvidenceDTO> synchronizeEvidence(
            Long assessmentId,
            Long maturityModelId,
            User user,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys,
            boolean authoritative
    ) throws IOException {
        return synchronizeEvidenceForUploader(
                assessmentId,
                maturityModelId,
                user,
                null,
                metadata,
                evidenceFiles,
                evidenceFileKeys,
                authoritative
        );
    }

    @Transactional
    public List<EvidenceDTO> synchronizeCampaignEvidence(
            Long assessmentId,
            Long maturityModelId,
            CampaignParticipant participant,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys,
            boolean authoritative
    ) throws IOException {
        return synchronizeEvidenceForUploader(
                assessmentId,
                maturityModelId,
                null,
                participant,
                metadata,
                evidenceFiles,
                evidenceFileKeys,
                authoritative
        );
    }

    private List<EvidenceDTO> synchronizeEvidenceForUploader(
            Long assessmentId,
            Long maturityModelId,
            User user,
            CampaignParticipant campaignParticipant,
            List<EvidenceSubmissionItemRequest> metadata,
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys,
            boolean authoritative
    ) throws IOException {
        requireTransaction();
        Assessment assessment = requireOwnedAssessment(
                assessmentId,
                user,
                campaignParticipant
        );
        if (maturityModelId == null || !maturityModelId.equals(assessment.getMaturityModelId())) {
            throw badRequest("Evidence does not match the assessment maturity model.");
        }

        List<EvidenceSubmissionItemRequest> items = metadata == null ? List.of() : metadata;
        Map<String, MultipartFile> filesByKey = mapAndValidateFiles(evidenceFiles, evidenceFileKeys);
        List<Evidence> existing = evidenceRepository.findByAssessmentIdOrderByIdAsc(assessmentId);
        Map<Long, Evidence> existingById = existing.stream()
                .collect(Collectors.toMap(Evidence::getId, evidence -> evidence));

        List<Evidence> desired = authoritative ? new ArrayList<>() : new ArrayList<>(existing);
        Set<Long> retainedIds = new HashSet<>();
        Set<String> referencedFileKeys = new HashSet<>();
        Map<Evidence, String> clientKeysByEvidence = new IdentityHashMap<>();

        for (EvidenceSubmissionItemRequest item : items) {
            if (item == null || item.getQuestionId() == null || item.getType() == null) {
                throw badRequest("questionId and type are required for each evidence item.");
            }

            Question question = requireQuestionForModel(item.getQuestionId(), maturityModelId);
            Evidence persisted = null;
            if (item.getEvidenceId() != null) {
                persisted = existingById.get(item.getEvidenceId());
                if (persisted == null) {
                    throw badRequest("Evidence item does not belong to this assessment: " + item.getEvidenceId());
                }
                if (!retainedIds.add(item.getEvidenceId())) {
                    throw badRequest("Duplicate evidenceId: " + item.getEvidenceId());
                }
                if (!persisted.getQuestion().getId().equals(item.getQuestionId())) {
                    throw badRequest("Persisted evidence cannot be moved to another question.");
                }
                EvidenceType persistedType = effectiveType(persisted);
                if (persistedType != item.getType()) {
                    throw badRequest("Persisted evidence type cannot be changed.");
                }
                if (!authoritative) {
                    throw badRequest("Persisted evidence IDs require authoritative snapshot mode.");
                }
            }

            Evidence synchronizedItem;
            if (item.getType() == EvidenceType.FILE) {
                MultipartFile replacement = fileForItem(item, persisted, filesByKey, referencedFileKeys);
                if (persisted == null) {
                    synchronizedItem = createFileEntity(
                            replacement,
                            assessment,
                            question,
                            user,
                            campaignParticipant,
                            item.getDescription()
                    );
                } else {
                    synchronizedItem = persisted;
                    synchronizedItem.setDescription(normalizeOptionalDescription(item.getDescription()));
                    if (replacement != null) {
                        String previousPath = synchronizedItem.getFilePath();
                        String newPath = storeFileWithRollback(replacement, assessmentId, question.getId());
                        synchronizedItem.setFileName(replacement.getOriginalFilename());
                        synchronizedItem.setFilePath(newPath);
                        synchronizedItem.setFileSize(replacement.getSize());
                        synchronizedItem.setFileType(replacement.getContentType());
                        scheduleDeleteAfterCommit(previousPath);
                    }
                }
            } else if (item.getType() == EvidenceType.URL) {
                if (item.getItemKey() != null && !item.getItemKey().isBlank()) {
                    throw badRequest("URL evidence cannot reference an uploaded file.");
                }
                if (persisted == null) {
                    synchronizedItem = createUrlEntity(
                            assessment,
                            question,
                            user,
                            campaignParticipant,
                            item.getDescription(),
                            item.getUrl()
                    );
                } else {
                    synchronizedItem = persisted;
                    synchronizedItem.setDescription(normalizeOptionalDescription(item.getDescription()));
                    synchronizedItem.setExternalUrl(normalizeAndValidateUrl(item.getUrl()));
                }
            } else {
                throw badRequest("Unsupported evidence type.");
            }

            Evidence saved = evidenceRepository.save(synchronizedItem);
            clientKeysByEvidence.put(saved, item.getClientKey());
            if (authoritative) {
                desired.add(saved);
            } else {
                desired.add(saved);
            }
        }

        if (!referencedFileKeys.equals(filesByKey.keySet())) {
            Set<String> unused = new HashSet<>(filesByKey.keySet());
            unused.removeAll(referencedFileKeys);
            throw badRequest("Uploaded files were not referenced by evidence metadata: " + unused);
        }

        validateItemCounts(desired);

        if (authoritative) {
            for (Evidence evidence : existing) {
                if (!retainedIds.contains(evidence.getId())) {
                    evidenceRepository.delete(evidence);
                    if (effectiveType(evidence) == EvidenceType.FILE) {
                        scheduleDeleteAfterCommit(evidence.getFilePath());
                    }
                }
            }
        }

        evidenceRepository.flush();
        return desired.stream()
                .sorted(Comparator.comparing(Evidence::getId))
                .map(evidence -> toDTO(evidence, clientKeysByEvidence.get(evidence)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EvidenceDTO> getEvidenceByAssessment(Long assessmentId, User user) {
        Assessment assessment = requireViewableAssessment(assessmentId, user);
        return evidenceRepository.findByAssessmentIdOrderByIdAsc(assessment.getId()).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EvidenceDTO> getEvidenceByAssessment(
            Long assessmentId,
            CampaignParticipant participant
    ) {
        Assessment assessment = requireOwnedAssessment(assessmentId, null, participant);
        return evidenceRepository.findByAssessmentIdOrderByIdAsc(assessment.getId()).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EvidenceDTO> getEvidenceByAssessmentAndQuestion(Long assessmentId, Long questionId, User user) {
        requireViewableAssessment(assessmentId, user);
        return evidenceRepository.findByAssessmentIdAndQuestionId(assessmentId, questionId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Resource downloadEvidence(Long evidenceId, User user) throws IOException {
        Evidence evidence = evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found"));
        requireViewableAssessment(evidence.getAssessment().getId(), user);

        if (effectiveType(evidence) == EvidenceType.URL) {
            throw badRequest("URL evidence cannot be downloaded as a file.");
        }
        return fileStorageService.loadFileAsResource(evidence.getFilePath());
    }

    @Transactional(readOnly = true)
    public Resource downloadEvidence(
            Long evidenceId,
            CampaignParticipant participant
    ) throws IOException {
        Evidence evidence = evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found"));
        requireOwnedAssessment(evidence.getAssessment().getId(), null, participant);
        if (effectiveType(evidence) == EvidenceType.URL) {
            throw badRequest("URL evidence cannot be downloaded as a file.");
        }
        return fileStorageService.loadFileAsResource(evidence.getFilePath());
    }

    @Transactional
    public void deleteEvidence(Long evidenceId, User user) {
        Evidence evidence = evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found"));
        if (!evidence.getAssessment().getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this evidence.");
        }

        if (effectiveType(evidence) == EvidenceType.FILE) {
            scheduleDeleteAfterCommit(evidence.getFilePath());
        }
        evidenceRepository.delete(evidence);
    }

    @Transactional
    public void scheduleAssessmentFilesForDeletion(Long assessmentId) {
        requireTransaction();
        for (Evidence evidence : evidenceRepository.findByAssessmentIdOrderByIdAsc(assessmentId)) {
            if (effectiveType(evidence) == EvidenceType.FILE) {
                scheduleDeleteAfterCommit(evidence.getFilePath());
            }
        }
    }

    @Transactional
    public void clearEvidenceForDraft(Long assessmentId, User user) {
        requireTransaction();
        Assessment assessment = requireOwnedAssessment(assessmentId, user);
        if (assessment.getStatus() != AssessmentStatus.DRAFT) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only a draft assessment can have its evidence cleared."
            );
        }

        List<Evidence> evidenceItems = evidenceRepository.findByAssessmentIdOrderByIdAsc(assessmentId);
        for (Evidence evidence : evidenceItems) {
            if (effectiveType(evidence) == EvidenceType.FILE) {
                scheduleDeleteAfterCommit(evidence.getFilePath());
            }
        }
        evidenceRepository.deleteAll(evidenceItems);
        evidenceRepository.flush();
    }

    private Map<String, MultipartFile> mapAndValidateFiles(
            List<MultipartFile> evidenceFiles,
            List<String> evidenceFileKeys
    ) {
        List<MultipartFile> files = evidenceFiles == null ? List.of() : evidenceFiles;
        List<String> keys = evidenceFileKeys == null ? List.of() : evidenceFileKeys;
        if (files.size() != keys.size()) {
            throw badRequest("Each uploaded evidence file must have exactly one evidenceFileKey.");
        }

        long totalSize = 0L;
        Map<String, MultipartFile> byKey = new LinkedHashMap<>();
        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            String key = keys.get(i);
            if (file == null || file.isEmpty() || key == null || key.isBlank()) {
                throw badRequest("Evidence files and evidenceFileKey values cannot be empty.");
            }
            if (byKey.putIfAbsent(key, file) != null) {
                throw badRequest("Duplicate evidenceFileKey: " + key);
            }
            fileStorageService.validateFile(file);
            totalSize += file.getSize();
            if (totalSize > maxRequestFileSize) {
                throw new ResponseStatusException(
                        HttpStatus.PAYLOAD_TOO_LARGE,
                        "New evidence uploads cannot exceed 250MB in one request."
                );
            }
        }
        return byKey;
    }

    private MultipartFile fileForItem(
            EvidenceSubmissionItemRequest item,
            Evidence persisted,
            Map<String, MultipartFile> filesByKey,
            Set<String> referencedFileKeys
    ) {
        String itemKey = item.getItemKey();
        if (itemKey == null || itemKey.isBlank()) {
            if (persisted == null) {
                throw badRequest("itemKey is required for new FILE evidence.");
            }
            return null;
        }
        if (!referencedFileKeys.add(itemKey)) {
            throw badRequest("Duplicate FILE evidence itemKey: " + itemKey);
        }
        MultipartFile file = filesByKey.get(itemKey);
        if (file == null) {
            throw badRequest("Missing uploaded file for itemKey: " + itemKey);
        }
        return file;
    }

    private Evidence createFileEntity(
            MultipartFile file,
            Assessment assessment,
            Question question,
            User user,
            String description
    ) throws IOException {
        return createFileEntity(file, assessment, question, user, null, description);
    }

    private Evidence createFileEntity(
            MultipartFile file,
            Assessment assessment,
            Question question,
            User user,
            CampaignParticipant campaignParticipant,
            String description
    ) throws IOException {
        if (file == null || file.isEmpty()) {
            throw badRequest("Evidence file is required for FILE evidence.");
        }
        fileStorageService.validateFile(file);
        String filePath = storeFileWithRollback(file, assessment.getId(), question.getId());

        Evidence evidence = new Evidence();
        evidence.setAssessment(assessment);
        evidence.setQuestion(question);
        evidence.setEvidenceType(EvidenceType.FILE);
        evidence.setDescription(normalizeOptionalDescription(description));
        evidence.setExternalUrl(null);
        evidence.setFileName(file.getOriginalFilename());
        evidence.setFilePath(filePath);
        evidence.setFileSize(file.getSize());
        evidence.setFileType(file.getContentType());
        evidence.setUploadedBy(user);
        evidence.setUploadedByCampaignParticipant(campaignParticipant);
        return evidence;
    }

    private Evidence createUrlEntity(
            Assessment assessment,
            Question question,
            User user,
            String description,
            String url
    ) {
        return createUrlEntity(assessment, question, user, null, description, url);
    }

    private Evidence createUrlEntity(
            Assessment assessment,
            Question question,
            User user,
            CampaignParticipant campaignParticipant,
            String description,
            String url
    ) {
        Evidence evidence = new Evidence();
        evidence.setAssessment(assessment);
        evidence.setQuestion(question);
        evidence.setEvidenceType(EvidenceType.URL);
        evidence.setDescription(normalizeOptionalDescription(description));
        evidence.setExternalUrl(normalizeAndValidateUrl(url));
        // Preserve compatibility with schemas where these columns originated as NOT NULL.
        evidence.setFileName("external-url");
        evidence.setFilePath("external-url");
        evidence.setFileSize(0L);
        evidence.setFileType("URL");
        evidence.setUploadedBy(user);
        evidence.setUploadedByCampaignParticipant(campaignParticipant);
        return evidence;
    }

    private void validateItemCounts(List<Evidence> evidenceItems) {
        Map<Long, Integer> counts = new HashMap<>();
        for (Evidence evidence : evidenceItems) {
            Long questionId = evidence.getQuestion().getId();
            int count = counts.merge(questionId, 1, Integer::sum);
            if (count > MAX_ITEMS_PER_QUESTION) {
                throw badRequest("A question can contain at most five evidence items.");
            }
        }
    }

    private Assessment requireOwnedAssessment(Long assessmentId, User user) {
        return requireOwnedAssessment(assessmentId, user, null);
    }

    private Assessment requireOwnedAssessment(
            Long assessmentId,
            User user,
            CampaignParticipant participant
    ) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        boolean authenticatedOwner = user != null
                && user.getId() != null
                && assessment.getUser() != null
                && assessment.getUser().getId().equals(user.getId());
        boolean campaignOwner = participant != null
                && participant.getId() != null
                && assessment.getCampaignParticipant() != null
                && assessment.getCampaignParticipant().getId().equals(participant.getId());
        if (!authenticatedOwner && !campaignOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to modify this assessment.");
        }
        return assessment;
    }

    private Assessment requireViewableAssessment(Long assessmentId, User user) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        boolean isOwner = assessment.getUser() != null
                && assessment.getUser().getId().equals(user.getId());
        AssessmentStatus status = assessment.getStatus();
        boolean isSubmitted = status != AssessmentStatus.DRAFT;
        boolean isCuratorOrAdmin = RoleUtils.hasRequiredRole(user.getRole(), UserRole.CURATOR);
        if (!isOwner && !(isSubmitted && isCuratorOrAdmin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to view this evidence.");
        }
        return assessment;
    }

    private Question requireQuestionForModel(Long questionId, Long maturityModelId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found"));
        Long questionModelId = question.getPractice() != null
                && question.getPractice().getModule() != null
                && question.getPractice().getModule().getDimension() != null
                && question.getPractice().getModule().getDimension().getMaturityModel() != null
                ? question.getPractice().getModule().getDimension().getMaturityModel().getId()
                : null;
        if (maturityModelId == null || !maturityModelId.equals(questionModelId)) {
            throw badRequest("Evidence question does not belong to the assessment maturity model.");
        }
        return question;
    }

    private EvidenceType effectiveType(Evidence evidence) {
        return evidence.getEvidenceType() != null ? evidence.getEvidenceType() : EvidenceType.FILE;
    }

    private EvidenceDTO toDTO(Evidence evidence) {
        return toDTO(evidence, null);
    }

    private EvidenceDTO toDTO(Evidence evidence, String clientKey) {
        EvidenceType evidenceType = effectiveType(evidence);
        return EvidenceDTO.builder()
                .id(evidence.getId())
                .clientKey(clientKey)
                .assessmentId(evidence.getAssessment().getId())
                .questionId(evidence.getQuestion().getId())
                .description(evidence.getDescription() == null ? "" : evidence.getDescription())
                .evidenceType(evidenceType)
                .fileName(evidence.getFileName())
                .fileSize(evidence.getFileSize())
                .fileType(evidence.getFileType())
                .url(evidence.getExternalUrl())
                .createdAt(evidence.getUploadedAt())
                .downloadUrl(evidenceType == EvidenceType.FILE
                        ? "/api/v1/evidence/" + evidence.getId() + "/download"
                        : null)
                .build();
    }

    private String normalizeOptionalDescription(String description) {
        TextLimits.requireAtMost(description, TextLimits.SHORT_GUIDANCE, "Evidence description");
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeAndValidateUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            throw badRequest("Evidence URL is required for URL evidence.");
        }
        String trimmed = url.trim();
        TextLimits.requireAtMost(trimmed, 1_000, "Evidence URL");
        try {
            URI parsed = URI.create(trimmed);
            if (!"https".equalsIgnoreCase(parsed.getScheme())
                    || parsed.getHost() == null
                    || parsed.getHost().isBlank()) {
                throw badRequest("Evidence URL must be a valid https:// URL.");
            }
        } catch (IllegalArgumentException ex) {
            throw badRequest("Evidence URL must start with https://.");
        }
        return trimmed;
    }

    private String storeFileWithRollback(MultipartFile file, Long assessmentId, Long questionId) throws IOException {
        String path = fileStorageService.storeFile(file, assessmentId, questionId);
        registerRollbackDeletion(path);
        return path;
    }

    private void registerRollbackDeletion(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            return;
        }
        requireTransaction();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    deleteFileQuietly(filePath);
                }
            }
        });
    }

    private void scheduleDeleteAfterCommit(String filePath) {
        if (filePath == null || filePath.isBlank() || "external-url".equals(filePath)) {
            return;
        }
        requireTransaction();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteFileQuietly(filePath);
            }
        });
    }

    private void deleteFileQuietly(String filePath) {
        try {
            fileStorageService.deleteFile(filePath);
        } catch (IOException ex) {
            log.warn("Could not delete evidence file {}", filePath, ex);
        }
    }

    private void requireTransaction() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Evidence synchronization requires an active transaction.");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
