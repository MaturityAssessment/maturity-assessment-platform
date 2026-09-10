package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.maturity_models.dto.CsvMaturityModelRow;
import com.master_thesis.maturity_assessment.maturity_models.dto.CsvUploadResponse;
import com.master_thesis.maturity_assessment.maturity_models.dto.DimensionDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityLevelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.ModuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.PracticeDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionChoiceDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionRangeDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CsvParsingService {

    private final ObjectMapper objectMapper;

    private static final Set<String> ALLOWED_QUESTION_TYPES = Set.of(
            "boolean",
            "likert",
            "open_answer",
            "multiple_choice",
            "numeric",
            "percentage",
            "evidence"
    );

    private static final int MIN_MATURITY_LEVELS = 2;
    private static final int MAX_MATURITY_LEVELS = 12;

    /**
     * Validates denormalized rows (e.g. from Excel Questions join) and builds a {@link MaturityModelDTO}.
     *
     * @param rows                  one row per question, fully denormalized
     * @param rowNumbersOneBased    optional Excel row number per index for error messages; if null, uses index + 2
     */
    public CsvUploadResponse parseDenormalizedRows(List<CsvMaturityModelRow> rows, int[] rowNumbersOneBased) {
        try {
            if (rows == null || rows.isEmpty()) {
                return new CsvUploadResponse(false, "Validation failed", null, "Workbook has no question rows");
            }

            List<String> rowErrors = new ArrayList<>();

            List<MaturityLevelDTO> resolvedLevels = resolveModelLevelsFromRows(rows, rowErrors, rowNumbersOneBased);
            if (!rowErrors.isEmpty()) {
                return new CsvUploadResponse(false, "Validation failed", null, String.join("; ", rowErrors));
            }

            for (int i = 0; i < rows.size(); i++) {
                validateRow(rows.get(i), rowNumberFor(i, rowNumbersOneBased), rowErrors, resolvedLevels.size());
            }

            if (!rowErrors.isEmpty()) {
                return new CsvUploadResponse(false, "Validation failed", null, String.join("; ", rowErrors));
            }

            MaturityModelDTO maturityModelDTO = convertToMaturityModelDTO(rows, rowErrors, resolvedLevels, rowNumbersOneBased);
            if (!rowErrors.isEmpty()) {
                return new CsvUploadResponse(false, "Validation failed", null, String.join("; ", rowErrors));
            }

            return new CsvUploadResponse(true, "Excel file parsed successfully", maturityModelDTO, null);
        } catch (Exception e) {
            return new CsvUploadResponse(false, "Failed to parse Excel file", null, e.getMessage());
        }
    }

    private static int rowNumberFor(int index, int[] rowNumbersOneBased) {
        if (rowNumbersOneBased != null && index < rowNumbersOneBased.length) {
            return rowNumbersOneBased[index];
        }
        return index + 2;
    }

    private List<MaturityLevelDTO> resolveModelLevelsFromRows(
            List<CsvMaturityModelRow> rows,
            List<String> errors,
            int[] rowNumbersOneBased
    ) {
        String canonical = null;
        for (int i = 0; i < rows.size(); i++) {
            String raw = rows.get(i).getModelLevels();
            if (isBlank(raw)) {
                continue;
            }
            String trimmed = raw.trim();
            if (canonical == null) {
                canonical = trimmed;
            } else if (!canonical.equals(trimmed)) {
                errors.add("Row " + rowNumberFor(i, rowNumbersOneBased) + ": modelLevels must match on every row where it is set");
                return defaultLegacyLevelDtos();
            }
        }
        if (canonical == null) {
            return defaultLegacyLevelDtos();
        }
        try {
            List<MaturityLevelDTO> parsed = objectMapper.readValue(canonical, new TypeReference<List<MaturityLevelDTO>>() {
            });
            if (parsed == null) {
                errors.add("modelLevels must be a non-null JSON array");
                return defaultLegacyLevelDtos();
            }
            validateResolvedLevels(parsed, errors);
            if (!errors.isEmpty()) {
                return defaultLegacyLevelDtos();
            }
            return parsed;
        } catch (Exception e) {
            errors.add("modelLevels must be valid JSON array of {number,name,description?}: " + e.getMessage());
            return defaultLegacyLevelDtos();
        }
    }

    private void validateResolvedLevels(List<MaturityLevelDTO> levels, List<String> errors) {
        if (levels == null || levels.isEmpty()) {
            errors.add("modelLevels must define at least " + MIN_MATURITY_LEVELS + " levels");
            return;
        }
        if (levels.size() < MIN_MATURITY_LEVELS || levels.size() > MAX_MATURITY_LEVELS) {
            errors.add("modelLevels must have between " + MIN_MATURITY_LEVELS + " and " + MAX_MATURITY_LEVELS + " entries");
            return;
        }
        List<MaturityLevelDTO> sorted = levels.stream()
                .sorted(Comparator.comparing(MaturityLevelDTO::getNumber, Comparator.nullsLast(Integer::compareTo)))
                .collect(Collectors.toList());
        for (int i = 0; i < sorted.size(); i++) {
            MaturityLevelDTO l = sorted.get(i);
            int expected = i + 1;
            if (l.getNumber() == null || !l.getNumber().equals(expected)) {
                errors.add("modelLevels: level numbers must be contiguous from 1 to N");
                return;
            }
            if (l.getName() == null || l.getName().isBlank()) {
                errors.add("modelLevels: each level needs a non-empty name");
                return;
            }
        }
    }

    private List<MaturityLevelDTO> defaultLegacyLevelDtos() {
        String[] names = {"Not Implemented", "Initial", "Managed", "Defined", "Optimised"};
        List<MaturityLevelDTO> list = new ArrayList<>();
        for (int i = 0; i < names.length; i++) {
            MaturityLevelDTO d = new MaturityLevelDTO();
            d.setNumber(i + 1);
            d.setName(names[i]);
            list.add(d);
        }
        return list;
    }

    private void validateRow(CsvMaturityModelRow row, int lineNumber, List<String> errors, int maxMaturityLevel) {
        if (isBlank(row.getModelName())) {
            errors.add("Row " + lineNumber + ": modelName is required");
        }
        if (isBlank(row.getModelDescription())) {
            errors.add("Row " + lineNumber + ": modelDescription is required");
        }
        if (isBlank(row.getDimensionName())) {
            errors.add("Row " + lineNumber + ": dimensionName is required");
        }
        if (isBlank(row.getModuleName())) {
            errors.add("Row " + lineNumber + ": moduleName is required");
        }
        if (isBlank(row.getPracticeName())) {
            errors.add("Row " + lineNumber + ": practiceName is required");
        }
        if (isBlank(row.getQuestionWeight())) {
            errors.add("Row " + lineNumber + ": questionWeight is required");
        }
        if (isBlank(row.getQuestionText())) {
            errors.add("Row " + lineNumber + ": questionText is required");
        }
        if (isBlank(row.getQuestionType())) {
            errors.add("Row " + lineNumber + ": questionType is required");
        } else {
            String normalizedType = row.getQuestionType().toLowerCase(Locale.ROOT);
            if (!ALLOWED_QUESTION_TYPES.contains(normalizedType)) {
                errors.add("Row " + lineNumber + ": questionType must be one of boolean, likert, open_answer, multiple_choice, numeric, percentage, evidence");
            } else {
                if ("multiple_choice".equals(normalizedType)) {
                    validateQuestionChoicesForRow(row.getQuestionChoices(), lineNumber, errors);
                } else if ("numeric".equals(normalizedType) || "percentage".equals(normalizedType)) {
                    boolean hasBoundedRange = !isBlank(row.getQuestionRangeMin())
                            || !isBlank(row.getQuestionRangeMax())
                            || !isBlank(row.getQuestionRangeHighValueIsMaximum());
                    if (hasBoundedRange) {
                        validateBoundedRangeForRow(row, lineNumber, errors);
                    } else {
                        validateQuestionRangesForRow(
                                row.getQuestionRanges(),
                                normalizedType,
                                lineNumber,
                                errors,
                                maxMaturityLevel);
                    }
                } else if ("likert".equals(normalizedType)) {
                    String pointCount = !isBlank(row.getQuestionScalePointCount())
                            ? row.getQuestionScalePointCount()
                            : row.getQuestionLikertScaleMax();
                    validateScalePointCountForRow(pointCount, lineNumber, errors);
                    if (row.getQuestionScaleMinLabel() != null
                            && row.getQuestionScaleMinLabel().length() > 50) {
                        errors.add("Row " + lineNumber + ": questionScaleMinLabel must be 50 characters or fewer");
                    }
                    if (row.getQuestionScaleMaxLabel() != null
                            && row.getQuestionScaleMaxLabel().length() > 50) {
                        errors.add("Row " + lineNumber + ": questionScaleMaxLabel must be 50 characters or fewer");
                    }
                    if (!isBlank(row.getQuestionScaleHighPointIsMaximum())
                            && !isBooleanText(row.getQuestionScaleHighPointIsMaximum())) {
                        errors.add("Row " + lineNumber
                                + ": questionScaleHighPointIsMaximum must be true or false");
                    }
                } else if (!isBlank(row.getQuestionChoices())) {
                    errors.add("Row " + lineNumber + ": questionChoices must be empty unless questionType is multiple_choice");
                }
                if (!"likert".equals(normalizedType)
                        && (!isBlank(row.getQuestionLikertScaleMax())
                        || !isBlank(row.getQuestionScalePointCount())
                        || !isBlank(row.getQuestionScaleMinLabel())
                        || !isBlank(row.getQuestionScaleMaxLabel())
                        || !isBlank(row.getQuestionScaleHighPointIsMaximum()))) {
                    errors.add("Row " + lineNumber + ": Scale configuration must be empty unless questionType is likert");
                }
                if (!"numeric".equals(normalizedType) && !"percentage".equals(normalizedType)
                        && (!isBlank(row.getQuestionRanges())
                        || !isBlank(row.getQuestionRangeMin())
                        || !isBlank(row.getQuestionRangeMax())
                        || !isBlank(row.getQuestionRangeHighValueIsMaximum()))) {
                    errors.add("Row " + lineNumber + ": range configuration must be empty unless questionType is numeric or percentage");
                }
            }
        }
    }

    private void validateBoundedRangeForRow(
            CsvMaturityModelRow row,
            int lineNumber,
            List<String> errors
    ) {
        try {
            int minimum = Integer.parseInt(row.getQuestionRangeMin().trim());
            int maximum = Integer.parseInt(row.getQuestionRangeMax().trim());
            if (minimum >= maximum) {
                errors.add("Row " + lineNumber + ": questionRangeMin must be below questionRangeMax");
            }
        } catch (Exception exception) {
            errors.add("Row " + lineNumber + ": questionRangeMin and questionRangeMax must be integers");
        }
        if (!isBlank(row.getQuestionRangeHighValueIsMaximum())
                && !isBooleanText(row.getQuestionRangeHighValueIsMaximum())) {
            errors.add("Row " + lineNumber + ": questionRangeHighValueIsMaximum must be true or false");
        }
    }

    private void validateQuestionRangesForRow(
            String raw,
            String type,
            int lineNumber,
            List<String> errors,
            int maxMaturityLevel
    ) {
        if (isBlank(raw)) {
            errors.add("Row " + lineNumber + ": questionRanges is required for numeric and percentage questions");
            return;
        }
        try {
            List<QuestionRangeDTO> ranges = objectMapper.readValue(
                    raw.trim(),
                    new TypeReference<List<QuestionRangeDTO>>() {
                    });
            if (ranges == null || ranges.isEmpty()) {
                errors.add("Row " + lineNumber + ": questionRanges must contain at least one range");
                return;
            }
            Double previousMax = null;
            for (QuestionRangeDTO range : ranges) {
                if (range == null || range.getMin() == null || range.getMax() == null
                        || !Double.isFinite(range.getMin()) || !Double.isFinite(range.getMax())
                        || range.getMin() >= range.getMax()
                        || range.getLevel() == null || range.getLevel() < 1
                        || range.getLevel() > maxMaturityLevel
                        || (previousMax != null && Double.compare(range.getMin(), previousMax) != 0)) {
                    errors.add("Row " + lineNumber + ": questionRanges must be ordered, contiguous, non-overlapping, and map to valid levels");
                    return;
                }
                previousMax = range.getMax();
            }
            if ("percentage".equals(type)
                    && (Double.compare(ranges.get(0).getMin(), 0d) != 0
                    || Double.compare(ranges.get(ranges.size() - 1).getMax(), 100d) != 0)) {
                errors.add("Row " + lineNumber + ": percentage questionRanges must cover 0 to 100");
            }
        } catch (Exception e) {
            errors.add("Row " + lineNumber + ": questionRanges must be valid JSON: " + e.getMessage());
        }
    }

    private void validateScalePointCountForRow(String raw, int lineNumber, List<String> errors) {
        if (isBlank(raw)) {
            return;
        }
        String trimmed = raw.trim();
        int x;
        try {
            x = Integer.parseInt(trimmed);
        } catch (NumberFormatException e) {
            errors.add("Row " + lineNumber + ": questionScalePointCount must be an integer");
            return;
        }
        if (x < 2 || x > 100) {
            errors.add("Row " + lineNumber + ": questionScalePointCount must be between 2 and 100");
        }
    }

    private void validateQuestionChoicesForRow(String raw, int lineNumber, List<String> errors) {
        if (isBlank(raw)) {
            errors.add("Row " + lineNumber + ": questionChoices is required when questionType is multiple_choice (JSON array of {label, score})");
            return;
        }
        List<QuestionChoiceDTO> choices;
        try {
            choices = objectMapper.readValue(raw.trim(), new TypeReference<List<QuestionChoiceDTO>>() {
            });
        } catch (Exception e) {
            errors.add("Row " + lineNumber + ": questionChoices must be valid JSON: " + e.getMessage());
            return;
        }
        if (choices == null || choices.isEmpty()) {
            errors.add("Row " + lineNumber + ": multiple_choice requires 1 to 100 options in questionChoices");
            return;
        }
        if (choices.size() > 100) {
            errors.add("Row " + lineNumber + ": multiple_choice supports at most 100 options");
            return;
        }
        for (int i = 0; i < choices.size(); i++) {
            QuestionChoiceDTO c = choices.get(i);
            if (c == null) {
                errors.add("Row " + lineNumber + ": questionChoices option " + (i + 1) + " is invalid");
                return;
            }
            if (c.getLabel() == null || c.getLabel().trim().isEmpty()) {
                errors.add("Row " + lineNumber + ": each questionChoices option must have a non-empty label");
                return;
            }
            if (c.getScore() == null || !Double.isFinite(c.getScore())
                    || c.getScore() < 0.0 || c.getScore() > 1.0) {
                errors.add("Row " + lineNumber + ": each questionChoices option must have score between 0 and 1");
                return;
            }
        }
    }

    private MaturityModelDTO convertToMaturityModelDTO(
            List<CsvMaturityModelRow> rows,
            List<String> errors,
            List<MaturityLevelDTO> modelLevels,
            int[] rowNumbersOneBased
    ) {
        MaturityModelDTO dto = new MaturityModelDTO();
        CsvMaturityModelRow firstRow = rows.get(0);

        dto.setName(firstRow.getModelName());
        dto.setDescription(firstRow.getModelDescription());
        dto.setIsActive(false);
        dto.setAutoEvaluated(parseBoolean(firstRow.getModelAutoEvaluated(), true));
        dto.setLevels(modelLevels);

        LinkedHashMap<String, DimensionAccumulator> dimensions = new LinkedHashMap<>();

        for (int i = 0; i < rows.size(); i++) {
            CsvMaturityModelRow row = rows.get(i);
            int rowNumber = rowNumberFor(i, rowNumbersOneBased);

            assertSameModelData(dto, row, rowNumber, errors);

            Double questionWeight = parsePositiveDouble(row.getQuestionWeight(), "questionWeight", rowNumber, errors);
            Double practiceWeight = parsePositiveDoubleOrDefault(
                    row.getPracticeWeight(), 1.0, "practiceWeight", rowNumber, errors);
            Double moduleWeight = parseDoubleOrNull(row.getModuleWeight(), "moduleWeight", rowNumber, errors);

            if (questionWeight == null || practiceWeight == null) {
                continue;
            }

            String dimensionKey = !isBlank(row.getDimensionId())
                    ? "id:" + row.getDimensionId()
                    : "name:" + row.getDimensionName();
            DimensionAccumulator dimension = dimensions.get(dimensionKey);
            if (dimension == null) {
                DimensionDTO dimensionDTO = new DimensionDTO();
                dimensionDTO.setId(blankToNull(row.getDimensionId()));
                dimensionDTO.setName(row.getDimensionName());
                dimensionDTO.setDescription(row.getDimensionDescription());
                dimension = new DimensionAccumulator(dimensionDTO);
                dimensions.put(dimensionKey, dimension);
            }

            String moduleKey = !isBlank(row.getModuleCode())
                    ? "code:" + row.getModuleCode()
                    : "name:" + row.getModuleName();
            ModuleAccumulator module = dimension.modules.get(moduleKey);
            if (module == null) {
                ModuleDTO moduleDTO = new ModuleDTO();
                moduleDTO.setCode(blankToNull(row.getModuleCode()));
                moduleDTO.setName(row.getModuleName());
                moduleDTO.setDescription(blankToNull(row.getModuleDescription()));
                moduleDTO.setWeight(moduleWeight);
                module = new ModuleAccumulator(moduleDTO);
                dimension.modules.put(moduleKey, module);
            }

            String practiceKey = !isBlank(row.getPracticeCode())
                    ? "code:" + row.getPracticeCode()
                    : !isBlank(row.getPracticeId())
                    ? "legacy-id:" + row.getPracticeId()
                    : "name:" + row.getPracticeName();
            PracticeAccumulator practice = module.practices.get(practiceKey);
            if (practice == null) {
                PracticeDTO practiceDTO = new PracticeDTO();
                practiceDTO.setCode(blankToNull(row.getPracticeCode()));
                practiceDTO.setName(row.getPracticeName());
                practiceDTO.setDescription(blankToNull(row.getPracticeDescription()));
                practiceDTO.setWeight(practiceWeight);
                practice = new PracticeAccumulator(practiceDTO);
                module.practices.put(practiceKey, practice);
            }

            QuestionDTO questionDTO = new QuestionDTO();
            questionDTO.setCode(blankToNull(row.getQuestionCode()));
            questionDTO.setDependsOnQuestionCode(blankToNull(row.getDependsOnQuestionCode()));
            questionDTO.setWeight(questionWeight);
            questionDTO.setText(row.getQuestionText());
            String qType = row.getQuestionType().toLowerCase(Locale.ROOT);
            questionDTO.setType(qType);
            questionDTO.setHelp(blankToNull(row.getQuestionHelp()));
            boolean evidenceOnly = "evidence".equals(qType);
            questionDTO.setRequiresEvidence(evidenceOnly
                    || parseBoolean(row.getQuestionRequiresEvidence(), false));
            questionDTO.setRequired(parseBoolean(row.getQuestionRequired(), false));
            if ("multiple_choice".equals(qType) && !isBlank(row.getQuestionChoices())) {
                try {
                    questionDTO.setChoices(objectMapper.readValue(
                            row.getQuestionChoices().trim(),
                            new TypeReference<List<QuestionChoiceDTO>>() {
                            }));
                } catch (Exception e) {
                    errors.add("Row " + rowNumber + ": could not parse questionChoices: " + e.getMessage());
                }
            }
            if ("likert".equals(qType)) {
                String rawPointCount = !isBlank(row.getQuestionScalePointCount())
                        ? row.getQuestionScalePointCount()
                        : row.getQuestionLikertScaleMax();
                try {
                    questionDTO.setScalePointCount(isBlank(rawPointCount)
                            ? 5 : Integer.parseInt(rawPointCount.trim()));
                } catch (NumberFormatException e) {
                    errors.add("Row " + rowNumber + ": questionScalePointCount must be an integer");
                }
                questionDTO.setScaleMinLabel(blankToNull(row.getQuestionScaleMinLabel()));
                questionDTO.setScaleMaxLabel(blankToNull(row.getQuestionScaleMaxLabel()));
                questionDTO.setScaleHighPointIsMaximum(parseBoolean(
                        row.getQuestionScaleHighPointIsMaximum(), true));
            }
            if ("numeric".equals(qType) || "percentage".equals(qType)) {
                boolean hasBoundedRange = !isBlank(row.getQuestionRangeMin())
                        || !isBlank(row.getQuestionRangeMax())
                        || !isBlank(row.getQuestionRangeHighValueIsMaximum());
                try {
                    if (hasBoundedRange) {
                        questionDTO.setRangeMin(Integer.parseInt(row.getQuestionRangeMin().trim()));
                        questionDTO.setRangeMax(Integer.parseInt(row.getQuestionRangeMax().trim()));
                        questionDTO.setRangeHighValueIsMaximum(parseBoolean(
                                row.getQuestionRangeHighValueIsMaximum(), true));
                    } else {
                        List<QuestionRangeDTO> legacyRanges = objectMapper.readValue(
                                row.getQuestionRanges().trim(),
                                new TypeReference<List<QuestionRangeDTO>>() {
                                });
                        QuestionRangeDTO first = legacyRanges.getFirst();
                        QuestionRangeDTO last = legacyRanges.getLast();
                        questionDTO.setRangeMin((int) Math.floor(first.getMin()));
                        questionDTO.setRangeMax((int) Math.ceil(last.getMax()));
                        questionDTO.setRangeHighValueIsMaximum(last.getLevel() >= first.getLevel());
                    }
                } catch (Exception e) {
                    errors.add("Row " + rowNumber + ": could not parse numeric range: " + e.getMessage());
                }
            }
            practice.questions.add(questionDTO);
        }

        if (!errors.isEmpty()) {
            return dto;
        }

        if (dimensions.isEmpty()) {
            errors.add("At least one dimension is required");
        }

        dto.setDimensions(buildDimensions(dimensions));
        return dto;
    }

    private List<DimensionDTO> buildDimensions(LinkedHashMap<String, DimensionAccumulator> dimensions) {
        List<DimensionDTO> dimensionDTOs = new ArrayList<>();
        for (DimensionAccumulator dimensionAccumulator : dimensions.values()) {
            List<ModuleDTO> moduleDTOs = new ArrayList<>();
            for (ModuleAccumulator moduleAccumulator : dimensionAccumulator.modules.values()) {
                List<PracticeDTO> practiceDTOs = new ArrayList<>();
                for (PracticeAccumulator practiceAccumulator : moduleAccumulator.practices.values()) {
                    practiceAccumulator.practice.setQuestions(practiceAccumulator.questions);
                    practiceDTOs.add(practiceAccumulator.practice);
                }
                moduleAccumulator.module.setPractices(practiceDTOs);
                moduleDTOs.add(moduleAccumulator.module);
            }
            dimensionAccumulator.dimension.setModules(moduleDTOs);
            dimensionDTOs.add(dimensionAccumulator.dimension);
        }
        return dimensionDTOs;
    }

    private void assertSameModelData(MaturityModelDTO dto, CsvMaturityModelRow row, int rowNumber, List<String> errors) {
        assertConsistent("modelName", dto.getName(), row.getModelName(), rowNumber, errors);
        assertConsistent("modelDescription", dto.getDescription(), row.getModelDescription(), rowNumber, errors);
    }

    private void assertConsistent(String fieldName, String expected, String actual, int rowNumber, List<String> errors) {
        if (expected != null && actual != null && !expected.equals(actual)) {
            errors.add("Row " + rowNumber + ": " + fieldName + " must be consistent across all rows");
        }
    }

    private Double parsePositiveDouble(String value, String fieldName, int rowNumber, List<String> errors) {
        if (isBlank(value)) {
            return null;
        }
        try {
            double d = Double.parseDouble(value.trim());
            if (d <= 0 || Double.isNaN(d) || Double.isInfinite(d)) {
                errors.add("Row " + rowNumber + ": " + fieldName + " must be a positive number");
                return null;
            }
            return d;
        } catch (NumberFormatException e) {
            errors.add("Row " + rowNumber + ": " + fieldName + " must be a number");
            return null;
        }
    }

    private Double parsePositiveDoubleOrDefault(
            String value, double defaultValue, String fieldName, int rowNumber, List<String> errors) {
        if (isBlank(value)) {
            return defaultValue;
        }
        return parsePositiveDouble(value, fieldName, rowNumber, errors);
    }

    private Double parseDoubleOrNull(String value, String fieldName, int rowNumber, List<String> errors) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            errors.add("Row " + rowNumber + ": " + fieldName + " must be a number");
            return null;
        }
    }

    private Boolean parseBoolean(String value, boolean defaultValue) {
        if (isBlank(value)) {
            return defaultValue;
        }
        return "true".equalsIgnoreCase(value) || "1".equals(value) || "yes".equalsIgnoreCase(value);
    }

    private boolean isBooleanText(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return Set.of("true", "false", "1", "0", "yes", "no").contains(normalized);
    }

    private String blankToNull(String value) {
        return isBlank(value) ? null : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static final class DimensionAccumulator {
        private final DimensionDTO dimension;
        private final LinkedHashMap<String, ModuleAccumulator> modules = new LinkedHashMap<>();

        private DimensionAccumulator(DimensionDTO dimension) {
            this.dimension = dimension;
        }
    }

    private static final class ModuleAccumulator {
        private final ModuleDTO module;
        private final LinkedHashMap<String, PracticeAccumulator> practices = new LinkedHashMap<>();

        private ModuleAccumulator(ModuleDTO module) {
            this.module = module;
        }
    }

    private static final class PracticeAccumulator {
        private final PracticeDTO practice;
        private final List<QuestionDTO> questions = new ArrayList<>();

        private PracticeAccumulator(PracticeDTO practice) {
            this.practice = practice;
        }
    }
}
