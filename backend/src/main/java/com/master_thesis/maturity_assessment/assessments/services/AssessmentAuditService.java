package com.master_thesis.maturity_assessment.assessments.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.master_thesis.maturity_assessment.assessments.models.*;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentLogRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.maturity_models.repository.QuestionRepository;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class AssessmentAuditService {
    private final AssessmentLogRepository repository;
    private final QuestionRepository questionRepository;
    private final ObjectMapper mapper;

    public enum Category { ALL, LIFECYCLE, RESPONDENT, EVALUATOR, EVIDENCE }

    public record State(boolean created, LocalDate referenceDate, AssessmentStatus status) {}
    public record Item(String label, JsonNode value) {}
    public record LogPage(List<AssessmentLog> entries, boolean hasMore) {}

    public State state(Assessment assessment) {
        return new State(assessment.getId() == null, assessment.getReferenceDate(), assessment.getId() == null ? AssessmentStatus.DRAFT : assessment.getStatus());
    }

    public void assessmentDetailsChanged(Assessment assessment, User actor, State before) {
        if (before.created()) {
            record(assessment, actor, "ASSESSMENT_CREATED", "ASSESSMENT", assessment.getId(),
                    "Assessment", null, mapper.valueToTree(Map.of("status", before.status().name(),
                            "referenceDate", String.valueOf(assessment.getReferenceDate()))));
        } else if (!Objects.equals(before.referenceDate(), assessment.getReferenceDate())) {
            record(assessment, actor, "REFERENCE_DATE_CHANGED", "ASSESSMENT", assessment.getId(),
                    "Assessment reference date", mapper.valueToTree(before.referenceDate() == null ? null : before.referenceDate().toString()),
                    mapper.valueToTree(assessment.getReferenceDate() == null ? null : assessment.getReferenceDate().toString()));
        }
    }

    public void assessmentChanged(Assessment assessment, User actor, State before, String action) {
        assessmentDetailsChanged(assessment, actor, before);
        String lifecycleAction = action;
        if (lifecycleAction == null && !before.created() && before.status() != assessment.getStatus())
            lifecycleAction = "ASSESSMENT_STATUS_CHANGED";
        if (lifecycleAction != null) {
            record(assessment, actor, lifecycleAction, "ASSESSMENT", assessment.getId(), "Assessment",
                    mapper.valueToTree(before.status()), mapper.valueToTree(assessment.getStatus()));
        }
    }

    public Map<Long, Item> responses(List<QuestionEvaluation> rows) {
        Map<Long, Item> result = new LinkedHashMap<>();
        for (QuestionEvaluation row : rows) {
            if (row.getResponse() == null || row.getResponse().isNull()) continue;
            ObjectNode value = mapper.createObjectNode();
            value.set("response", row.getResponse().deepCopy());
            value.set("choiceIndex", mapper.valueToTree(row.getChoiceIndex()));
            value.put("justification", row.getRespondentJustification());
            result.put(row.getQuestionId(), new Item(row.getResponseKey(), value));
        }
        return result;
    }

    public void responsesChanged(Assessment assessment, Map<Long, Item> before, List<QuestionEvaluation> afterRows) {
        Map<Long, Item> after = responses(afterRows);
        Set<Long> ids = new LinkedHashSet<>(before.keySet());
        ids.addAll(after.keySet());
        for (Long id : ids) {
            Item old = before.get(id), next = after.get(id);
            if (same(value(old), value(next))) continue;
            var question = questionRepository.findById(id);
            String label = question.map(q -> (q.getCode() == null ? "Question " + id : q.getCode()) + " — " + q.getText())
                    .orElse("Question " + id);
            String action = old == null ? "ANSWER_ADDED" : next == null ? "ANSWER_REMOVED" : "ANSWER_CHANGED";
            // A justification-only edit is useful to distinguish from an answer change.
            if (old != null && next != null
                    && same(old.value().get("response"), next.value().get("response"))
                    && Objects.equals(old.value().get("choiceIndex"), next.value().get("choiceIndex"))) {
                action = "JUSTIFICATION_CHANGED";
            }
            record(assessment, assessment.getUser(), action, "QUESTION", id, label,
                    responseSnapshot(old, question.orElse(null)), responseSnapshot(next, question.orElse(null)));
        }
    }

    public void respondentUpdateMarked(Assessment assessment, QuestionEvaluation row) {
        if (Boolean.TRUE.equals(row.getRespondentUpdated())) return;
        String label = questionRepository.findById(row.getQuestionId())
                .map(q -> (q.getCode() == null ? "Question " + q.getId() : q.getCode()) + " — " + q.getText())
                .orElse("Question " + row.getQuestionId());
        record(assessment, assessment.getUser(), "REVIEW_UPDATE_CONFIRMED", "QUESTION", row.getQuestionId(),
                label, mapper.valueToTree(false), mapper.valueToTree(true));
    }

    public record EvaluationState(JsonNode assessment, String remarks, Map<Long, Item> reviews) {}

    public EvaluationState evaluationState(Assessment assessment, List<QuestionEvaluation> rows) {
        ObjectNode state = mapper.createObjectNode();
        state.set("status", mapper.valueToTree(assessment.getStatus()));
        state.set("overallAverage", mapper.valueToTree(assessment.getOverallAverage()));
        state.set("overallPercentageScore", mapper.valueToTree(assessment.getOverallPercentageScore()));
        state.put("overallMaturityLevel", assessment.getOverallMaturityLevel());
        Map<Long, Item> reviews = new LinkedHashMap<>();
        for (QuestionEvaluation row : rows) {
            ObjectNode value = mapper.createObjectNode();
            value.set("validationStatus", mapper.valueToTree(row.getValidationStatus()));
            value.set("manualScore", mapper.valueToTree(row.getManualScore()));
            value.put("reviewerNote", row.getReviewerNote());
            value.put("respondentUpdated", Boolean.TRUE.equals(row.getRespondentUpdated()));
            reviews.put(row.getQuestionId(), new Item(row.getResponseKey(), value));
        }
        return new EvaluationState(state, assessment.getEvaluatorInsight(), reviews);
    }

    public void evaluationChanged(Assessment assessment, User actor, EvaluationState before,
                                  List<QuestionEvaluation> rows, String action) {
        EvaluationState after = evaluationState(assessment, rows);
        for (var entry : after.reviews().entrySet()) {
            JsonNode old = value(before.reviews().get(entry.getKey()));
            JsonNode next = entry.getValue().value();
            if (same(old, next)) continue;
            // A newly materialized, empty review does not represent an evaluator edit.
            if (old == null && next.get("validationStatus").isNull() && next.get("manualScore").isNull()
                    && next.get("reviewerNote").isNull() && !next.get("respondentUpdated").asBoolean()) continue;
            String label = questionRepository.findById(entry.getKey())
                    .map(q -> (q.getCode() == null ? "Question " + q.getId() : q.getCode()) + " — " + q.getText())
                    .orElse("Question " + entry.getKey());
            record(assessment, actor, "EVALUATOR", "QUESTION_REVIEW_CHANGED", "QUESTION", entry.getKey(), label, old, next);
        }
        if (!Objects.equals(before.remarks(), after.remarks())) {
            record(assessment, actor, "EVALUATOR", "EVALUATOR_REMARKS_CHANGED", "ASSESSMENT", assessment.getId(),
                    "Overall evaluation remarks", mapper.valueToTree(before.remarks()), mapper.valueToTree(after.remarks()));
        }
        String lifecycleAction = action;
        if (lifecycleAction == null && !same(before.assessment().get("status"), after.assessment().get("status")))
            lifecycleAction = "ASSESSMENT_STATUS_CHANGED";
        if (lifecycleAction != null && !same(before.assessment(), after.assessment())) {
            record(assessment, actor, "EVALUATOR", lifecycleAction, "ASSESSMENT", assessment.getId(), "Assessment",
                    before.assessment(), after.assessment());
        }
    }

    public Map<Long, Item> evidence(List<Evidence> rows) {
        Map<Long, Item> result = new LinkedHashMap<>();
        for (Evidence row : rows) {
            ObjectNode value = mapper.createObjectNode();
            value.put("practiceId", row.getPractice().getId());
            value.put("practiceLabel", row.getPractice().getName());
            value.put("type", row.getEvidenceType() == null ? "FILE" : row.getEvidenceType().name());
            value.put("description", row.getDescription());
            value.put("url", row.getExternalUrl());
            value.put("fileName", row.getFileName());
            value.put("fileSize", row.getFileSize());
            value.put("fileType", row.getFileType());
            value.put("requirementCode", row.getRequirementCode());
            value.put("collectedAt", row.getCollectedAt() == null ? null : row.getCollectedAt().toString());
            value.set("referencedQuestionIds", mapper.valueToTree(row.getReferencedQuestions().stream()
                    .map(q -> q.getId()).sorted().toList()));
            value.set("referencedQuestions", mapper.valueToTree(row.getReferencedQuestions().stream()
                    .sorted(Comparator.comparing(Question::getId))
                    .map(q -> (q.getCode() == null ? "Question " + q.getId() : q.getCode()) + " — " + q.getText()).toList()));
            if (row.getPractice().getEvidenceRequirements() != null) {
                row.getPractice().getEvidenceRequirements().stream()
                        .filter(r -> Objects.equals(r.getCode(), row.getRequirementCode())).findFirst()
                        .ifPresent(r -> value.put("requirementLabel", r.getName()));
            }
            String label = (row.getPractice().getCode() == null ? "" : row.getPractice().getCode() + " — ") + row.getPractice().getName();
            if (row.getFileName() != null) label += " — " + row.getFileName();
            result.put(row.getId(), new Item(label, value));
        }
        return result;
    }

    public void evidenceChanged(Assessment assessment, User actor, Map<Long, Item> before, List<Evidence> afterRows) {
        Map<Long, Item> after = evidence(afterRows);
        Set<Long> ids = new LinkedHashSet<>(before.keySet());
        ids.addAll(after.keySet());
        for (Long id : ids) {
            Item old = before.get(id), next = after.get(id);
            if (same(value(old), value(next))) continue;
            record(assessment, actor, old == null ? "EVIDENCE_ADDED" : next == null ? "EVIDENCE_REMOVED" : "EVIDENCE_CHANGED",
                    "EVIDENCE", id, next == null ? old.label() : next.label(), value(old), value(next));
        }
    }

    // PostgreSQL may return a numerically identical JSON value using a different number type.
    private boolean same(JsonNode left, JsonNode right) {
        if (left == null || right == null) return left == right;
        return left.equals((a, b) -> a.isNumber() && b.isNumber()
                ? a.decimalValue().compareTo(b.decimalValue()) : a.equals(b) ? 0 : 1, right);
    }

    private JsonNode responseSnapshot(Item item, Question question) {
        if (item == null) return null;
        ObjectNode snapshot = (ObjectNode) item.value().deepCopy();
        JsonNode response = snapshot.get("response");
        String label = response.isTextual() ? response.asText() : response.toString();
        if (question != null) {
            switch (question.getType()) {
                case "boolean" -> label = (response.asBoolean() || "1".equals(response.asText())) ? "Yes" : "No";
                case "percentage" -> label += "%";
                case "multiple_choice", "multiple_selection" -> {
                    try {
                        JsonNode options = mapper.readTree("multiple_choice".equals(question.getType())
                                ? question.getChoiceOptions() : question.getSelectionOptions());
                        if ("multiple_selection".equals(question.getType()) && response.isArray()) {
                            List<String> selected = new ArrayList<>();
                            for (JsonNode index : response) selected.add(options.get(index.asInt()).get("label").asText());
                            label = selected.isEmpty() ? "None selected" : String.join(", ", selected);
                        } else if (snapshot.hasNonNull("choiceIndex")) {
                            label = options.get(snapshot.get("choiceIndex").asInt()).get("label").asText();
                        } else {
                            for (JsonNode option : options) {
                                if (option.hasNonNull("score") && same(option.get("score"), response)) {
                                    label = option.get("label").asText();
                                    break;
                                }
                            }
                        }
                    } catch (Exception ignored) {
                        // Legacy answers without valid option metadata retain their original value.
                    }
                }
                default -> { }
            }
        }
        snapshot.put("answerLabel", label);
        return snapshot;
    }

    private JsonNode value(Item item) { return item == null ? null : item.value(); }

    private void record(Assessment assessment, User actor, String action, String targetType, Long targetId,
                        String targetLabel, JsonNode before, JsonNode after) {
        record(assessment, actor, "RESPONDENT", action, targetType, targetId, targetLabel, before, after);
    }

    private void record(Assessment assessment, User actor, String role, String action, String targetType, Long targetId,
                        String targetLabel, JsonNode before, JsonNode after) {
        AssessmentLog entry = new AssessmentLog();
        entry.setAssessmentId(assessment.getId());
        entry.setActorUserId(actor.getId());
        entry.setActorName(actor.getName());
        entry.setActorEmail(actor.getEmail());
        entry.setActorRole(role);
        entry.setActorCampaignParticipantId(!"RESPONDENT".equals(role) || assessment.getCampaignParticipant() == null ? null : assessment.getCampaignParticipant().getId());
        entry.setAction(action);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setTargetLabel(targetLabel);
        entry.setBeforeValue(before);
        entry.setAfterValue(after);
        entry.setOccurredAt(Instant.now());
        repository.save(entry);
    }

    @Transactional(readOnly = true)
    public LogPage logs(Long assessmentId, int page) {
        var slice = repository.findByAssessmentIdOrderByOccurredAtDescIdDesc(assessmentId, PageRequest.of(page, 50));
        return new LogPage(slice.getContent(), slice.hasNext());
    }

    @Transactional(readOnly = true)
    public LogPage scopedLogs(Long assessmentId, int page, List<Long> questionIds, List<Long> practiceIds, Long questionId) {
        return scopedLogs(assessmentId, page, questionIds, practiceIds, questionId, Category.ALL);
    }

    @Transactional(readOnly = true)
    public LogPage logs(Long assessmentId, int page, Category category) {
        if (category == Category.ALL) return logs(assessmentId, page);
        var slice = repository.findInScope(assessmentId, List.of(-1L), List.of(-1L), null, false,
                category.name(), PageRequest.of(page, 50));
        return new LogPage(slice.getContent(), slice.hasNext());
    }

    @Transactional(readOnly = true)
    public LogPage scopedLogs(Long assessmentId, int page, List<Long> questionIds, List<Long> practiceIds, Long questionId, Category category) {
        var slice = repository.findInScope(assessmentId, questionIds.isEmpty() ? List.of(-1L) : questionIds,
                practiceIds.isEmpty() ? List.of(-1L) : practiceIds, questionId, true, category.name(), PageRequest.of(page, 50));
        return new LogPage(slice.getContent(), slice.hasNext());
    }
}
