package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.maturity_models.dto.CsvUploadResponse;
import com.master_thesis.maturity_assessment.maturity_models.dto.DimensionDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityLevelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.ModuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.PracticeDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionChoiceDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.QuestionDTO;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MaturityModelExcelServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CsvParsingService csvParsingService = new CsvParsingService(objectMapper);
    private final MaturityModelExcelService excelService = new MaturityModelExcelService(csvParsingService, objectMapper);

    @Test
    void exportThenImport_shouldPreserveStructure() throws Exception {
        MaturityModelDTO model = buildSampleModel();
        model.setLevels(sampleFiveLevels());

        byte[] xlsx = excelService.exportMaturityModelToXlsx(model);
        CsvUploadResponse parsed = excelService.parseExcelWorkbook(new ByteArrayInputStream(xlsx));

        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
        assertNotNull(parsed.getMaturityModel());
        assertEquals(model.getName(), parsed.getMaturityModel().getName());
        assertEquals(model.getDescription(), parsed.getMaturityModel().getDescription());
        assertEquals(1, parsed.getMaturityModel().getDimensions().size());
        assertEquals(1, parsed.getMaturityModel().getDimensions().get(0).getModules().size());
        assertEquals(1, parsed.getMaturityModel().getDimensions().get(0).getModules().get(0).getPractices().size());
        assertEquals(2, parsed.getMaturityModel().getDimensions().get(0).getModules().get(0).getPractices().get(0).getQuestions().size());
        assertEquals(5, parsed.getMaturityModel().getLevels().size());
        assertFalse(Boolean.TRUE.equals(parsed.getMaturityModel().getIsActive()));

        var questions = parsed.getMaturityModel().getDimensions().get(0).getModules().get(0).getPractices().get(0).getQuestions();
        QuestionDTO in1 = model.getDimensions().get(0).getModules().get(0).getPractices().get(0).getQuestions().get(0);
        QuestionDTO in2 = model.getDimensions().get(0).getModules().get(0).getPractices().get(0).getQuestions().get(1);
        QuestionDTO out1 = questions.get(0);
        QuestionDTO out2 = questions.get(1);
        assertEquals(in1.getHelp(), out1.getHelp());
        assertEquals(in1.getRequiresEvidence(), out1.getRequiresEvidence());
        assertEquals(in1.getRequired(), out1.getRequired());
        assertEquals(in2.getHelp(), out2.getHelp());
        assertEquals(in2.getRequiresEvidence(), out2.getRequiresEvidence());
        assertEquals(in2.getRequired(), out2.getRequired());
    }

    @Test
    void export_modulesAndPracticesSheets_useMinimalHeadersOnly() throws Exception {
        byte[] xlsx = excelService.exportMaturityModelToXlsx(buildOfficialTemplateModel());
        DataFormatter fmt = new DataFormatter();
        try (Workbook wb = WorkbookFactory.create(new ByteArrayInputStream(xlsx))) {
            assertEquals(
                    List.of("modelName", "modelDescription", "modelAutoEvaluated"),
                    headerRowValues(wb.getSheet(MaturityModelExcelService.SHEET_MODEL), fmt));
            assertEquals(
                    List.of("dimensionId", "moduleCode", "moduleName", "moduleDescription"),
                    headerRowValues(wb.getSheet(MaturityModelExcelService.SHEET_MODULES), fmt));
            assertEquals(
                    List.of("dimensionId", "moduleCode", "practiceCode", "practiceName", "practiceDescription"),
                    headerRowValues(wb.getSheet(MaturityModelExcelService.SHEET_PRACTICES), fmt));
            assertEquals(
                    MaturityModelExcelService.QUESTION_EXPORT_HEADERS,
                    headerRowValues(wb.getSheet(MaturityModelExcelService.SHEET_QUESTIONS), fmt));
        }
    }

    private static List<String> headerRowValues(Sheet sheet, DataFormatter fmt) {
        Row row = sheet.getRow(0);
        assertNotNull(row);
        List<String> out = new ArrayList<>();
        short last = row.getLastCellNum();
        for (int c = 0; c < last; c++) {
            if (row.getCell(c) == null) {
                break;
            }
            out.add(fmt.formatCellValue(row.getCell(c)).trim());
        }
        return out;
    }

    @Test
    void exportThenImport_scaleConfiguration_roundTrips() throws Exception {
        QuestionDTO likert = new QuestionDTO();
        likert.setWeight(1.0);
        likert.setText("Rate this");
        likert.setType("likert");
        likert.setScalePointCount(7);
        likert.setScaleMinLabel("Never");
        likert.setScaleMaxLabel("Always");
        likert.setScaleHighPointIsMaximum(false);

        QuestionDTO numeric = new QuestionDTO();
        numeric.setWeight(1.0);
        numeric.setText("How many?");
        numeric.setType("numeric");
        numeric.setRangeMin(-10);
        numeric.setRangeMax(50);
        numeric.setRangeHighValueIsMaximum(false);

        PracticeDTO practice = new PracticeDTO();
        practice.setId(1L);
        practice.setName("P");
        practice.setWeight(1.0);
        practice.setQuestions(List.of(likert, numeric));

        ModuleDTO module = new ModuleDTO();
        module.setCode("M1");
        module.setName("Mod");
        module.setWeight(1.0);
        module.setPractices(List.of(practice));

        DimensionDTO dimension = new DimensionDTO();
        dimension.setId("d1");
        dimension.setName("Dim");
        dimension.setDescription("D");
        dimension.setModules(List.of(module));

        MaturityModelDTO model = new MaturityModelDTO();
        model.setName("Likert model");
        model.setDescription("desc");
        model.setIsActive(true);
        model.setAutoEvaluated(true);
        model.setLevels(sampleFiveLevels());
        model.setDimensions(List.of(dimension));

        byte[] xlsx = excelService.exportMaturityModelToXlsx(model);
        CsvUploadResponse parsed = excelService.parseExcelWorkbook(new ByteArrayInputStream(xlsx));
        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
        assertFalse(Boolean.TRUE.equals(parsed.getMaturityModel().getIsActive()));
        QuestionDTO out = parsed.getMaturityModel().getDimensions().get(0).getModules().get(0).getPractices().get(0).getQuestions().get(0);
        assertEquals("likert", out.getType());
        assertEquals(7, out.getScalePointCount());
        assertEquals("Never", out.getScaleMinLabel());
        assertEquals("Always", out.getScaleMaxLabel());
        assertFalse(out.getScaleHighPointIsMaximum());
        QuestionDTO numericOut = parsed.getMaturityModel().getDimensions().get(0).getModules().get(0)
                .getPractices().get(0).getQuestions().get(1);
        assertEquals("numeric", numericOut.getType());
        assertEquals(-10, numericOut.getRangeMin());
        assertEquals(50, numericOut.getRangeMax());
        assertFalse(numericOut.getRangeHighValueIsMaximum());
    }

    @Test
    void exportThenImport_multipleChoice_roundTrips() throws Exception {
        QuestionChoiceDTO c1 = new QuestionChoiceDTO();
        c1.setLabel("Low");
        c1.setScore(0.0);
        QuestionChoiceDTO c2 = new QuestionChoiceDTO();
        c2.setLabel("High");
        c2.setScore(1.0);

        QuestionDTO mcq = new QuestionDTO();
        mcq.setWeight(1.0);
        mcq.setText("Pick a level");
        mcq.setType("multiple_choice");
        mcq.setHelp("JSON export");
        mcq.setRequiresEvidence(false);
        mcq.setRequired(false);
        mcq.setChoices(List.of(c1, c2));

        PracticeDTO practice = new PracticeDTO();
        practice.setId(1L);
        practice.setName("P");
        practice.setWeight(1.0);
        practice.setQuestions(List.of(mcq));

        ModuleDTO module = new ModuleDTO();
        module.setCode("M1");
        module.setName("Mod");
        module.setWeight(1.0);
        module.setPractices(List.of(practice));

        DimensionDTO dimension = new DimensionDTO();
        dimension.setId("d1");
        dimension.setName("Dim");
        dimension.setDescription("D");
        dimension.setModules(List.of(module));

        MaturityModelDTO model = new MaturityModelDTO();
        model.setName("MCQ model");
        model.setDescription("desc");
        model.setIsActive(true);
        model.setAutoEvaluated(true);
        model.setLevels(sampleFiveLevels());
        model.setDimensions(List.of(dimension));

        byte[] xlsx = excelService.exportMaturityModelToXlsx(model);
        CsvUploadResponse parsed = excelService.parseExcelWorkbook(new ByteArrayInputStream(xlsx));
        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
        assertFalse(Boolean.TRUE.equals(parsed.getMaturityModel().getIsActive()));
        QuestionDTO out = parsed.getMaturityModel().getDimensions().get(0).getModules().get(0).getPractices().get(0).getQuestions().get(0);
        assertEquals("multiple_choice", out.getType());
        assertNotNull(out.getChoices());
        assertEquals(2, out.getChoices().size());
        assertEquals("Low", out.getChoices().get(0).getLabel());
        assertEquals(0.0, out.getChoices().get(0).getScore());
        assertEquals("High", out.getChoices().get(1).getLabel());
        assertEquals(1.0, out.getChoices().get(1).getScore());
    }

    @Test
    void import_withLegacyOptionalModuleColumn_succeeds() throws Exception {
        MaturityModelDTO model = buildSampleModel();
        model.setLevels(sampleFiveLevels());
        byte[] xlsx = excelService.exportMaturityModelToXlsx(model);
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsx))) {
            Sheet mod = wb.getSheet("Modules");
            Row h = mod.getRow(0);
            int last = Math.max(h.getLastCellNum(), 0);
            h.createCell(last).setCellValue("dimensionName");
            Row data = mod.getRow(1);
            if (data != null) {
                data.createCell(last).setCellValue("legacy-redundant-name");
            }
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            xlsx = bos.toByteArray();
        }
        CsvUploadResponse parsed = excelService.parseExcelWorkbook(new ByteArrayInputStream(xlsx));
        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
    }

    @Test
    void import_legacyModelIsActiveColumn_isIgnored_modelStaysInactive() throws Exception {
        MaturityModelDTO model = buildSampleModel();
        model.setLevels(sampleFiveLevels());
        byte[] xlsx = excelService.exportMaturityModelToXlsx(model);
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsx))) {
            Sheet modelSheet = wb.getSheet(MaturityModelExcelService.SHEET_MODEL);
            Row header = modelSheet.getRow(0);
            Row data = modelSheet.getRow(1);
            int col = 3;
            header.createCell(col).setCellValue("modelIsActive");
            data.createCell(col).setCellValue(true);
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            xlsx = bos.toByteArray();
        }
        CsvUploadResponse parsed = excelService.parseExcelWorkbook(new ByteArrayInputStream(xlsx));
        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
        assertFalse(Boolean.TRUE.equals(parsed.getMaturityModel().getIsActive()));
    }

    @Test
    void import_missingSheet_returnsError() throws Exception {
        byte[] bad;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            wb.createSheet("Model");
            wb.write(bos);
            bad = bos.toByteArray();
        }
        CsvUploadResponse parsed = excelService.parseExcelWorkbook(new ByteArrayInputStream(bad));
        assertFalse(parsed.isSuccess());
        assertNotNull(parsed.getErrorDetails());
        assertTrue(parsed.getErrorDetails().contains("Missing sheet"));
    }

    @Test
    void import_badPracticeFk_returnsError() throws Exception {
        MaturityModelDTO model = new MaturityModelDTO();
        model.setName("X");
        model.setDescription("Y");
        model.setIsActive(true);
        model.setAutoEvaluated(true);
        model.setLevels(sampleFiveLevels());

        DimensionDTO d = new DimensionDTO();
        d.setId("d1");
        d.setName("D");
        d.setDescription("dd");
        ModuleDTO m = new ModuleDTO();
        m.setCode("c1");
        m.setName("M");
        m.setWeight(1.0);
        PracticeDTO p = new PracticeDTO();
        p.setId(100L);
        p.setName("RealPractice");
        p.setWeight(1.0);
        QuestionDTO q = new QuestionDTO();
        q.setWeight(1.0);
        q.setText("Q");
        q.setType("boolean");
        p.setQuestions(List.of(q));
        m.setPractices(List.of(p));
        d.setModules(List.of(m));
        model.setDimensions(List.of(d));

        byte[] xlsx = excelService.exportMaturityModelToXlsx(model);

        try (var wb = WorkbookFactory.create(new ByteArrayInputStream(xlsx))) {
            var qs = wb.getSheet("Questions");
            var row = qs.getRow(1);
            var c = row.getCell(2);
            if (c == null) {
                c = row.createCell(2);
            }
            c.setCellValue(99999.0);
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            xlsx = bos.toByteArray();
        }

        CsvUploadResponse parsed = excelService.parseExcelWorkbook(new ByteArrayInputStream(xlsx));
        assertFalse(parsed.isSuccess());
        assertNotNull(parsed.getErrorDetails());
        assertTrue(parsed.getErrorDetails().contains("practice not found"));
    }

    @Test
    void import_noLevelsAndNoModelLevelsCell_usesDefaultFiveLevels() throws Exception {
        MaturityModelDTO model = new MaturityModelDTO();
        model.setName("Legacy");
        model.setDescription("desc");
        model.setIsActive(false);
        model.setAutoEvaluated(true);
        model.setLevels(null);

        DimensionDTO d = new DimensionDTO();
        d.setId("d1");
        d.setName("D");
        d.setDescription("dd");
        ModuleDTO m = new ModuleDTO();
        m.setCode("c1");
        m.setName("M");
        m.setWeight(1.0);
        PracticeDTO p = new PracticeDTO();
        p.setId(200L);
        p.setName("P");
        p.setWeight(1.0);
        QuestionDTO q = new QuestionDTO();
        q.setWeight(1.0);
        q.setText("Q");
        q.setType("boolean");
        p.setQuestions(List.of(q));
        m.setPractices(List.of(p));
        d.setModules(List.of(m));
        model.setDimensions(List.of(d));

        byte[] xlsx = excelService.exportMaturityModelToXlsx(model);

        CsvUploadResponse parsed = excelService.parseExcelWorkbook(new ByteArrayInputStream(xlsx));
        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
        assertEquals(5, parsed.getMaturityModel().getLevels().size());
        assertEquals("Not Implemented", parsed.getMaturityModel().getLevels().get(0).getName());
    }

    private MaturityModelDTO buildSampleModel() {
        QuestionDTO question1 = new QuestionDTO();
        question1.setWeight(3.0);
        question1.setText("Does it work, reliably?");
        question1.setType("LIKERT");
        question1.setHelp("Help text with \"quote\"");
        question1.setRequiresEvidence(true);
        question1.setRequired(false);

        QuestionDTO question2 = new QuestionDTO();
        question2.setWeight(5.0);
        question2.setText("Provide implementation notes");
        question2.setType("open_answer");
        question2.setHelp("Second help with comma, info");
        question2.setRequiresEvidence(false);
        question2.setRequired(true);

        PracticeDTO practice = new PracticeDTO();
        practice.setId(42L);
        practice.setName("Practice A");
        practice.setDescription("Practice description line1\nline2");
        practice.setWeight(2.0);
        practice.setQuestions(List.of(question1, question2));

        ModuleDTO module = new ModuleDTO();
        module.setCode("PM_CORE");
        module.setName("Core Module");
        module.setDescription("Module desc with comma, too");
        module.setWeight(1.5);
        module.setPractices(List.of(practice));

        DimensionDTO dimension = new DimensionDTO();
        dimension.setId("dimension_1");
        dimension.setName("Process Management");
        dimension.setDescription("How processes run");
        dimension.setModules(List.of(module));

        MaturityModelDTO model = new MaturityModelDTO();
        model.setName("My model");
        model.setDescription("Model with \"quotes\" and comma, ok");
        model.setIsActive(false);
        model.setAutoEvaluated(true);
        model.setDimensions(List.of(dimension));
        return model;
    }

    private static List<MaturityLevelDTO> sampleFiveLevels() {
        String[] names = {"Not Implemented", "Initial", "Managed", "Defined", "Optimised"};
        List<MaturityLevelDTO> list = new java.util.ArrayList<>();
        for (int i = 0; i < names.length; i++) {
            MaturityLevelDTO d = new MaturityLevelDTO();
            d.setNumber(i + 1);
            d.setName(names[i]);
            list.add(d);
        }
        return list;
    }

    /**
     * Run with {@code REGEN_TEMPLATE=true mvn test -Dtest=MaturityModelExcelServiceTest#regeneratePublicTemplateWhenEnvSet}
     * from the {@code backend} directory to refresh {@code frontend/public/templates/maturity-model-template.xlsx}.
     */
    @Test
    void regeneratePublicTemplateWhenEnvSet() throws Exception {
        if (!"true".equals(System.getenv("REGEN_TEMPLATE"))) {
            return;
        }
        MaturityModelDTO model = buildOfficialTemplateModel();
        byte[] bytes = excelService.exportMaturityModelToXlsx(model);
        Path out = Path.of("../frontend/public/templates/maturity-model-template.xlsx").toAbsolutePath().normalize();
        Files.createDirectories(out.getParent());
        Files.write(out, bytes);
    }

    /** Mirrors the former public CSV template content. */
    private static MaturityModelDTO buildOfficialTemplateModel() {
        MaturityModelDTO model = new MaturityModelDTO();
        model.setName("Your Maturity Model Name");
        model.setDescription("Description of what this maturity model assesses");
        model.setIsActive(false);
        model.setAutoEvaluated(true);
        model.setLevels(null);

        QuestionDTO q1 = q("boolean", "Are processes documented?",
                "Check if there are written process descriptions", false, true, null, null);
        q1.setCode("Q1_APD");
        QuestionDTO q2 = q("boolean", "Is there a designated process owner?",
                "Is someone specifically responsible for this process?", true, false, null, null);
        q2.setCode("Q2_ITADPO");
        q2.setDependsOnQuestionCode("Q1_APD");
        PracticeDTO pr1 = practice(1L, "Process Documentation",
                "Practices related to documenting processes", 1.0, List.of(q1, q2));
        pr1.setCode("P1_PD");

        QuestionDTO q3 = q("likert", "Are process metrics collected and analyzed?",
                "Rate on your model maturity scale (1 = lowest).", false, false, null, null);
        q3.setCode("Q3_APMCAA");
        QuestionDTO q4 = q("multiple_choice", "Which maturity level best describes this practice?",
                "Each option maps to a level number on your scale. Use JSON: array of {label level}.",
                false, false, mcqChoices(), null);
        q4.setCode("Q4_WMLBDTP");
        PracticeDTO pr3a = practice(2L, "Process Metrics",
                "Collecting and analyzing process metrics", 1.0, List.of(q3));
        pr3a.setCode("P2_PM");
        PracticeDTO pr3b = practice(3L, "Process Maturity Level",
                "Overall process maturity for this area", 1.0, List.of(q4));
        pr3b.setCode("P3_PML");

        QuestionDTO q5 = q("boolean", "Are quality standards defined?",
                "Are there clear quality criteria?", false, false, null, null);
        q5.setCode("Q5_AQSD");
        PracticeDTO pr5 = practice(4L, "Quality Standards Definition",
                "Defining quality standards", 1.0, List.of(q5));
        pr5.setCode("P4_QSD");

        QuestionDTO q6 = q("open_answer", "Describe your quality improvement initiatives",
                "Provide details about ongoing quality improvements", false, false, null, null);
        q6.setCode("Q6_DYQII");
        PracticeDTO pr6 = practice(5L, "Quality Review",
                "Review and audit procedures", 1.0, List.of(q6));
        pr6.setCode("P5_QR");

        ModuleDTO pmCore = mod("PM_CORE", "Core Process Practices",
                "Fundamental process management capabilities", 1.0, List.of(pr1));
        ModuleDTO pmAdv = mod("PM_ADV", "Advanced Process Practices",
                "Advanced process management and optimization", 1.5, List.of(pr3a, pr3b));
        ModuleDTO qaStd = mod("QA_STANDARDS", "Quality Standards",
                "Definition and application of quality standards", 1.0, List.of(pr5));
        ModuleDTO qaRev = mod("QA_REVIEW", "Quality Review Process",
                "Review and audit procedures for quality", 1.0, List.of(pr6));

        DimensionDTO dim1 = new DimensionDTO();
        dim1.setId("dimension_1");
        dim1.setName("Process Management");
        dim1.setDescription("How well processes are defined and managed");
        dim1.setModules(List.of(pmCore, pmAdv));

        DimensionDTO dim2 = new DimensionDTO();
        dim2.setId("dimension_2");
        dim2.setName("Quality Assurance");
        dim2.setDescription("Quality control and assurance practices");
        dim2.setModules(List.of(qaStd, qaRev));

        model.setDimensions(List.of(dim1, dim2));
        return model;
    }

    private static QuestionDTO q(
            String type, String text, String help,
            boolean requiresEvidence, boolean required,
            List<QuestionChoiceDTO> choices, Integer likertMax
    ) {
        QuestionDTO q = new QuestionDTO();
        q.setWeight(1.0);
        q.setText(text);
        q.setType(type);
        q.setHelp(help);
        q.setRequiresEvidence(requiresEvidence);
        q.setRequired(required);
        q.setChoices(choices);
        q.setScalePointCount(likertMax != null ? likertMax : 5);
        return q;
    }

    private static List<QuestionChoiceDTO> mcqChoices() {
        return List.of(
                choice("Initial / ad-hoc", 0.0),
                choice("Repeatable", 0.25),
                choice("Defined", 0.5),
                choice("Managed", 0.75),
                choice("Optimizing", 1.0)
        );
    }

    private static QuestionChoiceDTO choice(String label, double score) {
        QuestionChoiceDTO c = new QuestionChoiceDTO();
        c.setLabel(label);
        c.setScore(score);
        return c;
    }

    private static PracticeDTO practice(
            long id, String name, String description, double weight, List<QuestionDTO> questions
    ) {
        PracticeDTO p = new PracticeDTO();
        p.setId(id);
        p.setName(name);
        p.setDescription(description);
        p.setWeight(weight);
        p.setQuestions(questions);
        return p;
    }

    private static ModuleDTO mod(
            String code, String name, String description,
            double weight, List<PracticeDTO> practices
    ) {
        ModuleDTO m = new ModuleDTO();
        m.setCode(code);
        m.setName(name);
        m.setDescription(description);
        m.setWeight(weight);
        m.setPractices(practices);
        return m;
    }
}
