package com.master_thesis.maturity_assessment.maturity_models.repository;

import com.master_thesis.maturity_assessment.maturity_models.models.Domain;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true"
})
class MaturityModelActivationPersistenceIntegrationTest {

    @Autowired
    private DomainRepository domainRepository;

    @Autowired
    private MaturityModelRepository maturityModelRepository;

    @Test
    void allowsDifferentModelLineagesToBeActiveInTheSameDomain() {
        Domain domain = saveDomain();

        MaturityModel firstLineage = saveRootModel(domain, true);
        MaturityModel secondLineage = saveRootModel(domain, true);

        assertNotNull(firstLineage.getId());
        assertNotNull(secondLineage.getId());
        assertTrue(firstLineage.getIsActive());
        assertTrue(secondLineage.getIsActive());
    }

    @Test
    void rejectsTwoActiveVersionsOfTheSameModelLineage() {
        Domain domain = saveDomain();
        MaturityModel root = saveRootModel(domain, true);

        MaturityModel secondVersion = model(domain, true, 2);
        secondVersion.setBaseModelId(root.getId());

        assertThrows(
                DataIntegrityViolationException.class,
                () -> maturityModelRepository.saveAndFlush(secondVersion)
        );
    }

    private Domain saveDomain() {
        Domain domain = new Domain();
        domain.setName("Activation integration test " + UUID.randomUUID());
        domain.setDescription("Domain used to verify maturity-model activation constraints.");
        domain.setIconKey("layers");
        domain.setColorKey("blue");
        return domainRepository.saveAndFlush(domain);
    }

    private MaturityModel saveRootModel(Domain domain, boolean active) {
        MaturityModel root = maturityModelRepository.saveAndFlush(model(domain, active, 1));
        root.setBaseModelId(root.getId());
        return maturityModelRepository.saveAndFlush(root);
    }

    private MaturityModel model(Domain domain, boolean active, int version) {
        MaturityModel model = new MaturityModel();
        model.setName("Activation integration test model " + UUID.randomUUID());
        model.setDescription("Model used to verify activation constraints.");
        model.setIsActive(active);
        model.setAutoEvaluated(true);
        model.setVersion(version);
        model.setDomain(domain);
        return model;
    }
}
