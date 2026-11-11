package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceFreshnessSummary;
import com.master_thesis.maturity_assessment.assessments.dto.EvidenceFreshnessSummary.Indicator;
import com.master_thesis.maturity_assessment.assessments.repository.EvidenceRepository;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;

@Service
public class EvidenceLifecycleService {
    private final EvidenceRepository evidenceRepository;
    private final MaturityModelRepository models;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public EvidenceLifecycleService(EvidenceRepository evidenceRepository, MaturityModelRepository models) {
        this(evidenceRepository, models, Clock.systemUTC());
    }

    EvidenceLifecycleService(EvidenceRepository evidenceRepository, MaturityModelRepository models, Clock clock) {
        this.evidenceRepository = evidenceRepository;
        this.models = models;
        this.clock = clock;
    }

    /** Batch reads only metadata; never file bytes, scores or assessment updates. */
    @Transactional(readOnly = true)
    public void enrich(List<AssessmentResponse> responses, BiPredicate<Question, AssessmentResponse> active) {
        if (responses.isEmpty()) return;
        var ids = responses.stream().map(AssessmentResponse::getId).filter(Objects::nonNull).toList();
        var modelIds = responses.stream().map(AssessmentResponse::getMaturityModelId).filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty() || modelIds.isEmpty()) return;
        var records = evidenceRepository.findLifecycleMetadataByAssessmentIdIn(ids).stream()
                .collect(Collectors.groupingBy(EvidenceRepository.LifecycleMetadata::getAssessmentId));
        Map<Long, MaturityModel> byModel = models.findAllById(modelIds).stream().collect(Collectors.toMap(MaturityModel::getId, model -> model));
        Instant now = clock.instant();
        LocalDate today = now.atZone(ZoneOffset.UTC).toLocalDate();
        for (var response : responses) {
            var model = byModel.get(response.getMaturityModelId());
            if (model == null) continue;
            var items = records.getOrDefault(response.getId(), List.of());
            response.setHistoricalEvidenceValidity(evaluate(model, items, response.getReferenceDate(), now,
                    question -> active.test(question, response), false));
            response.setCurrentEvidenceFreshness(evaluate(model, items, today, now,
                    question -> active.test(question, response), true));
        }
    }

    private EvidenceFreshnessSummary evaluate(MaturityModel model, List<EvidenceRepository.LifecycleMetadata> records,
            LocalDate date, Instant now, java.util.function.Predicate<Question> active, boolean live) {
        List<Indicator> indicators = new ArrayList<>();
        Instant next = null;
        for (var dimension : safe(model.getDimensions())) for (var module : safe(dimension.getModules())) {
            if (Boolean.FALSE.equals(module.getVisible())) continue;
            for (var practice : safe(module.getPractices())) {
                if (safe(practice.getQuestions()).stream().noneMatch(active)) continue;
                for (var requirement : safe(practice.getEvidenceRequirements())) {
                    var age = requirement.effectiveMaxAgeDays();
                    var evaluated = records.stream().filter(item -> practice.getId().equals(item.getPracticeId())
                            && requirement.getCode().equals(item.getRequirementCode()))
                            .map(item -> EvidenceFreshness.record(item.getId(), item.getCollectedAt(), age, date)).toList();
                    var through = evaluated.stream().map(EvidenceFreshnessSummary.RecordFreshness::validThrough)
                            .filter(Objects::nonNull).max(LocalDate::compareTo).orElse(null);
                    indicators.add(new Indicator(practice.getId(), practice.getName(), requirement.getCode(),
                            requirement.getName(), Boolean.TRUE.equals(requirement.getRequired()), !evaluated.isEmpty(),
                            EvidenceFreshness.indicatorStatus(evaluated), age, through, evaluated));
                    if (live) for (var record : evaluated) {
                        if ("CURRENT".equals(record.status()) && record.validThrough() != null) {
                            Instant transition = record.validThrough().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
                            if (next == null || transition.isBefore(next)) next = transition;
                        }
                    }
                }
            }
        }
        return new EvidenceFreshnessSummary(date, now, next,
                (int) indicators.stream().filter(Indicator::required).count(),
                count(indicators, "OUTDATED"), count(indicators, "UNKNOWN_DATE"), count(indicators, "MISSING"), indicators);
    }

    private int count(List<Indicator> indicators, String status) {
        return (int) indicators.stream().filter(item -> item.required() && status.equals(item.status())).count();
    }
    private static <T> List<T> safe(List<T> values) { return values == null ? List.of() : values; }
}
