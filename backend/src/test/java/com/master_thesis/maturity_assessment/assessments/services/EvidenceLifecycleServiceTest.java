package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.AssessmentResponse;
import com.master_thesis.maturity_assessment.assessments.repository.EvidenceRepository;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EvidenceLifecycleServiceTest {
    @Test
    void profileDefaultsAndExplicitDayOverrides() {
        var requirement = requirement();
        assertEquals(null, requirement.effectiveMaxAgeDays());
        requirement.setFrequency(EvidenceRequirement.Frequency.monthly);
        assertEquals(31, requirement.effectiveMaxAgeDays());
        requirement.setFrequency(EvidenceRequirement.Frequency.quarterly);
        assertEquals(92, requirement.effectiveMaxAgeDays());
        requirement.setFrequency(EvidenceRequirement.Frequency.yearly);
        assertEquals(366, requirement.effectiveMaxAgeDays());
        requirement.setMaxAgeDays(0);
        assertEquals(0, requirement.effectiveMaxAgeDays());
        assertEquals(0, requirement.copy().effectiveMaxAgeDays());
    }

    @Test
    void strictAgeBoundaryAndProfileB8Vector() {
        var collected = LocalDate.of(2026, 10, 31);
        assertEquals("CURRENT", EvidenceFreshness.record(1L, collected, 31, LocalDate.of(2026, 12, 1)).status());
        var expired = EvidenceFreshness.record(1L, collected, 31, LocalDate.of(2026, 12, 2));
        assertEquals("OUTDATED", expired.status());
        assertEquals(32L, expired.ageDays());
        assertEquals(LocalDate.of(2026, 12, 1), expired.validThrough());
        var vector = EvidenceFreshness.record(1L, LocalDate.of(2025, 10, 1), 366, LocalDate.of(2026, 11, 4));
        assertEquals(399L, vector.ageDays());
        assertEquals("OUTDATED", vector.status());
        assertEquals("NO_EXPIRY", EvidenceFreshness.record(1L, collected, null, LocalDate.of(2090, 1, 1)).status());
    }

    @Test
    void outdatedIndicatorIsSatisfiedAndNeedsAllPresentRecordsToBeOutdated() {
        var date = LocalDate.of(2026, 12, 2);
        var old = EvidenceFreshness.record(1L, LocalDate.of(2026, 10, 31), 31, date);
        var current = EvidenceFreshness.record(2L, LocalDate.of(2026, 11, 30), 31, date);
        var unknown = EvidenceFreshness.record(3L, null, 31, date);
        assertEquals("MISSING", EvidenceFreshness.indicatorStatus(List.of()));
        assertEquals("OUTDATED", EvidenceFreshness.indicatorStatus(List.of(old)));
        assertEquals("CURRENT", EvidenceFreshness.indicatorStatus(List.of(old, current)));
        assertEquals("CURRENT", EvidenceFreshness.indicatorStatus(List.of(old, current, unknown)));
        assertEquals("UNKNOWN_DATE", EvidenceFreshness.indicatorStatus(List.of(old, unknown)));
    }

    @Test
    void historicalAndCurrentFreshnessAreIndependentAndReadOnlyWithBatchMetadata() {
        var evidence = mock(EvidenceRepository.class);
        var models = mock(MaturityModelRepository.class);
        var service = new EvidenceLifecycleService(evidence, models, Clock.fixed(Instant.parse("2026-12-02T10:00:00Z"), ZoneOffset.UTC));
        var model = model();
        var response = response();
        var second = response(); second.setId(11L);
        var provided = metadata(1L, 10L, "2026-10-31");
        when(evidence.findLifecycleMetadataByAssessmentIdIn(List.of(10L, 11L))).thenReturn(List.of(provided));
        when(models.findAllById(List.of(20L))).thenReturn(List.of(model));
        service.enrich(List.of(response, second), (question, assessment) -> true);
        assertEquals(0, response.getHistoricalEvidenceValidity().outdatedIndicatorCount());
        assertEquals(1, response.getCurrentEvidenceFreshness().outdatedIndicatorCount());
        assertTrue(response.getCurrentEvidenceFreshness().indicators().getFirst().satisfied());
        assertEquals(1, second.getCurrentEvidenceFreshness().missingIndicatorCount());
        assertEquals(73.0, response.getOverallPercentageScore());
        assertEquals("COMPLETED", response.getStatus());
        assertEquals(LocalDate.of(2026, 11, 4), response.getReferenceDate());
        // Editing only the reference date reevaluates historical validity, not scores.
        response.setReferenceDate(LocalDate.of(2026, 12, 2));
        when(evidence.findLifecycleMetadataByAssessmentIdIn(List.of(10L))).thenReturn(List.of(provided));
        service.enrich(List.of(response), (question, assessment) -> true);
        assertEquals(1, response.getHistoricalEvidenceValidity().outdatedIndicatorCount());
        assertEquals(73.0, response.getOverallPercentageScore());
        verify(evidence, never()).save(any());
        verify(models, never()).save(any());
    }

    @Test
    void midnightTransitionAndHiddenOrInactiveIndicators() {
        var evidence = mock(EvidenceRepository.class);
        var models = mock(MaturityModelRepository.class);
        var service = new EvidenceLifecycleService(evidence, models, Clock.fixed(Instant.parse("2026-12-01T23:59:00Z"), ZoneOffset.UTC));
        var model = model();
        var provided = metadata(1L, 10L, "2026-10-31");
        when(evidence.findLifecycleMetadataByAssessmentIdIn(List.of(10L))).thenReturn(List.of(provided));
        when(models.findAllById(List.of(20L))).thenReturn(List.of(model));
        var response = response();
        service.enrich(List.of(response), (question, assessment) -> true);
        assertEquals(Instant.parse("2026-12-02T00:00:00Z"), response.getCurrentEvidenceFreshness().nextRefreshAt());
        service.enrich(List.of(response), (question, assessment) -> false);
        assertTrue(response.getCurrentEvidenceFreshness().indicators().isEmpty());
        model.getDimensions().getFirst().getModules().getFirst().setVisible(false);
        service.enrich(List.of(response), (question, assessment) -> true);
        assertTrue(response.getCurrentEvidenceFreshness().indicators().isEmpty());
    }

    private EvidenceRequirement requirement() {
        return new EvidenceRequirement("report", "Monthly report", "Use period end", true, EvidenceRequirement.Format.FILE_OR_URL);
    }
    private MaturityModel model() {
        var model = new MaturityModel(); model.setId(20L);
        var dimension = new Dimension(); var module = new Module(); var practice = new Practice();
        var requirement = requirement(); requirement.setFrequency(EvidenceRequirement.Frequency.monthly);
        practice.setId(30L); practice.setName("Incident management"); practice.setEvidenceRequirements(List.of(requirement)); practice.setQuestions(List.of(new Question()));
        module.setPractices(List.of(practice)); dimension.setModules(List.of(module)); model.setDimensions(List.of(dimension));
        return model;
    }
    private AssessmentResponse response() {
        var response = new AssessmentResponse(); response.setId(10L); response.setMaturityModelId(20L);
        response.setReferenceDate(LocalDate.of(2026, 11, 4)); response.setStatus("COMPLETED"); response.setOverallPercentageScore(73.0);
        return response;
    }
    private EvidenceRepository.LifecycleMetadata metadata(Long id, Long assessment, String date) {
        var item = mock(EvidenceRepository.LifecycleMetadata.class);
        when(item.getId()).thenReturn(id); when(item.getAssessmentId()).thenReturn(assessment);
        when(item.getPracticeId()).thenReturn(30L); when(item.getRequirementCode()).thenReturn("report");
        when(item.getCollectedAt()).thenReturn(LocalDate.parse(date)); return item;
    }
}
