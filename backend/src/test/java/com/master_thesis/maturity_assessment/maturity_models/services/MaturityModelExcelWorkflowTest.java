package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.maturity_models.controllers.MaturityModelController;
import com.master_thesis.maturity_assessment.maturity_models.dto.*;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import com.master_thesis.maturity_assessment.maturity_models.repository.DomainRepository;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MaturityModelExcelWorkflowTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final MaturityModelExcelService excel = new MaturityModelExcelService(new CsvParsingService(mapper), mapper);

    private MaturityModelService modelService() {
        MaturityModelService service = new MaturityModelService();
        ReflectionTestUtils.setField(service, "objectMapper", mapper);
        return service;
    }

    private MaturityModelDTO model() {
        MaturityModelDTO model = MaturityModelExcelServiceTest.buildOfficialTemplateModel();
        model.setChangelogMarkdown("Updated scoring\n\n- Revised thresholds");
        model.setAggregationRule(AggregationRule.MEDIAN);
        model.getLevels().getFirst().setDescription("No established process");
        DimensionDTO dimension = model.getDimensions().getFirst();
        dimension.setWeight(2.5);
        dimension.setAggregationRule(AggregationRule.MINIMUM);
        List<MappingRuleDTO> mappings = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            MappingRuleDTO rule = new MappingRuleDTO();
            rule.setLevelNumber(i + 1);
            rule.setMinimumScore(i * 0.15);
            mappings.add(rule);
        }
        dimension.setMappingRules(mappings);
        dimension.setGatingRules(List.of(gate("PM_CORE")));
        ModuleDTO module = dimension.getModules().getFirst();
        module.setWeight(4.0);
        module.setAggregationRule(AggregationRule.MAXIMUM);
        module.setGatingRules(List.of(gate("P1_PD")));
        PracticeDTO practice = module.getPractices().getFirst();
        practice.setWeight(3.0);
        practice.setRequiresEvidence(true);
        practice.setAggregationRule(AggregationRule.SUM);
        practice.setGatingRules(List.of(gate("Q1_APD")));
        practice.getQuestions().getFirst().setBooleanCorrectAnswer(false);
        // Both forms of dependency references can arrive from model exports.
        practice.getQuestions().getFirst().setId(501L);
        practice.getQuestions().getLast().setDependsOnQuestionCode(null);
        practice.getQuestions().getLast().setDependsOnQuestionId(501L);
        return model;
    }

    private static GatingRuleDTO gate(String child) {
        GatingRuleDTO rule = new GatingRuleDTO();
        rule.setOrder(0);
        rule.setSelection(GatingSelection.SPECIFIC_CHILD);
        rule.setChildCode(child);
        rule.setOperator(GatingComparisonOperator.BELOW);
        rule.setThreshold(new BigDecimal("0.5"));
        rule.setOperation(GatingScoreOperation.SET);
        rule.setValue(BigDecimal.ZERO);
        return rule;
    }

    @Test
    void allQuestionTypesAndScoringSettings_surviveExportImportAndEditorSave() throws Exception {
        MaturityModelDTO source = model();
        byte[] workbook = excel.exportMaturityModelToXlsx(source);
        MaturityModelService service = modelService();
        MaturityModelEditorDTO expected = service.prepareEditorDocument(source);
        expected.setChangelogMarkdown(source.getChangelogMarkdown());
        MaturityModelController controller = new MaturityModelController(service, excel);
        var response = controller.parseEditorUpload(upload(workbook), 8L);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess(), response.getBody().getErrorDetails());
        MaturityModelEditorDTO imported = response.getBody().getDocument();
        expected.setDomainId(8L);
        assertEquals(expected, imported);

        DomainRepository domains = mock(DomainRepository.class);
        Domain domain = new Domain();
        domain.setId(8L);
        when(domains.findById(8L)).thenReturn(java.util.Optional.of(domain));
        ReflectionTestUtils.setField(service, "domainRepository", domains);
        MaturityModelRepository models = mock(MaturityModelRepository.class);
        when(models.saveAndFlush(any())).thenAnswer(invocation -> {
            MaturityModel saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });
        when(models.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        ReflectionTestUtils.setField(service, "maturityModelRepository", models);
        MaturityModelDTO saved = service.createFromEditor(imported);
        assertFalse(saved.getIsActive());
        assertEquals(1, saved.getVersion());
        assertEquals(imported.getChangelogMarkdown(), saved.getChangelogMarkdown());
        assertEquals(imported.getAggregationRule(), saved.getAggregationRule());
        var savedDimension = saved.getDimensions().getFirst();
        var importedDimension = imported.getDimensions().getFirst();
        assertEquals(importedDimension.getMappingRules(), savedDimension.getMappingRules());
        assertEquals(importedDimension.getGatingRules(), savedDimension.getGatingRules());
        assertEquals(importedDimension.getWeight(), savedDimension.getWeight());
        var savedModule = savedDimension.getModules().getFirst();
        var importedModule = importedDimension.getModules().getFirst();
        assertEquals(importedModule.getAggregationRule(), savedModule.getAggregationRule());
        assertEquals(importedModule.getGatingRules(), savedModule.getGatingRules());
        assertEquals(importedModule.getWeight(), savedModule.getWeight());
        var savedPractice = savedModule.getPractices().getFirst();
        var importedPractice = importedModule.getPractices().getFirst();
        assertEquals(importedPractice.getAggregationRule(), savedPractice.getAggregationRule());
        assertEquals(importedPractice.getGatingRules(), savedPractice.getGatingRules());
        assertEquals(importedPractice.getWeight(), savedPractice.getWeight());
        assertTrue(savedPractice.getRequiresEvidence());
        assertFalse(savedPractice.getQuestions().getFirst().getBooleanCorrectAnswer());
        assertEquals("Q1_APD", savedPractice.getQuestions().getLast().getDependsOnQuestionCode());
        var savedQuality = saved.getDimensions().getLast().getModules().getLast().getPractices().getFirst().getQuestions();
        assertFalse(savedQuality.get(1).getRangeHighValueIsMaximum());
        assertEquals(50, savedQuality.get(1).getRangeMax());
        assertEquals(100, savedQuality.get(2).getRangeMax());
        assertEquals(List.of(2.0, 3.0), savedQuality.getLast().getChoices().stream().map(QuestionChoiceDTO::getRawValue).toList());
        verify(models).saveAndFlush(any());
    }

    @Test
    void editedWorkbook_canRenameChangeScoringAndAddAQuestion() throws Exception {
        byte[] edited = edit(excel.exportMaturityModelToXlsx(model()), workbook -> {
            set(workbook, "Model", 1, "modelName", "Edited model");
            set(workbook, "Model", 1, "modelAutoEvaluated", "false");
            set(workbook, "Dimensions", 1, "dimensionName", "Renamed dimension");
            set(workbook, "Modules", 1, "moduleWeight", "6.5");
            set(workbook, "Practices", 1, "practiceRequiresEvidence", "false");
            set(workbook, "Questions", 1, "questionText", "Edited question");
            set(workbook, "Questions", 1, "questionBooleanCorrectAnswer", "true");
            Sheet questions = workbook.getSheet("Questions");
            Row added = questions.createRow(questions.getLastRowNum() + 1);
            Row first = questions.getRow(1);
            for (int c = 0; c < first.getLastCellNum(); c++) {
                added.createCell(c).setCellValue(new DataFormatter().formatCellValue(first.getCell(c)));
            }
            set(workbook, "Questions", added.getRowNum(), "questionCode", "Q10_ADDED");
            set(workbook, "Questions", added.getRowNum(), "questionText", "New question from Excel");
        });
        var response = new MaturityModelController(modelService(), excel).parseEditorUpload(upload(edited), 8L);
        assertEquals(200, response.getStatusCode().value(), response.getBody().getErrorDetails());
        var doc = response.getBody().getDocument();
        assertEquals("Edited model", doc.getName());
        assertFalse(doc.getAutoEvaluated());
        var dimension = doc.getDimensions().getFirst();
        assertEquals("Renamed dimension", dimension.getName());
        var module = dimension.getModules().getFirst();
        assertEquals(6.5, module.getWeight());
        var practice = module.getPractices().getFirst();
        assertFalse(practice.getRequiresEvidence());
        assertEquals(3, practice.getQuestions().size());
        assertEquals("Edited question", practice.getQuestions().getFirst().getText());
        assertTrue(practice.getQuestions().getFirst().getBooleanCorrectAnswer());
        assertEquals("Q10_ADDED", practice.getQuestions().getLast().getCode());
    }

    @Test
    void structuralSheetOrder_isPreservedEvenWhenQuestionRowsAreReversed() throws Exception {
        byte[] edited = edit(excel.exportMaturityModelToXlsx(model()), workbook -> {
            Sheet questions = workbook.getSheet("Questions");
            List<List<String>> rows = new ArrayList<>();
            DataFormatter formatter = new DataFormatter();
            for (int r = 1; r <= questions.getLastRowNum(); r++) {
                List<String> values = new ArrayList<>();
                for (Cell cell : questions.getRow(r)) values.add(formatter.formatCellValue(cell));
                rows.add(values);
            }
            Collections.reverse(rows);
            for (int r = 0; r < rows.size(); r++) {
                for (int c = 0; c < rows.get(r).size(); c++) questions.getRow(r + 1).getCell(c).setCellValue(rows.get(r).get(c));
            }
        });
        var parsed = excel.parseExcelWorkbook(new ByteArrayInputStream(edited));
        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
        var dimensions = parsed.getMaturityModel().getDimensions();
        assertEquals(List.of("dimension_1", "dimension_2"), dimensions.stream().map(DimensionDTO::getId).toList());
        assertEquals(List.of("PM_CORE", "PM_ADV"), dimensions.getFirst().getModules().stream().map(ModuleDTO::getCode).toList());
        assertEquals(List.of("P2_PM", "P3_PML"), dimensions.getFirst().getModules().getLast().getPractices().stream().map(PracticeDTO::getCode).toList());
    }

    @Test
    void zeroQuestionWeightIsAcceptedOnlyForOptionalQuestions() throws Exception {
        for (boolean required : List.of(false, true)) {
            byte[] bytes = edit(excel.exportMaturityModelToXlsx(model()), workbook -> {
                set(workbook, "Questions", 1, "questionWeight", "0");
                set(workbook, "Questions", 1, "questionRequired", Boolean.toString(required));
            });
            var parsed = excel.parseExcelWorkbook(new ByteArrayInputStream(bytes));
            assertEquals(!required, parsed.isSuccess(), parsed.getErrorDetails());
            if (!required) {
                assertEquals(0.0, parsed.getMaturityModel().getDimensions().getFirst().getModules().getFirst()
                        .getPractices().getFirst().getQuestions().getFirst().getWeight());
            }
        }
    }

    @Test
    void invalidEdits_returnActionableErrors() throws Exception {
        for (String[] change : List.of(
                new String[]{"Model", "modelAggregationRule", "invalid", "modelAggregationRule"},
                new String[]{"Dimensions", "dimensionMappingRules", "not JSON", "dimensionMappingRules"},
                new String[]{"Practices", "practiceGatingRules", "[{\"order\":0,\"selection\":\"specificChild\",\"childCode\":\"UNKNOWN\",\"operator\":\"<\",\"threshold\":0.5,\"operation\":\"set\",\"value\":0}]", "immediate child"},
                new String[]{"Questions", "questionBooleanCorrectAnswer", "maybe", "questionBooleanCorrectAnswer"},
                new String[]{"Questions", "questionWeight", "-1", "questionWeight"},
                new String[]{"Levels", "number", "1.4", "level numbers"},
                new String[]{"Questions", "practiceCode", "MISSING", "practice not found"})) {
            byte[] bytes = edit(excel.exportMaturityModelToXlsx(model()), workbook -> set(workbook, change[0], 1, change[1], change[2]));
            var response = new MaturityModelController(modelService(), excel).parseEditorUpload(upload(bytes), 8L);
            assertEquals(400, response.getStatusCode().value());
            assertFalse(response.getBody().isSuccess());
            assertTrue(response.getBody().getErrorDetails().contains(change[3]), response.getBody().getErrorDetails());
        }
    }

    @Test
    void duplicateOrUnreferencedStructureRows_areRejectedInsteadOfDiscarded() throws Exception {
        for (boolean duplicate : List.of(true, false)) {
            byte[] bytes = edit(excel.exportMaturityModelToXlsx(model()), workbook -> {
                Sheet practices = workbook.getSheet("Practices");
                Row added = practices.createRow(practices.getLastRowNum() + 1);
                for (Cell cell : practices.getRow(1)) added.createCell(cell.getColumnIndex()).setCellValue(new DataFormatter().formatCellValue(cell));
                if (!duplicate) set(workbook, "Practices", added.getRowNum(), "practiceCode", "P_ORPHAN");
            });
            var parsed = excel.parseExcelWorkbook(new ByteArrayInputStream(bytes));
            assertFalse(parsed.isSuccess());
            assertTrue(parsed.getErrorDetails().contains("duplicate or unreferenced"));
        }
    }

    @Test
    void exportEndpoint_returnsADownloadableWorkbook() throws Exception {
        MaturityModelService service = mock(MaturityModelService.class);
        when(service.getMaturityModelById(7L)).thenReturn(model());
        var response = new MaturityModelController(service, excel).exportMaturityModelAsXlsx(7L);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("attachment; filename=\"maturity-model-7.xlsx\"", response.getHeaders().getFirst("Content-Disposition"));
        assertEquals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", response.getHeaders().getContentType().toString());
        var parsed = excel.parseExcelWorkbook(new ByteArrayInputStream(response.getBody()));
        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
    }

    @Test
    void legacyWorkbooks_withoutNewColumns_stillImportWithDefaults() throws Exception {
        byte[] legacy = edit(excel.exportMaturityModelToXlsx(model()), workbook -> {
            for (String[] columns : List.of(
                    new String[]{"Model", "modelAggregationRule", "modelChangelogMarkdown"},
                    new String[]{"Levels", "description"},
                    new String[]{"Dimensions", "dimensionDescription", "dimensionWeight", "dimensionAggregationRule", "dimensionMappingRules", "dimensionGatingRules"},
                    new String[]{"Modules", "moduleWeight", "moduleAggregationRule", "moduleGatingRules"},
                    new String[]{"Practices", "practiceWeight", "practiceAggregationRule", "practiceGatingRules", "practiceRequiresEvidence"},
                    new String[]{"Questions", "questionBooleanCorrectAnswer"})) {
                for (Cell cell : workbook.getSheet(columns[0]).getRow(0)) {
                    if (java.util.Arrays.asList(columns).subList(1, columns.length).contains(cell.getStringCellValue())) cell.setBlank();
                }
            }
        });
        var response = new MaturityModelController(modelService(), excel).parseEditorUpload(upload(legacy), 8L);
        assertEquals(200, response.getStatusCode().value(), response.getBody().getErrorDetails());
        var doc = response.getBody().getDocument();
        assertEquals(AggregationRule.WEIGHTED_AVERAGE, doc.getAggregationRule());
        assertEquals("", doc.getChangelogMarkdown());
        var dim = doc.getDimensions().getFirst();
        assertEquals(1.0, dim.getWeight());
        var module = dim.getModules().getFirst();
        assertEquals(1.0, module.getWeight());
        var practice = module.getPractices().getFirst();
        assertEquals(1.0, practice.getWeight());
        assertFalse(practice.getRequiresEvidence());
        assertTrue(practice.getQuestions().getFirst().getBooleanCorrectAnswer());
    }

    @Test
    void editedWorkbook_canDeleteQuestionsAndChangeCodesWithReferences() throws Exception {
        byte[] edited = edit(excel.exportMaturityModelToXlsx(model()), workbook -> {
            Sheet questions = workbook.getSheet("Questions");
            questions.removeRow(questions.getRow(questions.getLastRowNum()));
            set(workbook, "Questions", 1, "questionCode", "Q1_REVISED");
            set(workbook, "Questions", 2, "dependsOnQuestionCode", "Q1_REVISED");
            set(workbook, "Practices", 1, "practiceGatingRules", "[{\"order\":0,\"selection\":\"specificChild\",\"childCode\":\"Q1_REVISED\",\"operator\":\"<\",\"threshold\":0.5,\"operation\":\"set\",\"value\":0}]");
        });
        var response = new MaturityModelController(modelService(), excel).parseEditorUpload(upload(edited), 8L);
        assertEquals(200, response.getStatusCode().value(), response.getBody().getErrorDetails());
        var dimensions = response.getBody().getDocument().getDimensions();
        var practice = dimensions.getFirst().getModules().getFirst().getPractices().getFirst();
        assertEquals("Q1_REVISED", practice.getQuestions().getFirst().getCode());
        assertEquals("Q1_REVISED", practice.getQuestions().getLast().getDependsOnQuestionCode());
        assertEquals("Q1_REVISED", practice.getGatingRules().getFirst().getChildCode());
        assertEquals(3, dimensions.getLast().getModules().getLast().getPractices().getFirst().getQuestions().size());
    }

    @Test
    void reorderedLevels_keepTheirNumbersAndNames() throws Exception {
        byte[] edited = edit(excel.exportMaturityModelToXlsx(model()), workbook -> {
            set(workbook, "Levels", 1, "number", "5");
            set(workbook, "Levels", 1, "name", "Optimised");
            set(workbook, "Levels", 5, "number", "1");
            set(workbook, "Levels", 5, "name", "Not Implemented");
        });
        var response = new MaturityModelController(modelService(), excel).parseEditorUpload(upload(edited), 8L);
        assertEquals(200, response.getStatusCode().value(), response.getBody().getErrorDetails());
        var levels = response.getBody().getDocument().getLevels();
        assertEquals(1, levels.getFirst().getNumber());
        assertEquals("Not Implemented", levels.getFirst().getName());
        assertEquals(5, levels.getLast().getNumber());
        assertEquals("Optimised", levels.getLast().getName());
    }

    @Test
    void downloadableTemplate_matchesExportHeadersAndLoadsIntoEditor() throws Exception {
        Path template = Path.of("../frontend/public/templates/maturity-model-template.xlsx");
        byte[] bytes = Files.readAllBytes(template);
        var response = new MaturityModelController(modelService(), excel).parseEditorUpload(upload(bytes), 8L);
        assertEquals(200, response.getStatusCode().value(), response.getBody().getErrorDetails());
        assertFalse(response.getBody().getDocument().getAutoEvaluated(), "The open-answer template must be saveable with manual evaluation");
        try (Workbook actual = WorkbookFactory.create(new ByteArrayInputStream(bytes));
             Workbook expected = WorkbookFactory.create(new ByteArrayInputStream(excel.exportMaturityModelToXlsx(model())))) {
            DataFormatter formatter = new DataFormatter();
            for (String name : List.of("Model", "Levels", "Dimensions", "Modules", "Practices", "Questions")) {
                Row actualHeader = actual.getSheet(name).getRow(0);
                Row expectedHeader = expected.getSheet(name).getRow(0);
                assertEquals(expectedHeader.getLastCellNum(), actualHeader.getLastCellNum(), name);
                for (int c = 0; c < expectedHeader.getLastCellNum(); c++) assertEquals(formatter.formatCellValue(expectedHeader.getCell(c)), formatter.formatCellValue(actualHeader.getCell(c)), name);
            }
            assertNotNull(actual.getSheet("Instructions"));
        }
        var types = response.getBody().getDocument().getDimensions().stream().flatMap(d -> d.getModules().stream())
                .flatMap(m -> m.getPractices().stream()).flatMap(p -> p.getQuestions().stream()).map(MaturityModelEditorDTO.EditorQuestionDTO::getType).collect(java.util.stream.Collectors.toSet());
        assertEquals(java.util.Set.of("boolean", "likert", "open_answer", "multiple_choice", "multiple_selection", "numeric", "percentage"), types);
    }

    private static MockMultipartFile upload(byte[] bytes) {
        return new MockMultipartFile("file", "model.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    }

    private static byte[] edit(byte[] bytes, Consumer<Workbook> edit) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes)); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            edit.accept(workbook);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private static void set(Workbook workbook, String sheetName, int row, String header, String value) {
        Sheet sheet = workbook.getSheet(sheetName);
        for (Cell cell : sheet.getRow(0)) {
            if (header.equals(cell.getStringCellValue())) {
                sheet.getRow(row).getCell(cell.getColumnIndex(), Row.MissingCellPolicy.CREATE_NULL_AS_BLANK).setCellValue(value);
                return;
            }
        }
        fail("Missing header: " + header);
    }
}
