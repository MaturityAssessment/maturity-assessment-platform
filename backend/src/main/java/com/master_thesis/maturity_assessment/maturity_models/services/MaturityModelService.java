package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionChoiceDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.PracticeDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.ModuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.DimensionDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.DomainDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelSummaryDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityLevelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelEditorDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MappingRuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.GatingRuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityLevel;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Domain;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;
import com.master_thesis.maturity_assessment.maturity_models.models.DimensionMappingRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingRule;
import com.master_thesis.maturity_assessment.maturity_models.models.GatingSelection;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import com.master_thesis.maturity_assessment.maturity_models.repository.DomainRepository;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.config.TextLimits;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MaturityModelService {

        private static final String TYPE_MULTIPLE_CHOICE = "multiple_choice";
        private static final String TYPE_LIKERT = "likert";
        private static final String TYPE_NUMERIC = "numeric";
        private static final String TYPE_PERCENTAGE = "percentage";
        private static final String TYPE_EVIDENCE = "evidence";
        private static final Set<String> ALLOWED_QUESTION_TYPES = Set.of(
                        "boolean",
                        TYPE_LIKERT,
                        TYPE_MULTIPLE_CHOICE,
                        "open_answer",
                        TYPE_NUMERIC,
                        TYPE_PERCENTAGE,
                        TYPE_EVIDENCE);

        private static final int MIN_MATURITY_LEVELS = 2;
        private static final int MAX_MATURITY_LEVELS = 12;
        private static final AggregationRule DEFAULT_AGGREGATION_RULE = AggregationRule.WEIGHTED_AVERAGE;

        @Autowired
        private MaturityModelRepository maturityModelRepository;

        @Autowired
        private AssessmentRepository assessmentRepository;

        @Autowired
        private DomainRepository domainRepository;

        @Autowired
        private ObjectMapper objectMapper;

        public List<MaturityModelSummaryDTO> getAllMaturityModels(Long domainId) {
                List<MaturityModel> models;
                if (domainId != null) {
                        models = maturityModelRepository.findByDomainId(domainId);
                } else {
                        models = maturityModelRepository.findAll();
                }
                return models.stream()
                                .map(this::convertToSummary)
                                .collect(Collectors.toList());
        }

        public MaturityModelDTO getMaturityModelById(Long id) {
                MaturityModel model = maturityModelRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Maturity model not found with id: " + id));
                return convertToDTO(model);
        }

        public List<MaturityModelSummaryDTO> getMaturityModelVersions(Long id) {
                MaturityModel model = maturityModelRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Maturity model not found with id: " + id));
                Long lineageRoot = resolveLineageRoot(model);
                List<MaturityModel> lineage = maturityModelRepository.findByBaseModelIdOrderByVersionAsc(lineageRoot);
                if (lineage.isEmpty()) {
                        lineage = List.of(model);
                }
                return lineage.stream()
                                .sorted(Comparator.comparing(MaturityModel::getVersion,
                                                Comparator.nullsLast(Integer::compareTo)))
                                .map(this::convertToSummary)
                                .collect(Collectors.toList());
        }

        public List<MaturityModelDTO> getActiveMaturityModels(Long domainId) {
                List<MaturityModel> models;
                if (domainId != null) {
                        models = maturityModelRepository.findByDomainIdAndIsActiveTrue(domainId);
                } else {
                        models = maturityModelRepository.findByIsActiveTrue();
                }
                return models.stream()
                                .map(this::convertToDTO)
                                .collect(Collectors.toList());
        }

        @Transactional
        public MaturityModelDTO createMaturityModel(MaturityModelDTO maturityModelDTO) {
                return createMaturityModel(maturityModelDTO, null);
        }

        @Transactional
        public MaturityModelDTO createMaturityModel(MaturityModelDTO maturityModelDTO, User creator) {
                // A domain is required when creating a model
                if (maturityModelDTO.getDomainId() == null) {
                        throw new IllegalOperationException(
                                "DOMAIN_REQUIRED",
                                "Cannot create maturity model without a domain. Please select a domain."
                        );
                }

                prepareAndValidatePublicCodes(maturityModelDTO);
                validateTextLengths(maturityModelDTO);
                validateMaturityModelLevels(maturityModelDTO);
                validateDimensionMappingRules(maturityModelDTO);
                validateGatingRules(maturityModelDTO);
                validateMaturityModelQuestions(maturityModelDTO);

                MaturityModel model = convertFromDTO(maturityModelDTO);
                model.setCreatedBy(creator);
                // Set version to 1 for new models, or use provided version if specified
                if (maturityModelDTO.getVersion() != null) {
                        model.setVersion(maturityModelDTO.getVersion());
                } else {
                        model.setVersion(1);
                }
                MaturityModel savedModel = maturityModelRepository.saveAndFlush(model);
                // For version 1, set baseModelId to its own ID (self-reference)
                if (savedModel.getBaseModelId() == null) {
                        savedModel.setBaseModelId(savedModel.getId());
                        savedModel = maturityModelRepository.save(savedModel);
                }
                return convertToDTO(savedModel);
        }

        public MaturityModelEditorDTO getMaturityModelEditor(Long id) {
                MaturityModelDTO source = getMaturityModelById(id);
                validatePersistedPublicCodes(source);
                return toEditorDocument(source);
        }

        public MaturityModelEditorDTO prepareEditorDocument(MaturityModelDTO source) {
                prepareAndValidatePublicCodes(source);
                return toEditorDocument(source);
        }

        public MaturityModelDTO createFromEditor(MaturityModelEditorDTO editor) {
                return createFromEditor(editor, null);
        }

        public MaturityModelDTO createFromEditor(MaturityModelEditorDTO editor, User creator) {
                return createMaturityModel(fromEditorDocument(editor), creator);
        }

        public MaturityModelDTO createVersionFromEditor(Long sourceId, MaturityModelEditorDTO editor) {
                return createVersionFromEditor(sourceId, editor, null);
        }

        public MaturityModelDTO createVersionFromEditor(
                        Long sourceId,
                        MaturityModelEditorDTO editor,
                        User creator) {
                return updateMaturityModel(sourceId, fromEditorDocument(editor), creator);
        }

        @Transactional
        public MaturityModelDTO deleteMaturityModel(Long id) {
                MaturityModel model = maturityModelRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Maturity model not found with id: " + id));
                
                // Check if any assessments are using this maturity model
                List<?> assessments = assessmentRepository.findByMaturityModelId(id);
                if (!assessments.isEmpty()) {
                        throw new IllegalOperationException(
                                "MATURITY_MODEL_IN_USE",
                                "Cannot delete maturity model. It has been used in " + assessments.size() + " assessment(s)."
                        );
                }
                
                maturityModelRepository.delete(model);
                return convertToDTO(model);
        }

        private MaturityModelSummaryDTO convertToSummary(MaturityModel model) {
                MaturityModelSummaryDTO summary = new MaturityModelSummaryDTO();
                summary.setId(model.getId());
                summary.setName(model.getName());
                summary.setDescription(model.getDescription());
                summary.setIsActive(model.getIsActive());
                summary.setAutoEvaluated(model.getAutoEvaluated());
                summary.setVersion(model.getVersion());
                summary.setBaseModelId(model.getBaseModelId());
                summary.setCreatedAt(model.getCreatedAt());
                summary.setCreatorName(resolveCreatorName(model.getCreatedBy()));
                if (model.getDomain() != null) {
                        summary.setDomainId(model.getDomain().getId());
                        summary.setDomainName(model.getDomain().getName());
                        summary.setDomainIconKey(model.getDomain().getIconKey());
                        summary.setDomainColorKey(model.getDomain().getColorKey());
                }
                summary.setDimensionCount(model.getDimensions().size());
                summary.setLevelCount(
                                model.getLevels() != null ? model.getLevels().size() : 0);
                // Count modules
                summary.setModuleCount(model.getDimensions().stream()
                                .mapToInt(dim -> dim.getModules() != null ? dim.getModules().size() : 0)
                                .sum());
                // Count questions through modules and practices
                summary.setTotalQuestions(model.getDimensions().stream()
                                .flatMap(dim -> dim.getModules() != null ? dim.getModules().stream() : java.util.stream.Stream.empty())
                                .flatMap(mod -> mod.getPractices() != null ? mod.getPractices().stream() : java.util.stream.Stream.empty())
                                .mapToInt(prac -> prac.getQuestions() != null ? prac.getQuestions().size() : 0)
                                .sum());
                return summary;
        }

        private MaturityModelDTO convertToDTO(MaturityModel model) {
                MaturityModelDTO dto = new MaturityModelDTO();
                dto.setId(model.getId());
                dto.setName(model.getName());
                dto.setDescription(model.getDescription());
                dto.setChangelogMarkdown(model.getChangelogMarkdown());
                dto.setIsActive(model.getIsActive());
                dto.setAutoEvaluated(model.getAutoEvaluated());
                dto.setVersion(model.getVersion());
                dto.setBaseModelId(model.getBaseModelId());
                dto.setCreatedAt(model.getCreatedAt());
                dto.setAggregationRule(resolveAggregationRule(model.getAggregationRule()));
                if (model.getCreatedBy() != null) {
                        dto.setCreatorId(model.getCreatedBy().getId());
                        dto.setCreatorName(resolveCreatorName(model.getCreatedBy()));
                }
                
                // Convert domain
                if (model.getDomain() != null) {
                        dto.setDomainId(model.getDomain().getId());
                        DomainDTO domainDTO = new DomainDTO();
                        domainDTO.setId(model.getDomain().getId());
                        domainDTO.setName(model.getDomain().getName());
                        domainDTO.setDescription(model.getDomain().getDescription());
                        domainDTO.setIconKey(model.getDomain().getIconKey());
                        domainDTO.setColorKey(model.getDomain().getColorKey());
                        dto.setDomain(domainDTO);
                }

                // Convert dimensions
                List<DimensionDTO> dimensionDTOs = model.getDimensions().stream()
                                .map(this::convertDimensionToDTO)
                                .collect(Collectors.toList());
                dto.setDimensions(dimensionDTOs);

                if (model.getLevels() != null && !model.getLevels().isEmpty()) {
                        List<MaturityLevelDTO> levelDtos = model.getLevels().stream()
                                        .sorted(Comparator.comparing(MaturityLevel::getNumber,
                                                        Comparator.nullsLast(Integer::compareTo)))
                                        .map(this::convertLevelToDTO)
                                        .collect(Collectors.toList());
                        dto.setLevels(levelDtos);
                }

                return dto;
        }

        private MaturityLevelDTO convertLevelToDTO(MaturityLevel level) {
                MaturityLevelDTO d = new MaturityLevelDTO();
                d.setNumber(level.getNumber());
                d.setName(level.getName());
                d.setDescription(level.getDescription());
                return d;
        }

        private MaturityModel convertFromDTO(MaturityModelDTO dto) {
                MaturityModel model = new MaturityModel();
                model.setName(dto.getName());
                model.setDescription(dto.getDescription());
                model.setChangelogMarkdown(dto.getChangelogMarkdown());
                model.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : false);
                model.setAutoEvaluated(dto.getAutoEvaluated() != null ? dto.getAutoEvaluated() : true);
                model.setAggregationRule(resolveAggregationRule(dto.getAggregationRule()));
                // Version will be set based on context (create vs update)

                // Set domain if provided
                if (dto.getDomainId() != null) {
                        Domain domain = domainRepository.findById(dto.getDomainId())
                                        .orElseThrow(() -> new RuntimeException("Domain not found with id: " + dto.getDomainId()));
                        model.setDomain(domain);
                }

                // Note: model.setId() is not called here - it will be auto-generated by the
                // database

                // Convert and set dimensions (list index = persisted sort order)
                if (dto.getDimensions() != null) {
                        List<DimensionDTO> dimensionDtos = dto.getDimensions();
                        List<Dimension> dimensions = new ArrayList<>(dimensionDtos.size());
                        for (int i = 0; i < dimensionDtos.size(); i++) {
                                dimensions.add(convertDimensionFromDTO(
                                                dimensionDtos.get(i),
                                                model,
                                                i,
                                                dto.getLevels() == null ? 0 : dto.getLevels().size()
                                ));
                        }
                        model.setDimensions(dimensions);
                }

                applyLevelsFromDto(model, dto.getLevels());

                return model;
        }

        private void applyLevelsFromDto(MaturityModel model, List<MaturityLevelDTO> levelDtos) {
                if (levelDtos == null || levelDtos.isEmpty()) {
                        if (model.getLevels() == null) {
                                model.setLevels(new ArrayList<>());
                        } else {
                                model.getLevels().clear();
                        }
                        return;
                }
                List<MaturityLevel> list = levelDtos.stream()
                                .sorted(Comparator.comparing(MaturityLevelDTO::getNumber,
                                                Comparator.nullsLast(Integer::compareTo)))
                                .map(ld -> {
                                        MaturityLevel ml = new MaturityLevel();
                                        ml.setNumber(ld.getNumber());
                                        ml.setLevelNumber(ld.getNumber());
                                        ml.setName(ld.getName());
                                        ml.setDescription(ld.getDescription());
                                        ml.setMaturityModel(model);
                                        return ml;
                                })
                                .collect(Collectors.toList());
                if (model.getLevels() == null) {
                        model.setLevels(list);
                } else {
                        model.getLevels().clear();
                        model.getLevels().addAll(list);
                }
        }

        private DimensionDTO convertDimensionToDTO(Dimension dimension) {
                DimensionDTO dto = new DimensionDTO();
                dto.setId(dimension.getDimensionId());
                dto.setName(dimension.getName());
                dto.setDescription(dimension.getDescription());
                dto.setWeight(dimension.getWeight());
                dto.setAggregationRule(resolveAggregationRule(dimension.getAggregationRule()));
                dto.setMappingRules(toMappingRuleDtos(dimension.getMappingRules()));
                dto.setGatingRules(toGatingRuleDtos(dimension.getGatingRules()));
                dto.setSortOrder(dimension.getSortOrder());

                // Convert modules
                if (dimension.getModules() != null) {
                        List<ModuleDTO> moduleDTOs = dimension.getModules().stream()
                                        .map(this::convertModuleToDTO)
                                        .collect(Collectors.toList());
                        dto.setModules(moduleDTOs);
                }

                return dto;
        }

        private Dimension convertDimensionFromDTO(
                        DimensionDTO dto,
                        MaturityModel model,
                        int sortOrder,
                        int levelCount) {
                Dimension dimension = new Dimension();
                // Generate dimensionId if not provided or empty
                String dimensionId = dto.getId() != null && !dto.getId().trim().isEmpty()
                                ? dto.getId()
                                : generateDimensionId(dto.getName());
                dimension.setDimensionId(dimensionId);
                dimension.setName(dto.getName());
                dimension.setDescription(dto.getDescription());
                dimension.setWeight(dto.getWeight() != null ? dto.getWeight() : 1.0);
                dimension.setAggregationRule(resolveAggregationRule(dto.getAggregationRule()));
                dimension.setMaturityModel(model);
                dimension.setSortOrder(sortOrder);
                dimension.setMappingRules(toMappingRuleEntities(dto.getMappingRules(), dimension, levelCount));
                dimension.setGatingRules(toGatingRuleEntities(dto.getGatingRules(), null, null, dimension));

                // Convert and set modules (list index = persisted sort order)
                if (dto.getModules() != null) {
                        List<ModuleDTO> moduleDtos = dto.getModules();
                        List<Module> modules = new ArrayList<>(moduleDtos.size());
                        for (int j = 0; j < moduleDtos.size(); j++) {
                                modules.add(convertModuleFromDTO(moduleDtos.get(j), dimension, j));
                        }
                        dimension.setModules(modules);
                }

                return dimension;
        }

        private ModuleDTO convertModuleToDTO(Module module) {
                ModuleDTO dto = new ModuleDTO();
                if (module.getDimension() != null) {
                        dto.setDimensionId(module.getDimension().getId());
                }
                dto.setCode(module.getCode());
                dto.setName(module.getName());
                dto.setDescription(module.getDescription());
                dto.setWeight(module.getWeight());
                dto.setAggregationRule(resolveAggregationRule(module.getAggregationRule()));
                dto.setGatingRules(toGatingRuleDtos(module.getGatingRules()));
                dto.setSortOrder(module.getSortOrder());

                // Convert practices
                if (module.getPractices() != null) {
                        List<PracticeDTO> practiceDTOs = module.getPractices().stream()
                                        .map(this::convertPracticeToDTO)
                                        .collect(Collectors.toList());
                        dto.setPractices(practiceDTOs);
                }

                return dto;
        }

        private Module convertModuleFromDTO(ModuleDTO dto, Dimension dimension, int sortOrder) {
                Module module = new Module();
                // Generate code if not provided or empty
                String code = dto.getCode() != null && !dto.getCode().trim().isEmpty()
                                ? dto.getCode()
                                : generateModuleCode(dto.getName());
                module.setCode(code);
                module.setName(dto.getName());
                module.setDescription(dto.getDescription());
                module.setWeight(dto.getWeight() != null ? dto.getWeight() : 1.0);
                module.setAggregationRule(resolveAggregationRule(dto.getAggregationRule()));
                module.setDimension(dimension);
                module.setSortOrder(sortOrder);
                module.setGatingRules(toGatingRuleEntities(dto.getGatingRules(), null, module, null));

                // Convert and set practices
                if (dto.getPractices() != null) {
                        List<Practice> practices = dto.getPractices().stream()
                                        .map(practiceDTO -> convertPracticeFromDTO(practiceDTO, module))
                                        .collect(Collectors.toList());
                        module.setPractices(practices);
                }

                return module;
        }

        private QuestionDTO convertQuestionToDTO(Question question) {
                QuestionDTO dto = new QuestionDTO();
                dto.setId(question.getId()); // Use numeric database ID
                dto.setCode(question.getCode());
                dto.setSortOrder(question.getSortOrder());
                if (question.getPractice() != null) {
                        dto.setPracticeId(question.getPractice().getId());
                }
                dto.setWeight(question.getWeight());
                dto.setText(question.getText());
                dto.setType(question.getType());
                dto.setHelp(question.getHelp());
                dto.setRequiresEvidence(question.getRequiresEvidence() != null ? question.getRequiresEvidence() : false);
                dto.setRequired(question.getRequired() != null ? question.getRequired() : false);
                dto.setBooleanCorrectAnswer(
                                question.getBooleanCorrectAnswer() != null ? question.getBooleanCorrectAnswer() : true);
                dto.setScalePointCount(question.getScalePointCount());
                dto.setScaleMinLabel(question.getScaleMinLabel());
                dto.setScaleMaxLabel(question.getScaleMaxLabel());
                dto.setScaleHighPointIsMaximum(question.getScaleHighPointIsMaximum());
                dto.setRangeMin(question.getRangeMin());
                dto.setRangeMax(question.getRangeMax());
                dto.setRangeHighValueIsMaximum(question.getRangeHighValueIsMaximum());
                if (question.getDependsOnQuestion() != null) {
                        dto.setDependsOnQuestionId(question.getDependsOnQuestion().getId());
                        dto.setDependsOnQuestionCode(question.getDependsOnQuestion().getCode());
                }
                if (question.getChoiceOptions() != null && !question.getChoiceOptions().isBlank()
                                && TYPE_MULTIPLE_CHOICE.equalsIgnoreCase(question.getType())) {
                        try {
                                List<QuestionChoiceDTO> choices = objectMapper.readValue(
                                                question.getChoiceOptions(),
                                                new TypeReference<List<QuestionChoiceDTO>>() {
                                                });
                                dto.setChoices(choices);
                        } catch (Exception e) {
                                dto.setChoices(new ArrayList<>());
                        }
                }
                return dto;
        }

        private PracticeDTO convertPracticeToDTO(Practice practice) {
                PracticeDTO dto = new PracticeDTO();
                dto.setId(practice.getId()); // Use numeric database ID
                dto.setCode(practice.getCode());
                if (practice.getModule() != null) {
                        dto.setModuleId(practice.getModule().getId());
                }
                dto.setName(practice.getName());
                dto.setDescription(practice.getDescription());
                dto.setWeight(practice.getWeight());
                dto.setAggregationRule(resolveAggregationRule(practice.getAggregationRule()));
                dto.setGatingRules(toGatingRuleDtos(practice.getGatingRules()));

                // Convert questions
                if (practice.getQuestions() != null) {
                        List<QuestionDTO> questionDTOs = practice.getQuestions().stream()
                                        .map(this::convertQuestionToDTO)
                                        .collect(Collectors.toList());
                        dto.setQuestions(questionDTOs);
                }

                return dto;
        }

        private Practice convertPracticeFromDTO(PracticeDTO dto, Module module) {
                Practice practice = new Practice();
                // Don't set ID - let Hibernate generate new IDs for new entities
                // This is important when creating new model versions
                practice.setCode(dto.getCode());
                practice.setName(dto.getName());
                practice.setDescription(dto.getDescription());
                practice.setWeight(dto.getWeight() != null ? dto.getWeight() : 1.0);
                practice.setAggregationRule(resolveAggregationRule(dto.getAggregationRule()));
                practice.setModule(module);
                practice.setGatingRules(toGatingRuleEntities(dto.getGatingRules(), practice, null, null));

                // Convert and set questions
                if (dto.getQuestions() != null) {
                        List<Question> questions = new ArrayList<>(dto.getQuestions().size());
                        Map<Long, Question> questionsBySourceId = new HashMap<>();
                        Map<String, Question> questionsByCode = new HashMap<>();

                        for (int questionIndex = 0; questionIndex < dto.getQuestions().size(); questionIndex++) {
                                QuestionDTO questionDTO = dto.getQuestions().get(questionIndex);
                                Question question = convertQuestionFromDTO(questionDTO, practice, questionIndex);
                                questions.add(question);
                                if (questionDTO.getId() != null) {
                                        questionsBySourceId.put(questionDTO.getId(), question);
                                }
                                questionsByCode.put(normalizeCode(questionDTO.getCode()), question);
                        }

                        for (int i = 0; i < dto.getQuestions().size(); i++) {
                                QuestionDTO questionDTO = dto.getQuestions().get(i);
                                Question question = questions.get(i);
                                Question parentById = questionDTO.getDependsOnQuestionId() == null
                                                ? null
                                                : questionsBySourceId.get(questionDTO.getDependsOnQuestionId());
                                Question parentByCode = questionDTO.getDependsOnQuestionCode() == null
                                                || questionDTO.getDependsOnQuestionCode().isBlank()
                                                                ? null
                                                                : questionsByCode.get(normalizeCode(
                                                                                questionDTO.getDependsOnQuestionCode()));

                                if (questionDTO.getDependsOnQuestionId() != null && parentById == null) {
                                        throw invalidDependency(questionDTO,
                                                        "references an ID outside its practice.");
                                }
                                if (questionDTO.getDependsOnQuestionCode() != null
                                                && !questionDTO.getDependsOnQuestionCode().isBlank()
                                                && parentByCode == null) {
                                        throw invalidDependency(questionDTO,
                                                        "references a code outside its practice.");
                                }
                                if (parentById != null && parentByCode != null && parentById != parentByCode) {
                                        throw invalidDependency(questionDTO,
                                                        "has conflicting dependency ID and code values.");
                                }

                                Question parent = parentById != null ? parentById : parentByCode;
                                if (parent != null) {
                                        if (parent == question) {
                                                throw invalidDependency(questionDTO, "cannot depend on itself.");
                                        }
                                        if (!isBooleanQuestion(parent.getType())) {
                                                throw invalidDependency(questionDTO,
                                                                "must depend on a boolean question.");
                                        }
                                        question.setDependsOnQuestion(parent);
                                }
                        }
                        practice.setQuestions(questions);
                }

                return practice;
        }

        private Question convertQuestionFromDTO(QuestionDTO dto, Practice practice, int sortOrder) {
                Question question = new Question();
                // Don't set ID - let Hibernate generate new IDs for new entities
                // This is important when creating new model versions
                question.setCode(dto.getCode());
                question.setSortOrder(sortOrder);
                question.setWeight(dto.getWeight() != null ? dto.getWeight() : 1.0);
                question.setText(dto.getText());
                question.setType(dto.getType());
                question.setHelp(dto.getHelp());
                boolean evidenceOnly = isEvidenceOnlyType(dto.getType());
                question.setRequiresEvidence(evidenceOnly
                                || (dto.getRequiresEvidence() != null && dto.getRequiresEvidence()));
                question.setRequired(dto.getRequired() != null && dto.getRequired());
                question.setBooleanCorrectAnswer(
                                dto.getBooleanCorrectAnswer() != null ? dto.getBooleanCorrectAnswer() : true);
                if (TYPE_MULTIPLE_CHOICE.equalsIgnoreCase(dto.getType())) {
                        try {
                                question.setChoiceOptions(objectMapper.writeValueAsString(dto.getChoices()));
                        } catch (Exception e) {
                                throw new IllegalOperationException(
                                                "INVALID_MULTIPLE_CHOICE",
                                                "Could not serialize multiple-choice options: " + e.getMessage());
                        }
                } else {
                        question.setChoiceOptions(null);
                }
                if (isRangeQuestion(dto.getType())) {
                        question.setRangeMin(dto.getRangeMin() != null ? dto.getRangeMin() : 0);
                        question.setRangeMax(dto.getRangeMax() != null ? dto.getRangeMax() : 100);
                        question.setRangeHighValueIsMaximum(
                                        dto.getRangeHighValueIsMaximum() == null
                                                        || dto.getRangeHighValueIsMaximum());
                } else {
                        question.setRangeMin(0);
                        question.setRangeMax(100);
                        question.setRangeHighValueIsMaximum(true);
                }
                if (TYPE_LIKERT.equalsIgnoreCase(dto.getType())) {
                        question.setScalePointCount(dto.getScalePointCount() != null
                                        ? dto.getScalePointCount() : 5);
                        question.setScaleMinLabel(normalizeOptionalText(dto.getScaleMinLabel()));
                        question.setScaleMaxLabel(normalizeOptionalText(dto.getScaleMaxLabel()));
                        question.setScaleHighPointIsMaximum(
                                        dto.getScaleHighPointIsMaximum() == null
                                                        || dto.getScaleHighPointIsMaximum());
                } else {
                        question.setScalePointCount(5);
                        question.setScaleMinLabel(null);
                        question.setScaleMaxLabel(null);
                        question.setScaleHighPointIsMaximum(true);
                }
                question.setPractice(practice);
                return question;
        }

        private MaturityModelEditorDTO toEditorDocument(MaturityModelDTO source) {
                MaturityModelEditorDTO editor = new MaturityModelEditorDTO();
                editor.setName(source.getName());
                editor.setDescription(source.getDescription());
                // Editing creates a new immutable version, so its release notes start empty.
                editor.setChangelogMarkdown("");
                editor.setAutoEvaluated(source.getAutoEvaluated());
                editor.setDomainId(source.getDomainId());
                editor.setAggregationRule(resolveAggregationRule(source.getAggregationRule()));
                editor.setLevels(source.getLevels() == null ? new ArrayList<>() : source.getLevels());

                List<MaturityModelEditorDTO.EditorDimensionDTO> dimensions = new ArrayList<>();
                for (DimensionDTO dimension : source.getDimensions() == null ? List.<DimensionDTO>of() : source.getDimensions()) {
                        var editorDimension = new MaturityModelEditorDTO.EditorDimensionDTO();
                        editorDimension.setCode(dimension.getId());
                        editorDimension.setName(dimension.getName());
                        editorDimension.setDescription(dimension.getDescription());
                        editorDimension.setWeight(dimension.getWeight());
                        editorDimension.setAggregationRule(resolveAggregationRule(dimension.getAggregationRule()));
                        editorDimension.setMappingRules(dimension.getMappingRules());
                        editorDimension.setGatingRules(dimension.getGatingRules());
                        List<MaturityModelEditorDTO.EditorModuleDTO> modules = new ArrayList<>();
                        for (ModuleDTO module : dimension.getModules() == null ? List.<ModuleDTO>of() : dimension.getModules()) {
                                var editorModule = new MaturityModelEditorDTO.EditorModuleDTO();
                                editorModule.setCode(module.getCode());
                                editorModule.setName(module.getName());
                                editorModule.setDescription(module.getDescription());
                                editorModule.setWeight(module.getWeight());
                                editorModule.setAggregationRule(resolveAggregationRule(module.getAggregationRule()));
                                editorModule.setGatingRules(module.getGatingRules());
                                List<MaturityModelEditorDTO.EditorPracticeDTO> practices = new ArrayList<>();
                                for (PracticeDTO practice : module.getPractices() == null
                                                ? List.<PracticeDTO>of() : module.getPractices()) {
                                        var editorPractice = new MaturityModelEditorDTO.EditorPracticeDTO();
                                        editorPractice.setCode(practice.getCode());
                                        editorPractice.setName(practice.getName());
                                        editorPractice.setDescription(practice.getDescription());
                                        editorPractice.setWeight(practice.getWeight());
                                        editorPractice.setAggregationRule(resolveAggregationRule(practice.getAggregationRule()));
                                        editorPractice.setGatingRules(practice.getGatingRules());
                                        List<MaturityModelEditorDTO.EditorQuestionDTO> questions = new ArrayList<>();
                                        for (QuestionDTO question : practice.getQuestions() == null
                                                        ? List.<QuestionDTO>of() : practice.getQuestions()) {
                                                var editorQuestion = new MaturityModelEditorDTO.EditorQuestionDTO();
                                                editorQuestion.setCode(question.getCode());
                                                editorQuestion.setWeight(question.getWeight());
                                                editorQuestion.setText(question.getText());
                                                editorQuestion.setType(question.getType());
                                                editorQuestion.setHelp(question.getHelp());
                                                editorQuestion.setDependsOnQuestionCode(question.getDependsOnQuestionCode());
                                                editorQuestion.setRequiresEvidence(question.getRequiresEvidence());
                                                editorQuestion.setRequired(question.getRequired());
                                                editorQuestion.setBooleanCorrectAnswer(question.getBooleanCorrectAnswer());
                                                editorQuestion.setChoices(question.getChoices());
                                                editorQuestion.setScalePointCount(question.getScalePointCount());
                                                editorQuestion.setScaleMinLabel(question.getScaleMinLabel());
                                                editorQuestion.setScaleMaxLabel(question.getScaleMaxLabel());
                                                editorQuestion.setScaleHighPointIsMaximum(
                                                                question.getScaleHighPointIsMaximum());
                                                editorQuestion.setRangeMin(question.getRangeMin());
                                                editorQuestion.setRangeMax(question.getRangeMax());
                                                editorQuestion.setRangeHighValueIsMaximum(
                                                                question.getRangeHighValueIsMaximum());
                                                questions.add(editorQuestion);
                                        }
                                        editorPractice.setQuestions(questions);
                                        practices.add(editorPractice);
                                }
                                editorModule.setPractices(practices);
                                modules.add(editorModule);
                        }
                        editorDimension.setModules(modules);
                        dimensions.add(editorDimension);
                }
                editor.setDimensions(dimensions);
                return editor;
        }

        private MaturityModelDTO fromEditorDocument(MaturityModelEditorDTO editor) {
                MaturityModelDTO dto = new MaturityModelDTO();
                dto.setName(editor.getName());
                dto.setDescription(editor.getDescription());
                dto.setChangelogMarkdown(editor.getChangelogMarkdown());
                dto.setAutoEvaluated(editor.getAutoEvaluated());
                dto.setIsActive(false);
                dto.setDomainId(editor.getDomainId());
                dto.setAggregationRule(resolveAggregationRule(editor.getAggregationRule()));
                dto.setLevels(editor.getLevels());

                List<DimensionDTO> dimensions = new ArrayList<>();
                for (var editorDimension : editor.getDimensions() == null
                                ? List.<MaturityModelEditorDTO.EditorDimensionDTO>of() : editor.getDimensions()) {
                        DimensionDTO dimension = new DimensionDTO();
                        dimension.setId(editorDimension.getCode());
                        dimension.setName(editorDimension.getName());
                        dimension.setDescription(editorDimension.getDescription());
                        dimension.setWeight(editorDimension.getWeight());
                        dimension.setAggregationRule(resolveAggregationRule(editorDimension.getAggregationRule()));
                        dimension.setMappingRules(editorDimension.getMappingRules());
                        dimension.setGatingRules(editorDimension.getGatingRules());
                        List<ModuleDTO> modules = new ArrayList<>();
                        for (var editorModule : editorDimension.getModules() == null
                                        ? List.<MaturityModelEditorDTO.EditorModuleDTO>of() : editorDimension.getModules()) {
                                ModuleDTO module = new ModuleDTO();
                                module.setCode(editorModule.getCode());
                                module.setName(editorModule.getName());
                                module.setDescription(editorModule.getDescription());
                                module.setWeight(editorModule.getWeight());
                                module.setAggregationRule(resolveAggregationRule(editorModule.getAggregationRule()));
                                module.setGatingRules(editorModule.getGatingRules());
                                List<PracticeDTO> practices = new ArrayList<>();
                                for (var editorPractice : editorModule.getPractices() == null
                                                ? List.<MaturityModelEditorDTO.EditorPracticeDTO>of()
                                                : editorModule.getPractices()) {
                                        PracticeDTO practice = new PracticeDTO();
                                        practice.setCode(editorPractice.getCode());
                                        practice.setName(editorPractice.getName());
                                        practice.setDescription(editorPractice.getDescription());
                                        practice.setWeight(editorPractice.getWeight());
                                        practice.setAggregationRule(resolveAggregationRule(editorPractice.getAggregationRule()));
                                        practice.setGatingRules(editorPractice.getGatingRules());
                                        List<QuestionDTO> questions = new ArrayList<>();
                                        for (var editorQuestion : editorPractice.getQuestions() == null
                                                        ? List.<MaturityModelEditorDTO.EditorQuestionDTO>of()
                                                        : editorPractice.getQuestions()) {
                                                QuestionDTO question = new QuestionDTO();
                                                question.setCode(editorQuestion.getCode());
                                                question.setWeight(editorQuestion.getWeight());
                                                question.setText(editorQuestion.getText());
                                                question.setType(editorQuestion.getType());
                                                question.setHelp(editorQuestion.getHelp());
                                                question.setDependsOnQuestionCode(editorQuestion.getDependsOnQuestionCode());
                                                question.setRequiresEvidence(editorQuestion.getRequiresEvidence());
                                                question.setRequired(editorQuestion.getRequired());
                                                question.setBooleanCorrectAnswer(editorQuestion.getBooleanCorrectAnswer());
                                                question.setChoices(editorQuestion.getChoices());
                                                question.setScalePointCount(editorQuestion.getScalePointCount());
                                                question.setScaleMinLabel(editorQuestion.getScaleMinLabel());
                                                question.setScaleMaxLabel(editorQuestion.getScaleMaxLabel());
                                                question.setScaleHighPointIsMaximum(
                                                                editorQuestion.getScaleHighPointIsMaximum());
                                                question.setRangeMin(editorQuestion.getRangeMin());
                                                question.setRangeMax(editorQuestion.getRangeMax());
                                                question.setRangeHighValueIsMaximum(
                                                                editorQuestion.getRangeHighValueIsMaximum());
                                                questions.add(question);
                                        }
                                        practice.setQuestions(questions);
                                        practices.add(practice);
                                }
                                module.setPractices(practices);
                                modules.add(module);
                        }
                        dimension.setModules(modules);
                        dimensions.add(dimension);
                }
                dto.setDimensions(dimensions);
                return dto;
        }

        private AggregationRule resolveAggregationRule(AggregationRule rule) {
                return rule != null ? rule : DEFAULT_AGGREGATION_RULE;
        }

        private List<MappingRuleDTO> toMappingRuleDtos(List<DimensionMappingRule> rules) {
                if (rules == null) {
                        return new ArrayList<>();
                }
                return rules.stream()
                                .sorted(Comparator.comparing(DimensionMappingRule::getLevelNumber))
                                .map(rule -> {
                                        MappingRuleDTO dto = new MappingRuleDTO();
                                        dto.setLevelNumber(rule.getLevelNumber());
                                        dto.setMinimumScore(rule.getMinimumScore());
                                        return dto;
                                })
                                .collect(Collectors.toList());
        }

        private List<DimensionMappingRule> toMappingRuleEntities(
                        List<MappingRuleDTO> suppliedRules,
                        Dimension dimension,
                        int levelCount) {
                List<MappingRuleDTO> rules = suppliedRules == null || suppliedRules.isEmpty()
                                ? defaultMappingRules(levelCount)
                                : suppliedRules;
                return rules.stream()
                                .sorted(Comparator.comparing(MappingRuleDTO::getLevelNumber))
                                .map(dto -> {
                                        DimensionMappingRule rule = new DimensionMappingRule();
                                        rule.setLevelNumber(dto.getLevelNumber());
                                        rule.setMinimumScore(dto.getMinimumScore());
                                        rule.setDimension(dimension);
                                        return rule;
                                })
                                .collect(Collectors.toList());
        }

        private List<GatingRuleDTO> toGatingRuleDtos(List<GatingRule> rules) {
                if (rules == null) {
                        return new ArrayList<>();
                }
                return rules.stream()
                                .sorted(Comparator.comparing(GatingRule::getOrder))
                                .map(rule -> {
                                        GatingRuleDTO dto = new GatingRuleDTO();
                                        dto.setOrder(rule.getOrder());
                                        dto.setSelection(rule.getSelection());
                                        dto.setChildCode(rule.getChildCode());
                                        dto.setOperator(rule.getOperator());
                                        dto.setThreshold(rule.getThreshold());
                                        dto.setOperation(rule.getOperation());
                                        dto.setValue(rule.getValue());
                                        return dto;
                                })
                                .collect(Collectors.toList());
        }

        private List<GatingRule> toGatingRuleEntities(
                        List<GatingRuleDTO> suppliedRules,
                        Practice practice,
                        Module module,
                        Dimension dimension) {
                if (suppliedRules == null) {
                        return new ArrayList<>();
                }
                return suppliedRules.stream()
                                .sorted(Comparator.comparing(GatingRuleDTO::getOrder))
                                .map(dto -> {
                                        GatingRule rule = new GatingRule();
                                        rule.setOrder(dto.getOrder());
                                        rule.setSelection(dto.getSelection());
                                        rule.setChildCode(dto.getSelection() == GatingSelection.SPECIFIC_CHILD
                                                        ? dto.getChildCode().trim()
                                                        : null);
                                        rule.setOperator(dto.getOperator());
                                        rule.setThreshold(dto.getThreshold());
                                        rule.setOperation(dto.getOperation());
                                        rule.setValue(dto.getValue());
                                        rule.setPractice(practice);
                                        rule.setModule(module);
                                        rule.setDimension(dimension);
                                        return rule;
                                })
                                .collect(Collectors.toList());
        }

        private List<MappingRuleDTO> defaultMappingRules(int levelCount) {
                if (levelCount <= 0) {
                        return new ArrayList<>();
                }
                List<MappingRuleDTO> rules = new ArrayList<>(levelCount);
                for (int index = 0; index < levelCount; index++) {
                        MappingRuleDTO rule = new MappingRuleDTO();
                        rule.setLevelNumber(index + 1);
                        rule.setMinimumScore(index == 0 ? 0.0 : (double) index / levelCount);
                        rules.add(rule);
                }
                return rules;
        }

        private void prepareAndValidatePublicCodes(MaturityModelDTO dto) {
                validatePublicCodes(dto, true);
        }

        private void validatePersistedPublicCodes(MaturityModelDTO dto) {
                validatePublicCodes(dto, false);
        }

        private void validatePublicCodes(MaturityModelDTO dto, boolean generateMissingCodes) {
                if (dto.getDimensions() == null || dto.getDimensions().isEmpty()) {
                        throw new IllegalOperationException("STRUCTURE_REQUIRED",
                                        "A maturity model must contain at least one dimension.");
                }

                Set<String> dimensionCodes = new HashSet<>();
                for (int dimensionIndex = 0; dimensionIndex < dto.getDimensions().size(); dimensionIndex++) {
                        DimensionDTO dimension = dto.getDimensions().get(dimensionIndex);
                        String dimensionCode = validateCode(
                                        dimension.getId(),
                                        "D",
                                        dimensionIndex + 1,
                                        dimension.getName(),
                                        dimensionCodes,
                                        "maturity model",
                                        generateMissingCodes);
                        if (generateMissingCodes) {
                                dimension.setId(dimensionCode);
                        }
                        if (dimension.getModules() == null || dimension.getModules().isEmpty()) {
                                throw new IllegalOperationException("STRUCTURE_REQUIRED",
                                                "Every dimension must contain at least one module.");
                        }

                        Set<String> moduleCodes = new HashSet<>();
                        for (int moduleIndex = 0; moduleIndex < dimension.getModules().size(); moduleIndex++) {
                                ModuleDTO module = dimension.getModules().get(moduleIndex);
                                String moduleCode = validateCode(
                                                module.getCode(),
                                                "M",
                                                moduleIndex + 1,
                                                module.getName(),
                                                moduleCodes,
                                                "dimension '" + dimensionCode + "'",
                                                generateMissingCodes);
                                if (generateMissingCodes) {
                                        module.setCode(moduleCode);
                                }
                                if (module.getPractices() == null || module.getPractices().isEmpty()) {
                                        throw new IllegalOperationException("STRUCTURE_REQUIRED",
                                                        "Every module must contain at least one practice.");
                                }

                                Set<String> practiceCodes = new HashSet<>();
                                for (int practiceIndex = 0;
                                                practiceIndex < module.getPractices().size();
                                                practiceIndex++) {
                                        PracticeDTO practice = module.getPractices().get(practiceIndex);
                                        String practiceCode = validateCode(
                                                        practice.getCode(),
                                                        "P",
                                                        practiceIndex + 1,
                                                        practice.getName(),
                                                        practiceCodes,
                                                        "module '" + moduleCode + "'",
                                                        generateMissingCodes);
                                        if (generateMissingCodes) {
                                                practice.setCode(practiceCode);
                                        }
                                        if (practice.getQuestions() == null || practice.getQuestions().isEmpty()) {
                                                throw new IllegalOperationException("STRUCTURE_REQUIRED",
                                                                "Every practice must contain at least one question.");
                                        }

                                        Set<String> questionCodes = new HashSet<>();
                                        for (int questionIndex = 0;
                                                        questionIndex < practice.getQuestions().size();
                                                        questionIndex++) {
                                                QuestionDTO question = practice.getQuestions().get(questionIndex);
                                                String questionCode = validateCode(
                                                                question.getCode(),
                                                                "Q",
                                                                questionIndex + 1,
                                                                question.getText(),
                                                                questionCodes,
                                                                "practice '" + practiceCode + "'",
                                                                generateMissingCodes);
                                                if (generateMissingCodes) {
                                                        question.setCode(questionCode);
                                                }
                                        }
                                        validatePracticeDependencies(practice, generateMissingCodes);
                                }
                        }
                }
        }

        private String validateCode(
                        String supplied,
                        String prefix,
                        int ordinal,
                        String name,
                        Set<String> usedCodes,
                        String scope,
                        boolean generateMissingCode) {
                if ((supplied == null || supplied.isBlank()) && !generateMissingCode) {
                        throw new IllegalOperationException(
                                        "INVALID_PERSISTED_PUBLIC_CODE",
                                        "A persisted " + prefix + " item is missing its public code.");
                }
                String code = supplied == null || supplied.isBlank()
                                ? prefix + ordinal + "_" + initials(name)
                                : supplied.trim();
                if (!code.matches("[A-Za-z][A-Za-z0-9_-]{0,63}")) {
                        throw new IllegalOperationException("INVALID_PUBLIC_CODE",
                                        "Item code '" + code
                                                        + "' must start with a letter and contain up to 64 letters, numbers, underscores, or hyphens.");
                }
                String normalized = normalizeCode(code);
                if (!usedCodes.add(normalized)) {
                        throw new IllegalOperationException("DUPLICATE_PUBLIC_CODE",
                                        "Item code '" + code + "' is used more than once in the same " + scope + ".");
                }
                return code;
        }

        private String initials(String value) {
                if (value == null || value.isBlank()) {
                        return "ITEM";
                }
                String initials = java.util.Arrays.stream(value.trim().split("[^A-Za-z0-9]+"))
                                .filter(part -> !part.isBlank())
                                .limit(5)
                                .map(part -> part.substring(0, 1).toUpperCase(Locale.ROOT))
                                .collect(Collectors.joining());
                return initials.isBlank() ? "ITEM" : initials;
        }

        private static String normalizeCode(String code) {
                return code.trim().toLowerCase(Locale.ROOT);
        }

        private void validatePracticeDependencies(PracticeDTO practice, boolean normalizeForWrite) {
                Map<String, QuestionDTO> questionsByCode = new LinkedHashMap<>();
                Map<Long, QuestionDTO> questionsById = new HashMap<>();
                for (QuestionDTO question : practice.getQuestions()) {
                        questionsByCode.put(normalizeCode(question.getCode()), question);
                        if (question.getId() != null) {
                                questionsById.put(question.getId(), question);
                        }
                }

                Map<String, String> dependencies = new LinkedHashMap<>();
                for (QuestionDTO question : practice.getQuestions()) {
                        Long parentId = question.getDependsOnQuestionId();
                        String parentCode = question.getDependsOnQuestionCode();
                        if (parentId == null && (parentCode == null || parentCode.isBlank())) {
                                continue;
                        }

                        QuestionDTO parentById = parentId == null ? null : questionsById.get(parentId);
                        QuestionDTO parentByCode = parentCode == null || parentCode.isBlank()
                                        ? null
                                        : questionsByCode.get(normalizeCode(parentCode));
                        if (parentId != null && parentById == null) {
                                throw invalidDependency(question, "references an ID outside its practice.");
                        }
                        if (parentCode != null && !parentCode.isBlank() && parentByCode == null) {
                                throw invalidDependency(question, "references a code outside its practice.");
                        }
                        if (parentById != null && parentByCode != null && parentById != parentByCode) {
                                throw invalidDependency(question, "has conflicting dependency ID and code values.");
                        }

                        QuestionDTO parent = parentById != null ? parentById : parentByCode;
                        if (parent == question) {
                                throw invalidDependency(question, "cannot depend on itself.");
                        }
                        if (!isBooleanQuestion(parent.getType())) {
                                throw invalidDependency(question, "must depend on a boolean question.");
                        }
                        if (normalizeForWrite) {
                                question.setDependsOnQuestionCode(parent.getCode());
                        }
                        dependencies.put(
                                        normalizeCode(question.getCode()),
                                        normalizeCode(parent.getCode()));
                }

                for (String questionCode : questionsByCode.keySet()) {
                        assertDependencyAcyclic(questionCode, dependencies, new HashSet<>(), new HashSet<>());
                }
        }

        private void assertDependencyAcyclic(
                        String questionCode,
                        Map<String, String> dependencies,
                        Set<String> visiting,
                        Set<String> visited) {
                if (visited.contains(questionCode)) {
                        return;
                }
                if (!visiting.add(questionCode)) {
                        throw new IllegalOperationException("CYCLIC_QUESTION_DEPENDENCY",
                                        "Question dependencies cannot contain cycles.");
                }
                String parentCode = dependencies.get(questionCode);
                if (parentCode != null) {
                        assertDependencyAcyclic(parentCode, dependencies, visiting, visited);
                }
                visiting.remove(questionCode);
                visited.add(questionCode);
        }

        private boolean isBooleanQuestion(String type) {
                return "boolean".equalsIgnoreCase(type);
        }

        private boolean isRangeQuestion(String type) {
                return TYPE_NUMERIC.equalsIgnoreCase(type) || TYPE_PERCENTAGE.equalsIgnoreCase(type);
        }

        private IllegalOperationException invalidDependency(QuestionDTO question, String detail) {
                return new IllegalOperationException(
                                "INVALID_QUESTION_DEPENDENCY",
                                "Question '" + question.getCode() + "' " + detail);
        }

        private void validateMaturityModelLevels(MaturityModelDTO dto) {
                List<MaturityLevelDTO> levels = dto.getLevels();
                if (levels == null || levels.isEmpty()) {
                        throw new IllegalOperationException(
                                        "LEVELS_REQUIRED",
                                        "Maturity model must define at least 2 levels (names for each step of the scale).");
                }
                if (levels.size() < MIN_MATURITY_LEVELS || levels.size() > MAX_MATURITY_LEVELS) {
                        throw new IllegalOperationException(
                                        "INVALID_LEVELS",
                                        "Maturity model must have between " + MIN_MATURITY_LEVELS + " and "
                                                        + MAX_MATURITY_LEVELS + " levels.");
                }
                List<MaturityLevelDTO> sorted = levels.stream()
                                .sorted(Comparator.comparing(MaturityLevelDTO::getNumber,
                                                Comparator.nullsLast(Integer::compareTo)))
                                .collect(Collectors.toList());
                for (int i = 0; i < sorted.size(); i++) {
                        MaturityLevelDTO l = sorted.get(i);
                        int expected = i + 1;
                        if (l.getNumber() == null || !l.getNumber().equals(expected)) {
                                throw new IllegalOperationException(
                                                "INVALID_LEVELS",
                                                "Level numbers must be contiguous from 1 to N with no gaps or duplicates.");
                        }
                        if (l.getName() == null || l.getName().isBlank()) {
                                throw new IllegalOperationException(
                                                "INVALID_LEVELS",
                                                "Each maturity level must have a non-empty name.");
                        }
                }
        }

        private void validateDimensionMappingRules(MaturityModelDTO dto) {
                int levelCount = dto.getLevels() == null ? 0 : dto.getLevels().size();
                if (dto.getDimensions() == null) {
                        return;
                }
                for (DimensionDTO dimension : dto.getDimensions()) {
                        List<MappingRuleDTO> rules = dimension.getMappingRules();
                        if (rules == null || rules.isEmpty()) {
                                continue; // Legacy/API clients receive equal-width defaults.
                        }
                        if (rules.stream().anyMatch(rule -> rule == null)) {
                                throw invalidMappingRules(dimension,
                                                "define a valid threshold for every maturity level");
                        }
                        List<MappingRuleDTO> sorted = rules.stream()
                                        .sorted(Comparator.comparing(MappingRuleDTO::getLevelNumber,
                                                        Comparator.nullsLast(Integer::compareTo)))
                                        .toList();
                        if (sorted.size() != levelCount) {
                                throw invalidMappingRules(dimension,
                                                "define exactly one threshold for every maturity level");
                        }
                        double previous = -1.0;
                        for (int index = 0; index < sorted.size(); index++) {
                                MappingRuleDTO rule = sorted.get(index);
                                int expectedLevel = index + 1;
                                if (rule.getLevelNumber() == null || rule.getLevelNumber() != expectedLevel) {
                                        throw invalidMappingRules(dimension,
                                                        "use contiguous level numbers from 1 to " + levelCount);
                                }
                                Double minimum = rule.getMinimumScore();
                                if (minimum == null || !Double.isFinite(minimum)
                                                || minimum < 0.0 || minimum > 1.0) {
                                        throw invalidMappingRules(dimension,
                                                        "use normalized thresholds between 0 and 1");
                                }
                                if (index == 0 && Double.compare(minimum, 0.0) != 0) {
                                        throw invalidMappingRules(dimension,
                                                        "start level 1 at a normalized score of 0");
                                }
                                if (index > 0 && minimum <= previous) {
                                        throw invalidMappingRules(dimension,
                                                        "use strictly increasing thresholds");
                                }
                                previous = minimum;
                        }
                }
        }

        private IllegalOperationException invalidMappingRules(DimensionDTO dimension, String detail) {
                String code = dimension.getId() == null || dimension.getId().isBlank()
                                ? dimension.getName()
                                : dimension.getId();
                return new IllegalOperationException(
                                "INVALID_MAPPING_RULES",
                                "Mapping rules for dimension '" + code + "' must " + detail + "."
                );
        }

        private void validateGatingRules(MaturityModelDTO dto) {
                if (dto.getDimensions() == null) {
                        return;
                }
                for (DimensionDTO dimension : dto.getDimensions()) {
                        validateGatingRuleList(
                                        dimension.getGatingRules(),
                                        codes(dimension.getModules(), ModuleDTO::getCode),
                                        "dimension '" + dimension.getId() + "'");
                        if (dimension.getModules() == null) {
                                continue;
                        }
                        for (ModuleDTO module : dimension.getModules()) {
                                validateGatingRuleList(
                                                module.getGatingRules(),
                                                codes(module.getPractices(), PracticeDTO::getCode),
                                                "module '" + module.getCode() + "'");
                                if (module.getPractices() == null) {
                                        continue;
                                }
                                for (PracticeDTO practice : module.getPractices()) {
                                        validateGatingRuleList(
                                                        practice.getGatingRules(),
                                                        codes(practice.getQuestions(), QuestionDTO::getCode),
                                                        "practice '" + practice.getCode() + "'");
                                }
                        }
                }
        }

        private <T> Set<String> codes(List<T> children, java.util.function.Function<T, String> code) {
                if (children == null) {
                        return Set.of();
                }
                return children.stream()
                                .map(code)
                                .filter(java.util.Objects::nonNull)
                                .map(value -> value.toLowerCase(Locale.ROOT))
                                .collect(Collectors.toSet());
        }

        private void validateGatingRuleList(
                        List<GatingRuleDTO> rules,
                        Set<String> immediateChildCodes,
                        String owner) {
                if (rules == null || rules.isEmpty()) {
                        return;
                }
                if (rules.stream().anyMatch(java.util.Objects::isNull)) {
                        throw invalidGatingRules(owner, "contain only complete rule objects");
                }
                List<GatingRuleDTO> sorted = rules.stream()
                                .sorted(Comparator.comparing(
                                                GatingRuleDTO::getOrder,
                                                Comparator.nullsLast(Integer::compareTo)))
                                .toList();
                for (int index = 0; index < sorted.size(); index++) {
                        GatingRuleDTO rule = sorted.get(index);
                        if (rule.getOrder() == null || rule.getOrder() != index) {
                                throw invalidGatingRules(owner, "use contiguous order values starting at 0");
                        }
                        if (rule.getSelection() == null || rule.getOperator() == null || rule.getOperation() == null) {
                                throw invalidGatingRules(owner, "define a selection, comparison, and score operation");
                        }
                        validateGatingOperand(rule.getThreshold(), "threshold", owner);
                        validateGatingOperand(rule.getValue(), "operation value", owner);
                        String childCode = rule.getChildCode();
                        if (rule.getSelection() == GatingSelection.SPECIFIC_CHILD) {
                                if (childCode == null || childCode.isBlank()
                                                || !immediateChildCodes.contains(childCode.toLowerCase(Locale.ROOT))) {
                                        throw invalidGatingRules(owner,
                                                        "reference an immediate child for every specificChild rule");
                                }
                        } else if (childCode != null && !childCode.isBlank()) {
                                throw invalidGatingRules(owner,
                                                "omit childCode unless selection is specificChild");
                        }
                }
        }

        private void validateGatingOperand(java.math.BigDecimal value, String label, String owner) {
                if (value == null || value.compareTo(java.math.BigDecimal.ZERO) < 0
                                || value.compareTo(java.math.BigDecimal.ONE) > 0
                                || Math.max(0, value.stripTrailingZeros().scale()) > 2) {
                        throw invalidGatingRules(owner, "use a " + label + " between 0 and 1 with at most two decimals");
                }
        }

        private IllegalOperationException invalidGatingRules(String owner, String detail) {
                return new IllegalOperationException(
                                "INVALID_GATING_RULES",
                                "Gating rules for " + owner + " must " + detail + ".");
        }

        private void validateTextLengths(MaturityModelDTO dto) {
                TextLimits.requireAtMost(dto.getName(), TextLimits.NAME, "Model name");
                TextLimits.requireAtMost(dto.getDescription(), TextLimits.DESCRIPTION, "Model description");
                TextLimits.requireAtMost(dto.getChangelogMarkdown(), TextLimits.CHANGELOG, "Version changelog");
                if (dto.getLevels() != null) for (MaturityLevelDTO level : dto.getLevels()) {
                        TextLimits.requireAtMost(level.getName(), TextLimits.NAME, "Maturity level name");
                        TextLimits.requireAtMost(level.getDescription(), TextLimits.DESCRIPTION, "Maturity level description");
                }
                if (dto.getDimensions() == null) return;
                for (DimensionDTO dimension : dto.getDimensions()) {
                        TextLimits.requireAtMost(dimension.getId(), TextLimits.CODE, "Dimension code");
                        TextLimits.requireAtMost(dimension.getName(), TextLimits.NAME, "Dimension name");
                        TextLimits.requireAtMost(dimension.getDescription(), TextLimits.DESCRIPTION, "Dimension description");
                        if (dimension.getModules() == null) continue;
                        for (ModuleDTO module : dimension.getModules()) {
                                TextLimits.requireAtMost(module.getCode(), TextLimits.CODE, "Module code");
                                TextLimits.requireAtMost(module.getName(), TextLimits.NAME, "Module name");
                                TextLimits.requireAtMost(module.getDescription(), TextLimits.DESCRIPTION, "Module description");
                                if (module.getPractices() == null) continue;
                                for (PracticeDTO practice : module.getPractices()) {
                                        TextLimits.requireAtMost(practice.getCode(), TextLimits.CODE, "Practice code");
                                        TextLimits.requireAtMost(practice.getName(), TextLimits.NAME, "Practice name");
                                        TextLimits.requireAtMost(practice.getDescription(), TextLimits.DESCRIPTION, "Practice description");
                                        if (practice.getQuestions() == null) continue;
                                        for (QuestionDTO question : practice.getQuestions()) {
                                                TextLimits.requireAtMost(question.getCode(), TextLimits.CODE, "Question code");
                                                TextLimits.requireAtMost(question.getText(), TextLimits.QUESTION_TEXT, "Question text");
                                                TextLimits.requireAtMost(question.getHelp(), TextLimits.SHORT_GUIDANCE, "Question guidance");
                                                if (question.getChoices() != null) for (QuestionChoiceDTO choice : question.getChoices()) {
                                                        TextLimits.requireAtMost(choice.getLabel(), TextLimits.NAME, "Answer option label");
                                                }
                                        }
                                }
                        }
                }
        }

        private void validateMaturityModelQuestions(MaturityModelDTO dto) {
                if (dto.getDimensions() == null) {
                        return;
                }
                int maxLevel = dto.getLevels().size();
                for (var dimensionDTO : dto.getDimensions()) {
                        if (dimensionDTO.getModules() == null) {
                                continue;
                        }
                        for (var moduleDTO : dimensionDTO.getModules()) {
                                if (moduleDTO.getPractices() == null) {
                                        continue;
                                }
                                for (var practiceDTO : moduleDTO.getPractices()) {
                                        if (practiceDTO.getQuestions() == null) {
                                                continue;
                                        }
                                        for (QuestionDTO questionDTO : practiceDTO.getQuestions()) {
                                                validateQuestionType(questionDTO);
                                                if (TYPE_MULTIPLE_CHOICE.equalsIgnoreCase(questionDTO.getType())) {
                                                        validateMultipleChoiceQuestion(questionDTO);
                                                }
                                                if (TYPE_LIKERT.equalsIgnoreCase(questionDTO.getType())) {
                                                        validateLikertQuestion(questionDTO);
                                                }
                                                if (isRangeQuestion(questionDTO.getType())) {
                                                        validateRangeQuestion(questionDTO);
                                                }
                                        }
                                }
                        }
                }
        }

        private void validateQuestionType(QuestionDTO questionDTO) {
                String type = questionDTO.getType() == null
                                ? ""
                                : questionDTO.getType().trim().toLowerCase(Locale.ROOT);
                if (!ALLOWED_QUESTION_TYPES.contains(type)) {
                        throw new IllegalOperationException(
                                        "INVALID_QUESTION_TYPE",
                                        "Question '" + questionDTO.getCode()
                                                        + "' must use one of: boolean, likert, multiple_choice, open_answer, numeric, percentage, evidence.");
                }
                questionDTO.setType(type);
                if (isEvidenceOnlyType(type)) {
                        questionDTO.setRequiresEvidence(true);
                }
        }

        private boolean isEvidenceOnlyType(String type) {
                return TYPE_EVIDENCE.equalsIgnoreCase(type);
        }

        private void validateRangeQuestion(QuestionDTO questionDTO) {
                Integer minimum = questionDTO.getRangeMin();
                Integer maximum = questionDTO.getRangeMax();
                if (minimum == null || maximum == null || minimum >= maximum) {
                        throw new IllegalOperationException(
                                        "INVALID_QUESTION_RANGE",
                                        "Numeric and percentage questions require integer bounds with minimum below maximum.");
                }
        }

        private void validateLikertQuestion(QuestionDTO questionDTO) {
                Integer pointCount = questionDTO.getScalePointCount();
                if (pointCount != null && (pointCount < 2 || pointCount > 100)) {
                        throw new IllegalOperationException(
                                        "INVALID_LIKERT_SCALE",
                                        "Scale point count must be between 2 and 100.");
                }
                TextLimits.requireAtMost(questionDTO.getScaleMinLabel(), 50, "Scale minimum label");
                TextLimits.requireAtMost(questionDTO.getScaleMaxLabel(), 50, "Scale maximum label");
        }

        private void validateMultipleChoiceQuestion(QuestionDTO questionDTO) {
                List<QuestionChoiceDTO> choices = questionDTO.getChoices();
                if (choices == null || choices.isEmpty()) {
                        throw new IllegalOperationException(
                                        "INVALID_MULTIPLE_CHOICE",
                                        "Multiple-choice questions require at least one option with a label and normalized score.");
                }
                if (choices.size() > 100) {
                        throw new IllegalOperationException(
                                        "INVALID_MULTIPLE_CHOICE",
                                        "Multiple-choice questions support at most 100 options.");
                }
                for (int i = 0; i < choices.size(); i++) {
                        QuestionChoiceDTO c = choices.get(i);
                        if (c == null) {
                                throw new IllegalOperationException(
                                                "INVALID_MULTIPLE_CHOICE",
                                                "Multiple-choice option " + (i + 1) + " is invalid.");
                        }
                        if (c.getLabel() == null || c.getLabel().trim().isEmpty()) {
                                throw new IllegalOperationException(
                                                "INVALID_MULTIPLE_CHOICE",
                                                "Each multiple-choice option must have a non-empty label.");
                        }
                        if (c.getScore() == null || !Double.isFinite(c.getScore())
                                        || c.getScore() < 0.0 || c.getScore() > 1.0) {
                                throw new IllegalOperationException(
                                                "INVALID_MULTIPLE_CHOICE",
                                                "Each multiple-choice option must have a score between 0 and 1.");
                        }
                }
        }

        /**
         * Generates a dimension ID based on the dimension name.
         * Creates a lowercase, hyphen-separated version of the name.
         */
        private String generateDimensionId(String dimensionName) {
                if (dimensionName == null || dimensionName.trim().isEmpty()) {
                        return "dimension_" + System.currentTimeMillis();
                }
                return dimensionName.toLowerCase()
                                .replaceAll("[^a-z0-9\\s]", "")
                                .replaceAll("\\s+", "_")
                                .replaceAll("_+", "_");
        }

        /**
         * Generates a module code based on the module name.
         * Creates a lowercase, hyphen-separated version of the name.
         */
        private String generateModuleCode(String moduleName) {
                if (moduleName == null || moduleName.trim().isEmpty()) {
                        return "module_" + System.currentTimeMillis();
                }
                return moduleName.toLowerCase()
                                .replaceAll("[^a-z0-9\\s]", "")
                                .replaceAll("\\s+", "_")
                                .replaceAll("_+", "_");
        }

        @Transactional
        public MaturityModelDTO activateMaturityModel(Long id) {
                MaturityModel modelToActivate = maturityModelRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Maturity model not found with id: " + id));

                Long lineageRoot = resolveLineageRoot(modelToActivate);
                List<MaturityModel> activeOtherVersions = maturityModelRepository
                                .findByBaseModelIdOrderByVersionAsc(lineageRoot).stream()
                                .filter(model -> !model.getId().equals(modelToActivate.getId()))
                                .filter(model -> Boolean.TRUE.equals(model.getIsActive()))
                                .collect(Collectors.toList());
                for (MaturityModel activeVersion : activeOtherVersions) {
                        activeVersion.setIsActive(false);
                }
                if (!activeOtherVersions.isEmpty()) {
                        // Flush the old active version before enabling the selected version. This
                        // ordering is required by the database's one-active-version-per-lineage
                        // uniqueness rule.
                        maturityModelRepository.saveAllAndFlush(activeOtherVersions);
                }

                modelToActivate.setIsActive(true);
                MaturityModel activatedModel = maturityModelRepository.saveAndFlush(modelToActivate);
                return convertToDTO(activatedModel);
        }

        @Transactional
        public MaturityModelDTO deactivateMaturityModel(Long id) {
                MaturityModel model = maturityModelRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Maturity model not found with id: " + id));
                model.setIsActive(false);
                MaturityModel saved = maturityModelRepository.save(model);
                return convertToDTO(saved);
        }

        @Transactional
        public MaturityModelDTO updateMaturityModel(Long id, MaturityModelDTO maturityModelDTO) {
                return updateMaturityModel(id, maturityModelDTO, null);
        }

        @Transactional
        public MaturityModelDTO updateMaturityModel(
                        Long id,
                        MaturityModelDTO maturityModelDTO,
                        User creator) {
                prepareAndValidatePublicCodes(maturityModelDTO);
                validateTextLengths(maturityModelDTO);
                validateMaturityModelLevels(maturityModelDTO);
                validateDimensionMappingRules(maturityModelDTO);
                validateGatingRules(maturityModelDTO);
                validateMaturityModelQuestions(maturityModelDTO);

                MaturityModel existingModel = maturityModelRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Maturity model not found"));

                int assessmentUsageCount = assessmentRepository.findByMaturityModelId(id).size();
                Long lineageRoot = resolveLineageRoot(existingModel);
                int nextVersion = resolveNextVersion(existingModel, lineageRoot);

                MaturityModel newModel = convertFromDTO(maturityModelDTO);
                newModel.setCreatedBy(creator);
                String resolvedName = maturityModelDTO.getName() != null
                                && !maturityModelDTO.getName().isBlank()
                                ? maturityModelDTO.getName().trim()
                                : existingModel.getName();
                newModel.setName(resolvedName);
                newModel.setVersion(nextVersion);
                newModel.setIsActive(false);

                if (newModel.getDomain() == null && existingModel.getDomain() != null) {
                        newModel.setDomain(existingModel.getDomain());
                }

                newModel.setBaseModelId(lineageRoot);

                MaturityModel savedModel = maturityModelRepository.saveAndFlush(newModel);
                MaturityModelDTO response = convertToDTO(savedModel);
                response.setUpdateMode("VERSIONED");
                response.setAssessmentUsageCount(assessmentUsageCount);
                return response;
        }

        private String resolveCreatorName(User creator) {
                if (creator == null) {
                        return null;
                }
                if (creator.getName() != null && !creator.getName().isBlank()) {
                        return creator.getName().trim();
                }
                return creator.getEmail();
        }

        private String normalizeOptionalText(String value) {
                if (value == null) {
                        return null;
                }
                String trimmed = value.trim();
                return trimmed.isEmpty() ? null : trimmed;
        }

        private Long resolveLineageRoot(MaturityModel model) {
                Long baseModelId = model.getBaseModelId();
                if (baseModelId == null) {
                        return model.getId();
                }
                return baseModelId;
        }

        private int resolveNextVersion(MaturityModel existingModel, Long lineageRoot) {
                List<MaturityModel> lineage = maturityModelRepository.findByBaseModelIdOrderByVersionAsc(lineageRoot);
                if (lineage.isEmpty()) {
                        int current = existingModel.getVersion() != null ? existingModel.getVersion() : 1;
                        return current + 1;
                }
                return lineage.stream()
                                .map(MaturityModel::getVersion)
                                .filter(v -> v != null)
                                .max(Integer::compareTo)
                                .orElse(0) + 1;
        }

}
