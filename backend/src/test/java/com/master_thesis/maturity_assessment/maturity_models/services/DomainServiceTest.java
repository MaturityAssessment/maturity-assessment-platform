package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.CreateDomainRequest;
import com.master_thesis.maturity_assessment.maturity_models.dto.DomainDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.UpdateDomainAppearanceRequest;
import com.master_thesis.maturity_assessment.maturity_models.models.Domain;
import com.master_thesis.maturity_assessment.maturity_models.repository.DomainRepository;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DomainServiceTest {
    private DomainService service;
    private DomainRepository domainRepository;
    private MaturityModelRepository maturityModelRepository;

    @BeforeEach
    void setUp() {
        service = new DomainService();
        domainRepository = mock(DomainRepository.class);
        maturityModelRepository = mock(MaturityModelRepository.class);
        ReflectionTestUtils.setField(service, "domainRepository", domainRepository);
        ReflectionTestUtils.setField(
                service, "maturityModelRepository", maturityModelRepository);
        when(domainRepository.save(any(Domain.class)))
                .thenAnswer(invocation -> {
                    Domain domain = invocation.getArgument(0);
                    if (domain.getId() == null) {
                        domain.setId(1L);
                    }
                    return domain;
                });
    }

    @Test
    void createDomainAssignsSuggestedIconAndDeterministicColor() {
        CreateDomainRequest request = request("Cyber security", null, null);

        var created = service.createDomain(request);

        assertEquals("shield", created.getIconKey());
        assertEquals("emerald", created.getColorKey());
    }

    @Test
    void createDomainPreservesCuratedManualAppearance() {
        CreateDomainRequest request = request("Cyber security", "compass", "violet");

        var created = service.createDomain(request);

        assertEquals("compass", created.getIconKey());
        assertEquals("violet", created.getColorKey());
    }

    @Test
    void createDomainRejectsUnknownAppearanceIdentifiers() {
        assertThrows(
                IllegalOperationException.class,
                () -> service.createDomain(request("Domain", "custom-svg", "blue")));
    }

    @Test
    void updateDomainAppearanceChangesOnlyCuratedAppearance() {
        Domain domain = new Domain();
        domain.setId(9L);
        domain.setName("Security");
        domain.setDescription("Keep this description");
        domain.setIconKey("shield");
        domain.setColorKey("blue");
        when(domainRepository.findById(9L)).thenReturn(java.util.Optional.of(domain));

        UpdateDomainAppearanceRequest request = new UpdateDomainAppearanceRequest();
        request.setIconKey("compass");
        request.setColorKey("violet");

        DomainDTO updated = service.updateDomainAppearance(9L, request);

        assertEquals("compass", updated.getIconKey());
        assertEquals("violet", updated.getColorKey());
        assertEquals("Security", updated.getName());
        assertEquals("Keep this description", updated.getDescription());
    }

    @Test
    void updateDomainAppearanceRejectsUnknownIcon() {
        Domain domain = new Domain();
        domain.setId(9L);
        when(domainRepository.findById(9L)).thenReturn(java.util.Optional.of(domain));
        UpdateDomainAppearanceRequest request = new UpdateDomainAppearanceRequest();
        request.setIconKey("custom-svg");
        request.setColorKey("blue");

        assertThrows(
                IllegalOperationException.class,
                () -> service.updateDomainAppearance(9L, request));
    }

    @Test
    void getAllDomainsUsesDistinctModelLineageCountFromAggregate() {
        Domain domain = new Domain();
        domain.setId(7L);
        domain.setName("Security");
        when(domainRepository.findAll()).thenReturn(List.of(domain));
        when(maturityModelRepository.aggregateModelStatsByDomain())
                .thenReturn(List.<Object[]>of(new Object[] {7L, 2L, 1}));

        List<DomainDTO> domains = service.getAllDomains();

        assertEquals(1, domains.size());
        assertEquals(2, domains.get(0).getMaturityModelCount());
        assertEquals(true, domains.get(0).isHasActiveMaturityModel());
    }

    private static CreateDomainRequest request(
            String name, String iconKey, String colorKey) {
        CreateDomainRequest request = new CreateDomainRequest();
        request.setName(name);
        request.setIconKey(iconKey);
        request.setColorKey(colorKey);
        return request;
    }
}
