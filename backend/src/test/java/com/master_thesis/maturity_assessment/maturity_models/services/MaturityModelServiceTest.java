package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.DimensionDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityLevelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelEditorDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MappingRuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.GatingRuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.ModuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.PracticeDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionDTO;
import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.Domain;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityLevel;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingComparisonOperator;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingScoreOperation;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingSelection;
import com.master_thesis.maturity_assessment.maturity_models.repository.DomainRepository;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.time.LocalDateTime;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MaturityModelServiceTest {

    private MaturityModelRepository maturityModelRepository;
    private AssessmentRepository assessmentRepository;
    private DomainRepository domainRepository;
    private MaturityModelService service;

    @BeforeEach
    void setUp() {
        maturityModelRepository = mock(MaturityModelRepository.class);
        assessmentRepository = mock(AssessmentRepository.class);
        domainRepository = mock(DomainRepository.class);
        service = new MaturityModelService();
        ReflectionTestUtils.setField(service, "maturityModelRepository", maturityModelRepository);
        ReflectionTestUtils.setField(service, "assessmentRepository", assessmentRepository);
        ReflectionTestUtils.setField(service, "domainRepository", domainRepository);
        ReflectionTestUtils.setField(service, "objectMapper", new ObjectMapper());
    }

    @Test
    void getActiveMaturityModels_returnsEveryActiveModelInTheRequestedDomain() {
        Domain domain = domain();
        MaturityModel first = existingModel(10L, 10L, 1, domain);
        MaturityModel second = existingModel(20L, 20L, 1, domain);
        first.setName("First model");
        first.setIsActive(true);
        second.setName("Second model");
        second.setIsActive(true);
        when(maturityModelRepository.findByDomainIdAndIsActiveTrue(domain.getId()))
                .thenReturn(List.of(first, second));

        List<MaturityModelDTO> response = service.getActiveMaturityModels(domain.getId());

        assertEquals(2, response.size());
        assertEquals(List.of(10L, 20L), response.stream().map(MaturityModelDTO::getId).toList());
        verify(maturityModelRepository, never()).findByIsActiveTrue();
    }

    @Test
    void getActiveMaturityModels_withoutDomainReturnsEveryActiveModel() {
        Domain domain = domain();
        MaturityModel first = existingModel(10L, 10L, 1, domain);
        MaturityModel second = existingModel(20L, 20L, 1, domain);
        first.setIsActive(true);
        second.setIsActive(true);
        when(maturityModelRepository.findByIsActiveTrue()).thenReturn(List.of(first, second));

        List<MaturityModelDTO> response = service.getActiveMaturityModels(null);

        assertEquals(2, response.size());
        verify(maturityModelRepository, never()).findByDomainIdAndIsActiveTrue(any());
    }

    @Test
    void getActiveMaturityModels_returnsEmptyListWhenNoModelsAreActive() {
        when(maturityModelRepository.findByDomainIdAndIsActiveTrue(7L)).thenReturn(List.of());

        List<MaturityModelDTO> response = service.getActiveMaturityModels(7L);

        assertTrue(response.isEmpty());
    }

    @Test
    void activateMaturityModel_deactivatesOnlyTheOldVersionInTheSameLineage() {
        Domain domain = domain();
        MaturityModel firstLineageV1 = existingModel(10L, 10L, 1, domain);
        MaturityModel firstLineageV2 = existingModel(20L, 10L, 2, domain);
        MaturityModel secondLineage = existingModel(30L, 30L, 1, domain);
        firstLineageV1.setIsActive(true);
        secondLineage.setIsActive(true);

        when(maturityModelRepository.findById(firstLineageV2.getId()))
                .thenReturn(Optional.of(firstLineageV2));
        when(maturityModelRepository.findByBaseModelIdOrderByVersionAsc(10L))
                .thenReturn(List.of(firstLineageV1, firstLineageV2));
        when(maturityModelRepository.saveAndFlush(any(MaturityModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        MaturityModelDTO response = service.activateMaturityModel(firstLineageV2.getId());

        assertFalse(firstLineageV1.getIsActive());
        assertTrue(firstLineageV2.getIsActive());
        assertTrue(secondLineage.getIsActive());
        assertTrue(response.getIsActive());
        verify(maturityModelRepository, never()).findByDomainId(domain.getId());

        InOrder persistenceOrder = inOrder(maturityModelRepository);
        persistenceOrder.verify(maturityModelRepository).saveAllAndFlush(any());
        persistenceOrder.verify(maturityModelRepository).saveAndFlush(firstLineageV2);
    }

    @Test
    void updateMaturityModel_alwaysCreatesInactiveNextVersionForUnusedModel() {
        Domain domain = domain();
        MaturityModel existing = existingModel(10L, 10L, 1, domain);
        MaturityModelDTO update = updateDto(domain.getId(), null);

        when(maturityModelRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(maturityModelRepository.findByBaseModelIdOrderByVersionAsc(10L)).thenReturn(List.of(existing));
        when(assessmentRepository.findByMaturityModelId(10L)).thenReturn(List.of());
        when(domainRepository.findById(domain.getId())).thenReturn(Optional.of(domain));
        when(maturityModelRepository.saveAndFlush(any(MaturityModel.class))).thenAnswer(invocation -> {
            MaturityModel model = invocation.getArgument(0);
            assignGeneratedIds(model);
            return model;
        });
        when(maturityModelRepository.save(any(MaturityModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MaturityModelDTO response = service.updateMaturityModel(10L, update);

        assertEquals("VERSIONED", response.getUpdateMode());
        assertEquals(2, response.getVersion());
        assertEquals(10L, response.getBaseModelId());
        assertFalse(response.getIsActive());
        assertNotEquals(10L, response.getId());
        verify(maturityModelRepository, never()).delete(any());
    }

    @Test
    void updateMaturityModel_remapsCopiedQuestionDependenciesToNewQuestionIds() {
        Domain domain = domain();
        MaturityModel existing = existingModel(10L, 10L, 1, domain);
        MaturityModelDTO update = updateDto(domain.getId(), 101L);

        when(maturityModelRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(maturityModelRepository.findByBaseModelIdOrderByVersionAsc(10L)).thenReturn(List.of(existing));
        when(assessmentRepository.findByMaturityModelId(10L)).thenReturn(List.of(new Assessment()));
        when(domainRepository.findById(domain.getId())).thenReturn(Optional.of(domain));
        when(maturityModelRepository.saveAndFlush(any(MaturityModel.class))).thenAnswer(invocation -> {
            MaturityModel model = invocation.getArgument(0);
            assignGeneratedIds(model);
            return model;
        });
        when(maturityModelRepository.save(any(MaturityModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MaturityModelDTO response = service.updateMaturityModel(10L, update);

        List<QuestionDTO> questions = response.getDimensions().get(0).getModules().get(0).getPractices().get(0).getQuestions();
        Long newParentId = questions.get(0).getId();
        Long newDependentParentId = questions.get(1).getDependsOnQuestionId();

        assertNotEquals(101L, newParentId);
        assertEquals(newParentId, newDependentParentId);
        assertEquals("VERSIONED", response.getUpdateMode());
        assertEquals(1, response.getAssessmentUsageCount());
    }

    @Test
    void createFromEditor_usesPublicCodesAndPopulatesLegacyDependencyId() {
        Domain domain = domain();
        MaturityModelEditorDTO editor = new MaturityModelEditorDTO();
        editor.setName("Editor model");
        editor.setDescription("Description");
        editor.setChangelogMarkdown("## Added\n\n- A documented change");
        editor.setAutoEvaluated(true);
        editor.setDomainId(domain.getId());
        editor.setAggregationRule(AggregationRule.SUM);

        MaturityLevelDTO level1 = new MaturityLevelDTO();
        level1.setNumber(1);
        level1.setName("Low");
        MaturityLevelDTO level2 = new MaturityLevelDTO();
        level2.setNumber(2);
        level2.setName("High");
        editor.setLevels(List.of(level1, level2));

        var parent = new MaturityModelEditorDTO.EditorQuestionDTO();
        parent.setCode("Q1_PARENT");
        parent.setText("Parent?");
        parent.setType("boolean");
        parent.setWeight(1.0);
        parent.setBooleanCorrectAnswer(false);
        var child = new MaturityModelEditorDTO.EditorQuestionDTO();
        child.setCode("Q2_CHILD");
        child.setText("Child?");
        child.setType("likert");
        child.setWeight(1.0);
        child.setDependsOnQuestionCode("Q1_PARENT");
        child.setScalePointCount(7);
        child.setScaleMinLabel("Never");
        child.setScaleMaxLabel("Always");
        child.setScaleHighPointIsMaximum(false);
        var practice = new MaturityModelEditorDTO.EditorPracticeDTO();
        practice.setCode("P1_TEST");
        practice.setName("Practice");
        practice.setWeight(1.0);
        practice.setAggregationRule(AggregationRule.MINIMUM);
        practice.setGatingRules(List.of(gatingRule("Q1_PARENT")));
        practice.setQuestions(List.of(parent, child));
        var module = new MaturityModelEditorDTO.EditorModuleDTO();
        module.setCode("M1_TEST");
        module.setName("Module");
        module.setWeight(1.0);
        module.setAggregationRule(AggregationRule.MAXIMUM);
        module.setGatingRules(List.of(gatingRule("P1_TEST")));
        module.setPractices(List.of(practice));
        var dimension = new MaturityModelEditorDTO.EditorDimensionDTO();
        dimension.setCode("D1_TEST");
        dimension.setName("Dimension");
        dimension.setDescription("Dimension description");
        dimension.setWeight(2.5);
        dimension.setAggregationRule(AggregationRule.MEDIAN);
        dimension.setGatingRules(List.of(gatingRule("M1_TEST")));
        MappingRuleDTO mappingLevel1 = new MappingRuleDTO();
        mappingLevel1.setLevelNumber(1);
        mappingLevel1.setMinimumScore(0.0);
        MappingRuleDTO mappingLevel2 = new MappingRuleDTO();
        mappingLevel2.setLevelNumber(2);
        mappingLevel2.setMinimumScore(0.7);
        dimension.setMappingRules(List.of(mappingLevel1, mappingLevel2));
        dimension.setModules(List.of(module));
        editor.setDimensions(List.of(dimension));

        when(domainRepository.findById(domain.getId())).thenReturn(Optional.of(domain));
        when(maturityModelRepository.saveAndFlush(any(MaturityModel.class))).thenAnswer(invocation -> {
            MaturityModel model = invocation.getArgument(0);
            assignGeneratedIds(model);
            return model;
        });
        when(maturityModelRepository.save(any(MaturityModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User creator = new User();
        creator.setId(42L);
        creator.setName("Model Curator");
        creator.setEmail("curator@example.com");

        MaturityModelDTO response = service.createFromEditor(editor, creator);
        List<QuestionDTO> questions = response.getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).getQuestions();

        assertEquals("Q1_PARENT", questions.get(0).getCode());
        assertFalse(questions.get(0).getBooleanCorrectAnswer());
        assertEquals("Q1_PARENT", questions.get(1).getDependsOnQuestionCode());
        assertEquals(7, questions.get(1).getScalePointCount());
        assertEquals("Never", questions.get(1).getScaleMinLabel());
        assertEquals("Always", questions.get(1).getScaleMaxLabel());
        assertFalse(questions.get(1).getScaleHighPointIsMaximum());
        assertEquals(questions.get(0).getId(), questions.get(1).getDependsOnQuestionId());
        assertEquals("## Added\n\n- A documented change", response.getChangelogMarkdown());
        assertEquals(42L, response.getCreatorId());
        assertEquals("Model Curator", response.getCreatorName());
        assertEquals(AggregationRule.SUM, response.getAggregationRule());
        DimensionDTO savedDimension = response.getDimensions().get(0);
        assertEquals(AggregationRule.MEDIAN, savedDimension.getAggregationRule());
        assertEquals(List.of(0.0, 0.7), savedDimension.getMappingRules().stream()
                .map(rule -> rule.getMinimumScore())
                .toList());
        assertEquals(AggregationRule.MAXIMUM, savedDimension.getModules().get(0).getAggregationRule());
        assertEquals(
                AggregationRule.MINIMUM,
                savedDimension.getModules().get(0).getPractices().get(0).getAggregationRule()
        );
        assertEquals(2.5, savedDimension.getWeight());
        assertEquals("M1_TEST", savedDimension.getGatingRules().getFirst().getChildCode());
        assertEquals("P1_TEST", savedDimension.getModules().getFirst()
                .getGatingRules().getFirst().getChildCode());
        assertEquals("Q1_PARENT", savedDimension.getModules().getFirst().getPractices().getFirst()
                .getGatingRules().getFirst().getChildCode());
    }

    private GatingRuleDTO gatingRule(String childCode) {
        GatingRuleDTO rule = new GatingRuleDTO();
        rule.setOrder(0);
        rule.setSelection(GatingSelection.SPECIFIC_CHILD);
        rule.setChildCode(childCode);
        rule.setOperator(GatingComparisonOperator.BELOW);
        rule.setThreshold(new BigDecimal("0.40"));
        rule.setOperation(GatingScoreOperation.SET);
        rule.setValue(new BigDecimal("0.40"));
        return rule;
    }

    @Test
    void prepareEditorDocument_startsTheNewVersionWithAnEmptyChangelog() {
        MaturityModelDTO source = updateDto(domain().getId(), null);
        source.setChangelogMarkdown("## Version 1\n\nExisting release notes");

        MaturityModelEditorDTO editor = service.prepareEditorDocument(source);

        assertEquals("", editor.getChangelogMarkdown());
    }

    @Test
    void createMaturityModel_allowsSiblingCodesToRepeatInDifferentBranches() {
        Domain domain = domain();
        MaturityModelDTO dto = updateDto(domain.getId(), null);
        DimensionDTO dimension = dto.getDimensions().get(0);
        dimension.setDescription(null);

        ModuleDTO firstModule = dimension.getModules().get(0);
        firstModule.setCode("M1_FIRST");
        PracticeDTO firstPractice = firstModule.getPractices().get(0);
        firstPractice.setCode("P1_SHARED");
        firstPractice.getQuestions().get(0).setCode("Q1_SHARED");

        QuestionDTO secondQuestion = new QuestionDTO();
        secondQuestion.setCode("Q1_SHARED");
        secondQuestion.setText("Second branch question?");
        secondQuestion.setType("boolean");
        secondQuestion.setWeight(1.0);
        PracticeDTO secondPractice = new PracticeDTO();
        secondPractice.setCode("P1_SHARED");
        secondPractice.setName("Second practice");
        secondPractice.setWeight(1.0);
        secondPractice.setQuestions(List.of(secondQuestion));
        ModuleDTO secondModule = new ModuleDTO();
        secondModule.setCode("M2_SECOND");
        secondModule.setName("Second module");
        secondModule.setWeight(1.0);
        secondModule.setPractices(List.of(secondPractice));
        dimension.setModules(List.of(firstModule, secondModule));

        when(domainRepository.findById(domain.getId())).thenReturn(Optional.of(domain));
        when(maturityModelRepository.saveAndFlush(any(MaturityModel.class))).thenAnswer(invocation -> {
            MaturityModel model = invocation.getArgument(0);
            assignGeneratedIds(model);
            return model;
        });
        when(maturityModelRepository.save(any(MaturityModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MaturityModelDTO response = service.createMaturityModel(dto);

        assertNull(response.getDimensions().get(0).getDescription());
        List<ModuleDTO> modules = response.getDimensions().get(0).getModules();
        assertEquals("P1_SHARED", modules.get(0).getPractices().get(0).getCode());
        assertEquals("P1_SHARED", modules.get(1).getPractices().get(0).getCode());
        assertEquals("Q1_SHARED", modules.get(0).getPractices().get(0).getQuestions().get(0).getCode());
        assertEquals("Q1_SHARED", modules.get(1).getPractices().get(0).getQuestions().get(0).getCode());
    }

    @Test
    void createMaturityModel_rejectsOutOfScopeAndOverPrecisionGatingRules() {
        MaturityModelDTO outsideScope = updateDto(domain().getId(), null);
        PracticeDTO practice = outsideScope.getDimensions().getFirst().getModules().getFirst()
                .getPractices().getFirst();
        practice.setGatingRules(List.of(gatingRule("Q_OUTSIDE")));

        IllegalOperationException scopeError = assertThrows(
                IllegalOperationException.class,
                () -> service.createMaturityModel(outsideScope));
        assertEquals("INVALID_GATING_RULES", scopeError.getErrorCode());

        MaturityModelDTO excessivePrecision = updateDto(domain().getId(), null);
        PracticeDTO secondPractice = excessivePrecision.getDimensions().getFirst().getModules().getFirst()
                .getPractices().getFirst();
        String childCode = secondPractice.getQuestions().getFirst().getCode();
        GatingRuleDTO rule = gatingRule(childCode);
        rule.setThreshold(new BigDecimal("0.345"));
        secondPractice.setGatingRules(List.of(rule));

        IllegalOperationException precisionError = assertThrows(
                IllegalOperationException.class,
                () -> service.createMaturityModel(excessivePrecision));
        assertEquals("INVALID_GATING_RULES", precisionError.getErrorCode());
    }

    @Test
    void createMaturityModel_rejectsConflictingDependencyIdAndCode() {
        MaturityModelDTO dto = updateDto(domain().getId(), 101L);
        List<QuestionDTO> questions = dto.getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).getQuestions();
        questions.get(1).setDependsOnQuestionCode("Q2_FU");

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> service.createMaturityModel(dto));

        assertEquals("INVALID_QUESTION_DEPENDENCY", exception.getErrorCode());
    }

    @Test
    void createMaturityModel_persistsPercentageIntegerBoundsAndDirection() {
        Domain domain = domain();
        MaturityModelDTO dto = updateDto(domain.getId(), null);
        QuestionDTO question = dto.getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).getQuestions().get(0);
        question.setType("percentage");
        question.setRangeMin(10);
        question.setRangeMax(90);
        question.setRangeHighValueIsMaximum(false);

        when(domainRepository.findById(domain.getId())).thenReturn(Optional.of(domain));
        when(maturityModelRepository.saveAndFlush(any(MaturityModel.class))).thenAnswer(invocation -> {
            MaturityModel model = invocation.getArgument(0);
            assignGeneratedIds(model);
            return model;
        });
        when(maturityModelRepository.save(any(MaturityModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MaturityModelDTO response = service.createMaturityModel(dto);

        QuestionDTO savedQuestion = response.getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).getQuestions().get(0);
        assertEquals("percentage", savedQuestion.getType());
        assertEquals(10, savedQuestion.getRangeMin());
        assertEquals(90, savedQuestion.getRangeMax());
        assertFalse(savedQuestion.getRangeHighValueIsMaximum());
    }

    @Test
    void createMaturityModel_rejectsInvalidIntegerBounds() {
        MaturityModelDTO dto = updateDto(domain().getId(), null);
        QuestionDTO question = dto.getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).getQuestions().get(0);
        question.setType("percentage");
        question.setRangeMin(100);
        question.setRangeMax(10);

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> service.createMaturityModel(dto));

        assertEquals("INVALID_QUESTION_RANGE", exception.getErrorCode());
    }

    @Test
    void createMaturityModel_rejectsRemovedQuestionTypes() {
        MaturityModelDTO dto = updateDto(domain().getId(), null);
        dto.getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).getQuestions().get(0)
                .setType("boolean_justification");

        IllegalOperationException exception = assertThrows(
                IllegalOperationException.class,
                () -> service.createMaturityModel(dto));

        assertEquals("INVALID_QUESTION_TYPE", exception.getErrorCode());
    }

    @Test
    void createMaturityModel_persistsQuestionListOrder() {
        Domain domain = domain();
        MaturityModelDTO dto = updateDto(domain.getId(), null);
        List<QuestionDTO> questions = dto.getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).getQuestions();
        dto.getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).setQuestions(List.of(questions.get(1), questions.get(0)));

        when(domainRepository.findById(domain.getId())).thenReturn(Optional.of(domain));
        when(maturityModelRepository.saveAndFlush(any(MaturityModel.class))).thenAnswer(invocation -> {
            MaturityModel model = invocation.getArgument(0);
            assignGeneratedIds(model);
            return model;
        });
        when(maturityModelRepository.save(any(MaturityModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MaturityModelDTO response = service.createMaturityModel(dto);
        List<QuestionDTO> savedQuestions = response.getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).getQuestions();

        assertEquals("Q1_FU", savedQuestions.get(0).getCode());
        assertEquals(0, savedQuestions.get(0).getSortOrder());
        assertEquals("Q2_P", savedQuestions.get(1).getCode());
        assertEquals(1, savedQuestions.get(1).getSortOrder());
    }

    @Test
    void getMaturityModelVersions_returnsLineageSummariesOrderedByVersion() {
        Domain domain = domain();
        MaturityModel v1 = existingModel(10L, 10L, 1, domain);
        MaturityModel v2 = existingModel(20L, 10L, 2, domain);
        LocalDateTime v1CreatedAt = LocalDateTime.of(2025, 1, 10, 9, 30);
        LocalDateTime v2CreatedAt = LocalDateTime.of(2025, 2, 15, 14, 0);
        v1.setCreatedAt(v1CreatedAt);
        v2.setCreatedAt(v2CreatedAt);
        v2.setIsActive(true);

        when(maturityModelRepository.findById(20L)).thenReturn(Optional.of(v2));
        when(maturityModelRepository.findByBaseModelIdOrderByVersionAsc(10L)).thenReturn(List.of(v1, v2));

        var versions = service.getMaturityModelVersions(20L);

        assertEquals(2, versions.size());
        assertEquals(10L, versions.get(0).getBaseModelId());
        assertEquals(1, versions.get(0).getVersion());
        assertEquals(v1CreatedAt, versions.get(0).getCreatedAt());
        assertEquals(2, versions.get(1).getVersion());
        assertEquals(v2CreatedAt, versions.get(1).getCreatedAt());
        assertEquals(true, versions.get(1).getIsActive());
    }

    private static Domain domain() {
        Domain domain = new Domain();
        domain.setId(7L);
        domain.setName("Domain");
        return domain;
    }

    private static MaturityModel existingModel(Long id, Long baseModelId, int version, Domain domain) {
        MaturityModel model = new MaturityModel();
        model.setId(id);
        model.setBaseModelId(baseModelId);
        model.setVersion(version);
        model.setName("Model");
        model.setDescription("Description");
        model.setIsActive(false);
        model.setAutoEvaluated(true);
        model.setDomain(domain);
        model.setLevels(existingLevels(model));
        model.setDimensions(new ArrayList<>());
        return model;
    }

    private static List<MaturityLevel> existingLevels(MaturityModel model) {
        MaturityLevel level1 = new MaturityLevel();
        level1.setNumber(1);
        level1.setLevelNumber(1);
        level1.setName("Low");
        level1.setMaturityModel(model);
        MaturityLevel level2 = new MaturityLevel();
        level2.setNumber(2);
        level2.setLevelNumber(2);
        level2.setName("High");
        level2.setMaturityModel(model);
        return List.of(level1, level2);
    }

    private static MaturityModelDTO updateDto(Long domainId, Long dependentParentId) {
        QuestionDTO parent = new QuestionDTO();
        parent.setId(101L);
        parent.setText("Parent?");
        parent.setType("boolean");
        parent.setWeight(1.0);
        parent.setRequired(false);
        parent.setRequiresEvidence(false);

        QuestionDTO dependent = new QuestionDTO();
        dependent.setId(102L);
        dependent.setText("Follow up?");
        dependent.setType("boolean");
        dependent.setWeight(1.0);
        dependent.setRequired(false);
        dependent.setRequiresEvidence(false);
        dependent.setDependsOnQuestionId(dependentParentId);

        PracticeDTO practice = new PracticeDTO();
        practice.setId(201L);
        practice.setName("Practice");
        practice.setWeight(1.0);
        practice.setQuestions(List.of(parent, dependent));

        ModuleDTO module = new ModuleDTO();
        module.setCode("MOD");
        module.setName("Module");
        module.setWeight(1.0);
        module.setPractices(List.of(practice));

        DimensionDTO dimension = new DimensionDTO();
        dimension.setId("dim");
        dimension.setName("Dimension");
        dimension.setDescription("Dimension description");
        dimension.setModules(List.of(module));

        MaturityLevelDTO level1 = new MaturityLevelDTO();
        level1.setNumber(1);
        level1.setName("Low");
        MaturityLevelDTO level2 = new MaturityLevelDTO();
        level2.setNumber(2);
        level2.setName("High");

        MaturityModelDTO dto = new MaturityModelDTO();
        dto.setName("Updated model");
        dto.setDescription("Updated description");
        dto.setAutoEvaluated(true);
        dto.setDomainId(domainId);
        dto.setLevels(List.of(level1, level2));
        dto.setDimensions(List.of(dimension));
        return dto;
    }

    private static void assignGeneratedIds(MaturityModel model) {
        AtomicLong ids = new AtomicLong(1000L);
        model.setId(ids.getAndIncrement());
        if (model.getDimensions() == null) {
            return;
        }
        for (Dimension dimension : model.getDimensions()) {
            dimension.setId(ids.getAndIncrement());
            for (Module module : dimension.getModules()) {
                module.setId(ids.getAndIncrement());
                for (Practice practice : module.getPractices()) {
                    practice.setId(ids.getAndIncrement());
                    for (Question question : practice.getQuestions()) {
                        question.setId(ids.getAndIncrement());
                    }
                }
            }
        }
    }

}
