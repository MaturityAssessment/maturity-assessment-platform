package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.DimensionDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.ModuleDTO;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ModuleRelationshipsTest {
    record Fixture(String name, List<ModuleDTO> modules, String error) {}

    @Test
    void sharedFixturesAgreeWithFrontendOnVisibilityAndIndirectConflicts() throws Exception {
        List<Fixture> fixtures = new ObjectMapper().readValue(Files.readString(
                Path.of("../tests/fixtures/module-relationships.json")), new TypeReference<>() {});
        for (Fixture fixture : fixtures) {
            DimensionDTO dimension = new DimensionDTO();
            dimension.setModules(fixture.modules());
            if (fixture.error() == null) assertDoesNotThrow(() -> ModuleRelationships.validate(List.of(dimension)), fixture.name());
            else assertEquals(fixture.error(), assertThrows(IllegalOperationException.class,
                    () -> ModuleRelationships.validate(List.of(dimension)), fixture.name()).getErrorCode(), fixture.name());
        }
    }

    @Test
    void normalizesOneSidedCaseInsensitiveEdgesToBothEndpoints() {
        ModuleDTO a = module("A"), b = module("B"), c = module("C");
        a.setCoRequisiteModuleCodes(List.of("b"));
        b.setMutexModuleCodes(List.of("c"));
        DimensionDTO dimension = new DimensionDTO();
        dimension.setModules(List.of(a, b, c));
        ModuleRelationships.validate(List.of(dimension));
        assertEquals(List.of("B"), a.getCoRequisiteModuleCodes());
        assertEquals(List.of("A"), b.getCoRequisiteModuleCodes());
        assertEquals(List.of("C"), b.getMutexModuleCodes());
        assertEquals(List.of("B"), c.getMutexModuleCodes());
    }

    @Test
    void edgesCannotResolveAgainstAnotherDimension() {
        DimensionDTO first = new DimensionDTO(), second = new DimensionDTO();
        ModuleDTO a = module("A"), b = module("B");
        a.setMutexModuleCodes(List.of("B"));
        first.setModules(List.of(a)); second.setModules(List.of(b));
        assertEquals("INVALID_MODULE_RELATIONSHIPS", assertThrows(IllegalOperationException.class,
                () -> ModuleRelationships.validate(List.of(first, second))).getErrorCode());
    }

    private ModuleDTO module(String code) {
        ModuleDTO module = new ModuleDTO();
        module.setCode(code); module.setName(code); module.setVisible(false);
        return module;
    }
}
