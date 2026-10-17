package com.master_thesis.maturity_assessment.maturity_models.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.maturity_models.dto.GatingRuleDTO;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import com.master_thesis.maturity_assessment.maturity_models.services.CsvParsingService;
import com.master_thesis.maturity_assessment.maturity_models.services.MaturityModelExcelService;
import com.master_thesis.maturity_assessment.maturity_models.services.MaturityModelService;
import jakarta.persistence.EntityManager;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Runs only when explicitly enabled against an existing disposable PostgreSQL schema. */
@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=false"
})
@EnabledIfEnvironmentVariable(named = "MODEL_EXCEL_INTEGRATION_TEST", matches = "true")
@Import({MaturityModelService.class, MaturityModelExcelService.class, CsvParsingService.class,
        MaturityModelExcelPersistenceIntegrationTest.JsonConfiguration.class})
class MaturityModelExcelPersistenceIntegrationTest {
    @TestConfiguration
    static class JsonConfiguration {
        @Bean ObjectMapper objectMapper() { return new ObjectMapper(); }
    }

    @Autowired private MaturityModelService models;
    @Autowired private MaturityModelExcelService excel;
    @Autowired private DomainRepository domains;
    @Autowired private EntityManager entityManager;

    @Test
    void persistedModel_canBeExportedEditedAndImportedAsANewVersion() throws Exception {
        var parsed = excel.parseExcelWorkbook(Files.newInputStream(Path.of("../frontend/public/templates/maturity-model-template.xlsx")));
        assertTrue(parsed.isSuccess(), parsed.getErrorDetails());
        Domain domain = new Domain();
        domain.setName("Excel integration " + UUID.randomUUID());
        domain.setIconKey("layers");
        domain.setColorKey("blue");
        domain = domains.saveAndFlush(domain);
        parsed.getMaturityModel().setDomainId(domain.getId());
        var editor = models.prepareEditorDocument(parsed.getMaturityModel());
        var dimension = editor.getDimensions().getFirst();
        dimension.setWeight(2.5);
        dimension.setAggregationRule(AggregationRule.MINIMUM);
        dimension.setGatingRules(List.of(gate(dimension.getModules().getFirst().getCode())));
        var module = dimension.getModules().getFirst();
        module.setWeight(3.5);
        module.setGatingRules(List.of(gate(module.getPractices().getFirst().getCode())));
        var practice = module.getPractices().getFirst();
        practice.setRequiresEvidence(true);
        practice.setWeight(4.5);
        practice.setGatingRules(List.of(gate(practice.getQuestions().getFirst().getCode())));
        practice.getQuestions().getFirst().setType("likert");
        practice.getQuestions().getFirst().setScalePointCount(5);
        var dependent = practice.getQuestions().get(1);
        dependent.setDependsOnQuestionCode(practice.getQuestions().getFirst().getCode());
        var condition = new com.master_thesis.maturity_assessment.maturity_models.dto.DependencyCondition();
        condition.setType("likert"); condition.setPoints(List.of(3, 4, 5));
        dependent.setDependencyCondition(condition);

        var original = models.createFromEditor(editor);
        entityManager.flush();
        entityManager.clear();
        var originalReloaded = models.getMaturityModelById(original.getId());
        assertEquals(List.of(3, 4, 5), originalReloaded.getDimensions().getFirst().getModules().getFirst()
                .getPractices().getFirst().getQuestions().get(1).getDependencyCondition().getPoints());
        byte[] exported = excel.exportMaturityModelToXlsx(models.getMaturityModelById(original.getId()));
        byte[] edited;
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(exported));
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.getSheet("Model").getRow(1).getCell(0).setCellValue("Edited workbook version");
            workbook.getSheet("Questions").getRow(1).getCell(6).setCellValue("Edited question from Excel");
            workbook.write(out);
            edited = out.toByteArray();
        }
        var imported = excel.parseExcelWorkbook(new ByteArrayInputStream(edited));
        assertTrue(imported.isSuccess(), imported.getErrorDetails());
        imported.getMaturityModel().setDomainId(domain.getId());
        var version = models.createVersionFromEditor(original.getId(), models.prepareEditorDocument(imported.getMaturityModel()));
        entityManager.flush();
        entityManager.clear();

        var reloaded = models.getMaturityModelById(version.getId());
        assertEquals(2, reloaded.getVersion());
        assertEquals(original.getId(), reloaded.getBaseModelId());
        assertFalse(reloaded.getIsActive());
        assertEquals("Edited workbook version", reloaded.getName());
        assertEquals(editor.getName(), models.getMaturityModelById(original.getId()).getName());
        var savedDimension = reloaded.getDimensions().getFirst();
        assertEquals(2.5, savedDimension.getWeight());
        assertEquals(AggregationRule.MINIMUM, savedDimension.getAggregationRule());
        assertEquals(dimension.getGatingRules(), savedDimension.getGatingRules());
        var savedModule = savedDimension.getModules().getFirst();
        assertEquals(3.5, savedModule.getWeight());
        assertEquals(module.getGatingRules(), savedModule.getGatingRules());
        var savedPractice = savedModule.getPractices().getFirst();
        assertEquals(4.5, savedPractice.getWeight());
        assertTrue(savedPractice.getRequiresEvidence());
        assertEquals(practice.getGatingRules(), savedPractice.getGatingRules());
        assertEquals("Edited question from Excel", savedPractice.getQuestions().getFirst().getText());
        assertEquals(condition, savedPractice.getQuestions().get(1).getDependencyCondition());
        assertEquals(savedPractice.getQuestions().getFirst().getCode(), savedPractice.getQuestions().getLast().getDependsOnQuestionCode());
        var quality = reloaded.getDimensions().getLast().getModules().getLast().getPractices().getFirst().getQuestions();
        assertFalse(quality.get(1).getRangeHighValueIsMaximum());
        assertEquals(50, quality.get(1).getRangeMax());
        assertEquals(100, quality.get(2).getRangeMax());
        assertEquals(List.of(2.0, 3.0), quality.getLast().getChoices().stream().map(choice -> choice.getRawValue()).toList());
    }

    private static GatingRuleDTO gate(String child) {
        GatingRuleDTO rule = new GatingRuleDTO();
        rule.setOrder(0);
        rule.setSelection(GatingSelection.SPECIFIC_CHILD);
        rule.setChildCode(child);
        rule.setOperator(GatingComparisonOperator.BELOW);
        rule.setThreshold(new BigDecimal("0.50"));
        rule.setOperation(GatingScoreOperation.SET);
        rule.setValue(new BigDecimal("0.00"));
        return rule;
    }
}
