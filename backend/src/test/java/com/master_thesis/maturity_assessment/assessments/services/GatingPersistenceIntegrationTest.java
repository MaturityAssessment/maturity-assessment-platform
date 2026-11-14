package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.models.*;
import com.master_thesis.maturity_assessment.maturity_models.models.Dimension;
import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import com.master_thesis.maturity_assessment.maturity_models.models.Module;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Requires an explicitly configured disposable database: Hibernate creates its schema. */
@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"})
@EnabledIfEnvironmentVariable(named = "GATING_PERSISTENCE_TEST", matches = "true")
class GatingPersistenceIntegrationTest {
    @Autowired EntityManager entities;

    @Test
    void completionThresholdsAndWithheldSnapshotSurviveReload() {
        Dimension dimension = new Dimension();
        dimension.setDimensionId("D1"); dimension.setName("Dimension");
        dimension.setMinimumCoverage(82.5); dimension.setMinimumIncludedCount(60.0);
        entities.persist(dimension);
        Module module = new Module(); module.setCode("M1"); module.setName("Module"); module.setDimension(dimension);
        module.setMinimumCoverage(90.0); module.setMinimumIncludedCount(75.0); entities.persist(module);
        Practice practice = new Practice(); practice.setCode("P1"); practice.setName("Practice"); practice.setModule(module);
        practice.setMinimumCoverage(99.0); practice.setMinimumIncludedCount(80.0); entities.persist(practice);
        var snapshot = new AssessmentElementResult("practice", "D1", "M1", "P1", null, null, "Practice",
                "withheld", null, 50, 25);
        Assessment assessment = new Assessment();
        assessment.setStatus(AssessmentStatus.COMPLETED); assessment.setScoreState("withheld");
        assessment.setCoverage(0.0); assessment.setIncludedCount(0.0); assessment.setElementResults(List.of(snapshot));
        entities.persist(assessment);
        DimensionResult result = new DimensionResult();
        result.setAssessment(assessment); result.setDimensionId("D1"); result.setDimensionName("Dimension");
        result.setDimensionDescription(""); result.setTotalQuestions(2); result.setTotalScore(0.0);
        result.setScoreState("withheld"); result.setCoverage(25.0); result.setIncludedCount(50.0); entities.persist(result);
        entities.flush(); entities.clear();
        assertEquals(82.5, entities.find(Dimension.class, dimension.getId()).getMinimumCoverage());
        assertEquals(60.0, entities.find(Dimension.class, dimension.getId()).getMinimumIncludedCount());
        assertEquals(90.0, entities.find(Module.class, module.getId()).getMinimumCoverage());
        assertEquals(80.0, entities.find(Practice.class, practice.getId()).getMinimumIncludedCount());
        Assessment reloaded = entities.find(Assessment.class, assessment.getId());
        assertEquals(List.of(snapshot), reloaded.getElementResults());
        assertNull(reloaded.getOverallAverage()); assertNull(reloaded.getOverallMaturityLevel());
        DimensionResult reloadedDimension = entities.find(DimensionResult.class, result.getId());
        assertEquals("withheld", reloadedDimension.getScoreState()); assertEquals(25.0, reloadedDimension.getCoverage());
        assertNull(reloadedDimension.getAverageScore()); assertNull(reloadedDimension.getMaturityLevel());
    }
}
