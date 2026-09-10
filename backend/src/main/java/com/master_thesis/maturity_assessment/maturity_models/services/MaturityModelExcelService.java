package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.maturity_models.dto.CsvMaturityModelRow;
import com.master_thesis.maturity_assessment.maturity_models.dto.CsvUploadResponse;
import com.master_thesis.maturity_assessment.maturity_models.dto.DimensionDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityLevelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.ModuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.PracticeDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionDTO;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MaturityModelExcelService {

    /**
     * Minimal import/export layout: child sheets (Modules, Practices, Questions) join on
     * dimensionId + moduleCode + practiceId. Legacy workbooks may include optional columns
     * (e.g. dimensionName on Modules) for name-based joins; those are listed in *_OPTIONAL_HEADERS.
     * Exported XLSX Questions sheets include {@link #QUESTION_EXPORT_HEADERS}; import still accepts
     * files that omit questionHelp / questionRequiresEvidence / questionRequired.
     */
    public static final String SHEET_MODEL = "Model";
    public static final String SHEET_LEVELS = "Levels";
    public static final String SHEET_DIMENSIONS = "Dimensions";
    public static final String SHEET_MODULES = "Modules";
    public static final String SHEET_PRACTICES = "Practices";
    public static final String SHEET_QUESTIONS = "Questions";

    /** Written to exported workbooks and required on import (plus optional legacy columns). */
    private static final List<String> MODEL_HEADERS = List.of(
            "modelName", "modelDescription", "modelAutoEvaluated"
    );
    /** Legacy exports may include modelIsActive; it is ignored on import (models from file are always inactive). */
    private static final List<String> MODEL_OPTIONAL_HEADERS = List.of("modelLevels", "modelIsActive");

    private static final List<String> LEVELS_HEADERS = List.of("number", "name");
    private static final List<String> LEVELS_OPTIONAL_HEADERS = List.of("description");

    private static final List<String> DIMENSION_HEADERS = List.of("dimensionId", "dimensionName");
    private static final List<String> DIMENSION_OPTIONAL_HEADERS = List.of("dimensionDescription");

    private static final List<String> MODULE_HEADERS = List.of(
            "dimensionId", "moduleCode", "moduleName", "moduleDescription"
    );
    private static final List<String> MODULE_OPTIONAL_HEADERS = List.of(
            "dimensionName", "moduleWeight"
    );

    private static final List<String> PRACTICE_HEADERS = List.of(
            "dimensionId", "moduleCode", "practiceName", "practiceDescription"
    );
    private static final List<String> PRACTICE_OPTIONAL_HEADERS = List.of(
            "practiceCode", "practiceId", "dimensionName", "moduleName", "practiceWeight"
    );
    private static final List<String> PRACTICE_EXPORT_HEADERS = List.of(
            "dimensionId", "moduleCode", "practiceCode", "practiceName", "practiceDescription"
    );

    private static final List<String> QUESTION_HEADERS = List.of(
            "dimensionId", "moduleCode",
            "questionWeight", "questionText", "questionType",
            "questionChoices"
    );
    private static final List<String> QUESTION_OPTIONAL_HEADERS = List.of(
            "practiceCode", "practiceId", "questionCode", "dependsOnQuestionCode",
            "dimensionName", "moduleName", "practiceName",
            "questionHelp", "questionRequiresEvidence", "questionRequired", "questionRanges",
            "questionLikertScaleMax", "questionScalePointCount", "questionScaleMinLabel",
            "questionScaleMaxLabel", "questionScaleHighPointIsMaximum",
            "questionRangeMin", "questionRangeMax", "questionRangeHighValueIsMaximum"
    );

    /** Questions sheet columns written by {@link #exportMaturityModelToXlsx}. */
    public static final List<String> QUESTION_EXPORT_HEADERS = Stream.concat(
            Stream.of("dimensionId", "moduleCode", "practiceCode", "questionCode",
                    "dependsOnQuestionCode"),
            Stream.concat(
                    QUESTION_HEADERS.stream().skip(2),
                    Stream.of("questionScalePointCount", "questionScaleMinLabel", "questionScaleMaxLabel",
                            "questionScaleHighPointIsMaximum", "questionHelp", "questionRequiresEvidence",
                            "questionRequired", "questionRangeMin", "questionRangeMax",
                            "questionRangeHighValueIsMaximum", "questionRanges"))
    ).toList();

    private final CsvParsingService csvParsingService;
    private final ObjectMapper objectMapper;
    private final DataFormatter dataFormatter = new DataFormatter();

    public CsvUploadResponse parseExcelWorkbook(InputStream inputStream) {
        try (Workbook workbook = WorkbookFactory.create(inputStream)) {
            List<String> sheetErrors = validateSheetsPresent(workbook);
            if (!sheetErrors.isEmpty()) {
                return new CsvUploadResponse(false, "Validation failed", null, String.join("; ", sheetErrors));
            }

            Sheet modelSheet = workbook.getSheet(SHEET_MODEL);
            Map<String, Integer> modelCols = readHeaderRowFlexible(
                    modelSheet.getRow(0), MODEL_HEADERS, MODEL_OPTIONAL_HEADERS);
            if (modelCols == null) {
                return new CsvUploadResponse(false, "Validation failed", null,
                        "Model sheet: missing required headers: " + String.join(", ", MODEL_HEADERS));
            }
            Row modelDataRow = findFirstDataRow(modelSheet, 1);
            if (modelDataRow == null) {
                return new CsvUploadResponse(false, "Validation failed", null, "Model sheet: no data row");
            }
            Map<String, String> modelData = readRowAsMap(modelDataRow, modelCols);

            Sheet levelsSheet = workbook.getSheet(SHEET_LEVELS);
            Map<String, Integer> levelsCols = readHeaderRowFlexible(
                    levelsSheet.getRow(0), LEVELS_HEADERS, LEVELS_OPTIONAL_HEADERS);
            if (levelsCols == null) {
                return new CsvUploadResponse(false, "Validation failed", null,
                        "Levels sheet: missing required headers: " + String.join(", ", LEVELS_HEADERS));
            }
            List<MaturityLevelDTO> levelsFromSheet = readLevelsData(levelsSheet, levelsCols);

            String modelLevelsCell = blankToEmpty(modelData.get("modelLevels"));
            String resolvedLevelsJson;
            try {
                resolvedLevelsJson = resolveLevelsJson(levelsFromSheet, modelLevelsCell);
            } catch (JsonProcessingException e) {
                return new CsvUploadResponse(false, "Validation failed", null, "Levels sheet: " + e.getMessage());
            }

            Sheet dimSheet = workbook.getSheet(SHEET_DIMENSIONS);
            Map<String, Integer> dimCols = readHeaderRowFlexible(
                    dimSheet.getRow(0), DIMENSION_HEADERS, DIMENSION_OPTIONAL_HEADERS);
            if (dimCols == null) {
                return new CsvUploadResponse(false, "Validation failed", null,
                        "Dimensions sheet: missing required headers: " + String.join(", ", DIMENSION_HEADERS));
            }
            List<Map<String, String>> dimensionRows = readAllDataRows(dimSheet, dimCols, 1);

            Sheet modSheet = workbook.getSheet(SHEET_MODULES);
            Map<String, Integer> modCols = readHeaderRowFlexible(
                    modSheet.getRow(0), MODULE_HEADERS, MODULE_OPTIONAL_HEADERS);
            if (modCols == null) {
                return new CsvUploadResponse(false, "Validation failed", null,
                        "Modules sheet: missing required headers: " + String.join(", ", MODULE_HEADERS));
            }
            List<Map<String, String>> moduleRows = readAllDataRows(modSheet, modCols, 1);

            Sheet prSheet = workbook.getSheet(SHEET_PRACTICES);
            Map<String, Integer> prCols = readHeaderRowFlexible(
                    prSheet.getRow(0), PRACTICE_HEADERS, PRACTICE_OPTIONAL_HEADERS);
            if (prCols == null) {
                return new CsvUploadResponse(false, "Validation failed", null,
                        "Practices sheet: missing required headers: " + String.join(", ", PRACTICE_HEADERS));
            }
            if (!prCols.containsKey("practiceCode") && !prCols.containsKey("practiceId")) {
                return new CsvUploadResponse(false, "Validation failed", null,
                        "Practices sheet: practiceCode is required (legacy practiceId is also accepted).");
            }
            List<Map<String, String>> practiceRows = readAllDataRows(prSheet, prCols, 1);

            Sheet qSheet = workbook.getSheet(SHEET_QUESTIONS);
            Map<String, Integer> qCols = readHeaderRowFlexible(
                    qSheet.getRow(0), QUESTION_HEADERS, QUESTION_OPTIONAL_HEADERS);
            if (qCols == null) {
                return new CsvUploadResponse(false, "Validation failed", null,
                        "Questions sheet: missing required headers: " + String.join(", ", QUESTION_HEADERS));
            }
            if (!qCols.containsKey("practiceCode") && !qCols.containsKey("practiceId")) {
                return new CsvUploadResponse(false, "Validation failed", null,
                        "Questions sheet: practiceCode is required (legacy practiceId is also accepted).");
            }

            List<CsvMaturityModelRow> denormalized = new ArrayList<>();
            List<Integer> excelRows = new ArrayList<>();
            List<String> joinErrors = new ArrayList<>();

            for (int r = 1; r <= qSheet.getLastRowNum(); r++) {
                Row row = qSheet.getRow(r);
                if (row == null || isRowEmpty(row, qCols)) {
                    continue;
                }
                Map<String, String> q = readRowAsMap(row, qCols);
                int excelRowOneBased = r + 1;

                Map<String, String> dim = findDimensionRow(q, dimensionRows, excelRowOneBased, joinErrors);
                if (dim == null) {
                    continue;
                }
                Map<String, String> mod = findModuleRow(q, dim, moduleRows, excelRowOneBased, joinErrors);
                if (mod == null) {
                    continue;
                }
                Map<String, String> pr = findPracticeRow(q, dim, mod, practiceRows, excelRowOneBased, joinErrors);
                if (pr == null) {
                    continue;
                }

                CsvMaturityModelRow m = new CsvMaturityModelRow();
                m.setModelName(modelData.get("modelName"));
                m.setModelDescription(modelData.get("modelDescription"));
                m.setModelAutoEvaluated(modelData.get("modelAutoEvaluated"));
                m.setModelLevels(resolvedLevelsJson);

                m.setDimensionId(dim.get("dimensionId"));
                m.setDimensionName(dim.get("dimensionName"));
                m.setDimensionDescription(dim.get("dimensionDescription"));

                m.setModuleCode(mod.get("moduleCode"));
                m.setModuleName(mod.get("moduleName"));
                m.setModuleDescription(mod.get("moduleDescription"));
                m.setModuleWeight(mod.get("moduleWeight"));

                m.setPracticeId(pr.get("practiceId"));
                m.setPracticeCode(pr.get("practiceCode"));
                m.setPracticeName(pr.get("practiceName"));
                m.setPracticeDescription(pr.get("practiceDescription"));
                m.setPracticeWeight(pr.get("practiceWeight"));

                m.setQuestionWeight(q.get("questionWeight"));
                m.setQuestionCode(q.get("questionCode"));
                m.setDependsOnQuestionCode(q.get("dependsOnQuestionCode"));
                m.setQuestionText(q.get("questionText"));
                m.setQuestionType(q.get("questionType"));
                m.setQuestionHelp(q.get("questionHelp"));
                m.setQuestionRequiresEvidence(q.get("questionRequiresEvidence"));
                m.setQuestionRequired(q.get("questionRequired"));
                m.setQuestionChoices(q.get("questionChoices"));
                m.setQuestionLikertScaleMax(q.get("questionLikertScaleMax"));
                m.setQuestionScalePointCount(q.get("questionScalePointCount"));
                m.setQuestionScaleMinLabel(q.get("questionScaleMinLabel"));
                m.setQuestionScaleMaxLabel(q.get("questionScaleMaxLabel"));
                m.setQuestionScaleHighPointIsMaximum(q.get("questionScaleHighPointIsMaximum"));
                m.setQuestionRangeMin(q.get("questionRangeMin"));
                m.setQuestionRangeMax(q.get("questionRangeMax"));
                m.setQuestionRangeHighValueIsMaximum(q.get("questionRangeHighValueIsMaximum"));
                m.setQuestionRanges(q.get("questionRanges"));

                denormalized.add(m);
                excelRows.add(excelRowOneBased);
            }

            if (!joinErrors.isEmpty()) {
                return new CsvUploadResponse(false, "Validation failed", null, String.join("; ", joinErrors));
            }

            if (denormalized.isEmpty()) {
                return new CsvUploadResponse(false, "Validation failed", null, "Questions sheet has no data rows");
            }

            int[] rowNumbers = excelRows.stream().mapToInt(Integer::intValue).toArray();
            return csvParsingService.parseDenormalizedRows(denormalized, rowNumbers);
        } catch (Exception e) {
            return new CsvUploadResponse(false, "Failed to read Excel file", null, e.getMessage());
        }
    }

    private String resolveLevelsJson(List<MaturityLevelDTO> levelsFromSheet, String modelLevelsCell)
            throws JsonProcessingException {
        if (!levelsFromSheet.isEmpty()) {
            return objectMapper.writeValueAsString(levelsFromSheet);
        }
        return modelLevelsCell;
    }

    private List<String> validateSheetsPresent(Workbook workbook) {
        Set<String> names = new LinkedHashSet<>();
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            names.add(workbook.getSheetAt(i).getSheetName());
        }
        List<String> missing = new ArrayList<>();
        for (String required : List.of(SHEET_MODEL, SHEET_LEVELS, SHEET_DIMENSIONS, SHEET_MODULES, SHEET_PRACTICES,
                SHEET_QUESTIONS)) {
            if (!names.contains(required)) {
                missing.add("Missing sheet: " + required);
            }
        }
        return missing;
    }

    /**
     * Requires every name in {@code required} to appear in row 1; includes any of {@code optional}
     * that also appear. Unknown header names on the sheet are ignored for the returned map.
     */
    private Map<String, Integer> readHeaderRowFlexible(
            Row headerRow, List<String> required, List<String> optional) {
        if (headerRow == null) {
            return null;
        }
        Map<String, Integer> full = new LinkedHashMap<>();
        int last = headerRow.getLastCellNum();
        if (last < 0) {
            last = 0;
        }
        for (int c = 0; c <= last; c++) {
            Cell cell = headerRow.getCell(c);
            if (cell == null) {
                continue;
            }
            String h = dataFormatter.formatCellValue(cell).trim();
            if (!h.isEmpty()) {
                full.put(h, c);
            }
        }
        for (String req : required) {
            if (!full.containsKey(req)) {
                return null;
            }
        }
        Set<String> allowed = new LinkedHashSet<>(required);
        allowed.addAll(optional);
        Map<String, Integer> out = new LinkedHashMap<>();
        for (String key : allowed) {
            if (full.containsKey(key)) {
                out.put(key, full.get(key));
            }
        }
        return out;
    }

    private Row findFirstDataRow(Sheet sheet, int startRowIndex) {
        for (int r = startRowIndex; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row != null && !isBlankRowGeneric(row)) {
                return row;
            }
        }
        return null;
    }

    private boolean isBlankRowGeneric(Row row) {
        int first = row.getFirstCellNum();
        int last = row.getLastCellNum();
        if (first < 0 || last < 0) {
            return true;
        }
        for (int c = first; c <= last; c++) {
            Cell cell = row.getCell(c);
            if (cell != null && !dataFormatter.formatCellValue(cell).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private boolean isRowEmpty(Row row, Map<String, Integer> cols) {
        for (int col : cols.values()) {
            Cell cell = row.getCell(col);
            if (cell != null && !dataFormatter.formatCellValue(cell).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private Map<String, String> readRowAsMap(Row row, Map<String, Integer> colByName) {
        Map<String, String> map = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> e : colByName.entrySet()) {
            Cell cell = row.getCell(e.getValue());
            map.put(e.getKey(), cell == null ? "" : dataFormatter.formatCellValue(cell).trim());
        }
        return map;
    }

    private List<Map<String, String>> readAllDataRows(Sheet sheet, Map<String, Integer> cols, int startRowIndex) {
        List<Map<String, String>> out = new ArrayList<>();
        for (int r = startRowIndex; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null || isRowEmpty(row, cols)) {
                continue;
            }
            out.add(readRowAsMap(row, cols));
        }
        return out;
    }

    private List<MaturityLevelDTO> readLevelsData(Sheet sheet, Map<String, Integer> cols) {
        List<MaturityLevelDTO> list = new ArrayList<>();
        for (int r = 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null || isRowEmpty(row, cols)) {
                continue;
            }
            Map<String, String> m = readRowAsMap(row, cols);
            String numStr = m.get("number");
            String name = m.get("name");
            if (isBlank(numStr) && isBlank(name)) {
                continue;
            }
            MaturityLevelDTO level = new MaturityLevelDTO();
            if (!isBlank(numStr)) {
                try {
                    double d = Double.parseDouble(numStr.trim());
                    level.setNumber((int) Math.round(d));
                } catch (NumberFormatException e) {
                    level.setNumber(null);
                }
            }
            level.setName(name);
            String desc = m.get("description");
            level.setDescription(isBlank(desc) ? null : desc);
            list.add(level);
        }
        return list;
    }

    private Map<String, String> findDimensionRow(
            Map<String, String> q,
            List<Map<String, String>> dimensionRows,
            int excelRow,
            List<String> errors
    ) {
        String qId = blankToEmpty(q.get("dimensionId"));
        String qName = blankToEmpty(q.get("dimensionName"));
        if (isBlank(qId) && isBlank(qName)) {
            errors.add("Row " + excelRow + ": dimensionId or dimensionName is required");
            return null;
        }
        for (Map<String, String> d : dimensionRows) {
            if (!isBlank(qId) && qId.equals(blankToEmpty(d.get("dimensionId")))) {
                return d;
            }
        }
        if (!isBlank(qId)) {
            errors.add("Row " + excelRow + ": dimension not found for dimensionId=" + qId);
            return null;
        }
        for (Map<String, String> d : dimensionRows) {
            if (qName.equals(blankToEmpty(d.get("dimensionName")))) {
                return d;
            }
        }
        errors.add("Row " + excelRow + ": dimension not found for dimensionName=" + qName);
        return null;
    }

    private Map<String, String> findModuleRow(
            Map<String, String> q,
            Map<String, String> dim,
            List<Map<String, String>> moduleRows,
            int excelRow,
            List<String> errors
    ) {
        String qCode = blankToEmpty(q.get("moduleCode"));
        String qModName = blankToEmpty(q.get("moduleName"));
        if (isBlank(qCode) && isBlank(qModName)) {
            errors.add("Row " + excelRow + ": moduleCode or moduleName is required");
            return null;
        }
        String dimId = blankToEmpty(dim.get("dimensionId"));
        String dimName = blankToEmpty(dim.get("dimensionName"));

        for (Map<String, String> m : moduleRows) {
            if (!dimensionRowMatches(m, dimId, dimName)) {
                continue;
            }
            if (!isBlank(qCode) && qCode.equals(blankToEmpty(m.get("moduleCode")))) {
                return m;
            }
        }
        if (!isBlank(qCode)) {
            errors.add("Row " + excelRow + ": module not found for dimension and moduleCode=" + qCode);
            return null;
        }
        for (Map<String, String> m : moduleRows) {
            if (!dimensionRowMatches(m, dimId, dimName)) {
                continue;
            }
            if (qModName.equals(blankToEmpty(m.get("moduleName")))) {
                return m;
            }
        }
        errors.add("Row " + excelRow + ": module not found for dimension and moduleName=" + qModName);
        return null;
    }

    private boolean dimensionRowMatches(Map<String, String> m, String dimId, String dimName) {
        String mDimId = blankToEmpty(m.get("dimensionId"));
        String mDimName = blankToEmpty(m.get("dimensionName"));
        if (!isBlank(dimId)) {
            return dimId.equals(mDimId);
        }
        return dimName.equals(mDimName);
    }

    private Map<String, String> findPracticeRow(
            Map<String, String> q,
            Map<String, String> dim,
            Map<String, String> mod,
            List<Map<String, String>> practiceRows,
            int excelRow,
            List<String> errors
    ) {
        String qPrCode = blankToEmpty(q.get("practiceCode"));
        String qPrId = blankToEmpty(q.get("practiceId"));
        String qPrName = blankToEmpty(q.get("practiceName"));
        if (isBlank(qPrCode) && isBlank(qPrId) && isBlank(qPrName)) {
            errors.add("Row " + excelRow + ": practiceCode, legacy practiceId, or practiceName is required");
            return null;
        }
        String dimId = blankToEmpty(dim.get("dimensionId"));
        String dimName = blankToEmpty(dim.get("dimensionName"));
        String modCode = blankToEmpty(mod.get("moduleCode"));
        String modName = blankToEmpty(mod.get("moduleName"));

        for (Map<String, String> p : practiceRows) {
            if (!dimensionRowMatches(p, dimId, dimName)) {
                continue;
            }
            if (!moduleRowMatches(p, modCode, modName)) {
                continue;
            }
            if (!isBlank(qPrCode) && qPrCode.equalsIgnoreCase(blankToEmpty(p.get("practiceCode")))) {
                return p;
            }
        }
        if (!isBlank(qPrCode)) {
            errors.add("Row " + excelRow + ": practice not found for practiceCode=" + qPrCode);
            return null;
        }
        for (Map<String, String> p : practiceRows) {
            if (!dimensionRowMatches(p, dimId, dimName) || !moduleRowMatches(p, modCode, modName)) {
                continue;
            }
            if (!isBlank(qPrId) && qPrId.equals(blankToEmpty(p.get("practiceId")))) {
                return p;
            }
        }
        if (!isBlank(qPrId)) {
            errors.add("Row " + excelRow + ": practice not found for practiceId=" + qPrId);
            return null;
        }
        for (Map<String, String> p : practiceRows) {
            if (!dimensionRowMatches(p, dimId, dimName)) {
                continue;
            }
            if (!moduleRowMatches(p, modCode, modName)) {
                continue;
            }
            if (qPrName.equals(blankToEmpty(p.get("practiceName")))) {
                return p;
            }
        }
        errors.add("Row " + excelRow + ": practice not found for practiceName=" + qPrName);
        return null;
    }

    private boolean moduleRowMatches(Map<String, String> p, String modCode, String modName) {
        String pCode = blankToEmpty(p.get("moduleCode"));
        String pName = blankToEmpty(p.get("moduleName"));
        if (!isBlank(modCode)) {
            return modCode.equals(pCode);
        }
        return modName.equals(pName);
    }

    private static String blankToEmpty(String s) {
        return s == null ? "" : s.trim();
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    public byte[] exportMaturityModelToXlsx(MaturityModelDTO model) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            writeModelSheet(workbook, model);
            writeLevelsSheet(workbook, model);
            writeDimensionsSheet(workbook, model);
            writeModulesSheet(workbook, model);
            writePracticesSheet(workbook, model);
            writeQuestionsSheet(workbook, model);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void writeModelSheet(Workbook workbook, MaturityModelDTO model) {
        Sheet sheet = workbook.createSheet(SHEET_MODEL);
        Row h = sheet.createRow(0);
        for (int i = 0; i < MODEL_HEADERS.size(); i++) {
            h.createCell(i).setCellValue(MODEL_HEADERS.get(i));
        }
        Row d = sheet.createRow(1);
        d.createCell(0).setCellValue(nullToEmpty(model.getName()));
        d.createCell(1).setCellValue(nullToEmpty(model.getDescription()));
        d.createCell(2).setCellValue(model.getAutoEvaluated() == null || model.getAutoEvaluated());
    }

    private void writeLevelsSheet(Workbook workbook, MaturityModelDTO model) {
        Sheet sheet = workbook.createSheet(SHEET_LEVELS);
        Row h = sheet.createRow(0);
        for (int i = 0; i < LEVELS_HEADERS.size(); i++) {
            h.createCell(i).setCellValue(LEVELS_HEADERS.get(i));
        }
        if (model.getLevels() == null) {
            return;
        }
        int r = 1;
        for (MaturityLevelDTO level : model.getLevels()) {
            Row row = sheet.createRow(r++);
            if (level.getNumber() != null) {
                row.createCell(0).setCellValue(level.getNumber());
            }
            row.createCell(1).setCellValue(nullToEmpty(level.getName()));
        }
    }

    private void writeDimensionsSheet(Workbook workbook, MaturityModelDTO model) {
        Sheet sheet = workbook.createSheet(SHEET_DIMENSIONS);
        writeHeaderRow(sheet, DIMENSION_HEADERS);
        if (model.getDimensions() == null) {
            return;
        }
        int r = 1;
        for (DimensionDTO dim : model.getDimensions()) {
            Row row = sheet.createRow(r++);
            row.createCell(0).setCellValue(nullToEmpty(dim.getId()));
            row.createCell(1).setCellValue(nullToEmpty(dim.getName()));
        }
    }

    private void writeModulesSheet(Workbook workbook, MaturityModelDTO model) {
        Sheet sheet = workbook.createSheet(SHEET_MODULES);
        writeHeaderRow(sheet, MODULE_HEADERS);
        if (model.getDimensions() == null) {
            return;
        }
        int r = 1;
        for (DimensionDTO dim : model.getDimensions()) {
            if (dim.getModules() == null) {
                continue;
            }
            for (ModuleDTO mod : dim.getModules()) {
                Row row = sheet.createRow(r++);
                row.createCell(0).setCellValue(nullToEmpty(dim.getId()));
                row.createCell(1).setCellValue(nullToEmpty(mod.getCode()));
                row.createCell(2).setCellValue(nullToEmpty(mod.getName()));
                row.createCell(3).setCellValue(nullToEmpty(mod.getDescription()));
            }
        }
    }

    private void writePracticesSheet(Workbook workbook, MaturityModelDTO model) {
        Sheet sheet = workbook.createSheet(SHEET_PRACTICES);
        writeHeaderRow(sheet, PRACTICE_EXPORT_HEADERS);
        if (model.getDimensions() == null) {
            return;
        }
        int r = 1;
        for (DimensionDTO dim : model.getDimensions()) {
            if (dim.getModules() == null) {
                continue;
            }
            for (ModuleDTO mod : dim.getModules()) {
                if (mod.getPractices() == null) {
                    continue;
                }
                for (PracticeDTO pr : mod.getPractices()) {
                    Row row = sheet.createRow(r++);
                    row.createCell(0).setCellValue(nullToEmpty(dim.getId()));
                    row.createCell(1).setCellValue(nullToEmpty(mod.getCode()));
                    row.createCell(2).setCellValue(resolvePracticeCode(pr));
                    row.createCell(3).setCellValue(nullToEmpty(pr.getName()));
                    row.createCell(4).setCellValue(nullToEmpty(pr.getDescription()));
                }
            }
        }
    }

    private void writeQuestionsSheet(Workbook workbook, MaturityModelDTO model) {
        Sheet sheet = workbook.createSheet(SHEET_QUESTIONS);
        writeHeaderRow(sheet, QUESTION_EXPORT_HEADERS);
        if (model.getDimensions() == null) {
            return;
        }
        int r = 1;
        for (DimensionDTO dim : model.getDimensions()) {
            if (dim.getModules() == null) {
                continue;
            }
            for (ModuleDTO mod : dim.getModules()) {
                if (mod.getPractices() == null) {
                    continue;
                }
                for (PracticeDTO pr : mod.getPractices()) {
                    if (pr.getQuestions() == null) {
                        continue;
                    }
                    for (QuestionDTO q : pr.getQuestions()) {
                        Row row = sheet.createRow(r++);
                        row.createCell(0).setCellValue(nullToEmpty(dim.getId()));
                        row.createCell(1).setCellValue(nullToEmpty(mod.getCode()));
                        row.createCell(2).setCellValue(resolvePracticeCode(pr));
                        row.createCell(3).setCellValue(resolveQuestionCode(q));
                        row.createCell(4).setCellValue(resolveDependencyCode(pr, q));
                        double weight = q.getWeight() != null ? q.getWeight() : 1.0;
                        row.createCell(5).setCellValue(weight);
                        row.createCell(6).setCellValue(nullToEmpty(q.getText()));
                        row.createCell(7).setCellValue(q.getType() == null ? "" : q.getType().toLowerCase(Locale.ROOT));
                        String choices = "";
                        if (q.getType() != null && "multiple_choice".equalsIgnoreCase(q.getType())
                                && q.getChoices() != null && !q.getChoices().isEmpty()) {
                            try {
                                choices = objectMapper.writeValueAsString(q.getChoices());
                            } catch (JsonProcessingException ignored) {
                            }
                        }
                        row.createCell(8).setCellValue(choices);
                        if (q.getType() != null && "likert".equalsIgnoreCase(q.getType())) {
                            row.createCell(9).setCellValue(q.getScalePointCount() != null
                                    ? q.getScalePointCount() : 5);
                            row.createCell(10).setCellValue(nullToEmpty(q.getScaleMinLabel()));
                            row.createCell(11).setCellValue(nullToEmpty(q.getScaleMaxLabel()));
                            row.createCell(12).setCellValue(
                                    q.getScaleHighPointIsMaximum() == null
                                            || q.getScaleHighPointIsMaximum());
                        } else {
                            row.createCell(9).setCellValue("");
                            row.createCell(10).setCellValue("");
                            row.createCell(11).setCellValue("");
                            row.createCell(12).setCellValue("");
                        }
                        row.createCell(13).setCellValue(nullToEmpty(q.getHelp()));
                        row.createCell(14).setCellValue(Boolean.TRUE.equals(q.getRequiresEvidence()));
                        row.createCell(15).setCellValue(Boolean.TRUE.equals(q.getRequired()));
                        boolean rangeQuestion = q.getType() != null
                                && ("numeric".equalsIgnoreCase(q.getType())
                                || "percentage".equalsIgnoreCase(q.getType()));
                        if (rangeQuestion) {
                            row.createCell(16).setCellValue(q.getRangeMin() != null ? q.getRangeMin() : 0);
                            row.createCell(17).setCellValue(q.getRangeMax() != null ? q.getRangeMax() : 100);
                            row.createCell(18).setCellValue(q.getRangeHighValueIsMaximum() == null
                                    || q.getRangeHighValueIsMaximum());
                        } else {
                            row.createCell(16).setCellValue("");
                            row.createCell(17).setCellValue("");
                            row.createCell(18).setCellValue("");
                        }
                        row.createCell(19).setCellValue("");
                    }
                }
            }
        }
    }

    private static void writeHeaderRow(Sheet sheet, List<String> headers) {
        Row h = sheet.createRow(0);
        for (int i = 0; i < headers.size(); i++) {
            h.createCell(i).setCellValue(headers.get(i));
        }
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String resolvePracticeCode(PracticeDTO practice) {
        if (practice.getCode() != null && !practice.getCode().isBlank()) {
            return practice.getCode();
        }
        if (practice.getId() != null) {
            return "P" + practice.getId();
        }
        return "P_" + Math.abs((practice.getName() == null ? "practice" : practice.getName()).hashCode());
    }

    private static String resolveQuestionCode(QuestionDTO question) {
        if (question.getCode() != null && !question.getCode().isBlank()) {
            return question.getCode();
        }
        if (question.getId() != null) {
            return "Q" + question.getId();
        }
        return "Q_" + Math.abs((question.getText() == null ? "question" : question.getText()).hashCode());
    }

    private static String resolveDependencyCode(PracticeDTO practice, QuestionDTO question) {
        if (question.getDependsOnQuestionCode() != null
                && !question.getDependsOnQuestionCode().isBlank()) {
            return question.getDependsOnQuestionCode();
        }
        if (question.getDependsOnQuestionId() == null || practice.getQuestions() == null) {
            return "";
        }
        return practice.getQuestions().stream()
                .filter(candidate -> question.getDependsOnQuestionId().equals(candidate.getId()))
                .findFirst()
                .map(MaturityModelExcelService::resolveQuestionCode)
                .orElse("");
    }
}
