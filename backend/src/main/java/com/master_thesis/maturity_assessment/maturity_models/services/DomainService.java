package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.CreateDomainRequest;
import com.master_thesis.maturity_assessment.maturity_models.dto.DomainDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.UpdateDomainAppearanceRequest;
import com.master_thesis.maturity_assessment.maturity_models.models.Domain;
import com.master_thesis.maturity_assessment.maturity_models.repository.DomainRepository;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DomainService {

    private static final List<String> DOMAIN_COLORS =
            List.of("blue", "emerald", "violet", "amber", "rose", "slate");
    private static final Set<String> DOMAIN_ICONS =
            Set.of("layers", "shield", "code", "database", "users", "settings",
                    "compass", "chart", "cloud", "briefcase");

    @Autowired
    private DomainRepository domainRepository;

    @Autowired
    private MaturityModelRepository maturityModelRepository;

    public List<DomainDTO> getAllDomains() {
        Map<Long, DomainModelStats> stats = loadModelStatsByDomainId();
        return domainRepository.findAll().stream()
                .map(d -> toDto(d, stats))
                .collect(Collectors.toList());
    }

    public List<DomainDTO> getDomainsWithModels() {
        Map<Long, DomainModelStats> stats = loadModelStatsByDomainId();
        return domainRepository.findAll().stream()
                .filter(d -> stats.getOrDefault(d.getId(), DomainModelStats.ZERO).count() > 0)
                .map(d -> toDto(d, stats))
                .collect(Collectors.toList());
    }

    public DomainDTO getDomainById(Long id) {
        Domain domain = domainRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Domain not found with id: " + id));
        DomainDTO dto = toDtoWithoutStats(domain);
        dto.setMaturityModelCount(
                maturityModelRepository.countModelLineagesByDomainId(id));
        dto.setHasActiveMaturityModel(maturityModelRepository.existsByDomain_IdAndIsActiveTrue(id));
        return dto;
    }

    @Transactional
    public DomainDTO createDomain(CreateDomainRequest request) {
        // Validate domain name uniqueness
        if (domainRepository.existsByName(request.getName())) {
            throw new IllegalOperationException(
                "DOMAIN_NAME_EXISTS",
                "A domain with the name '" + request.getName() + "' already exists"
            );
        }

        // Create and save domain
        Domain domain = new Domain();
        domain.setName(request.getName());
        domain.setDescription(request.getDescription());
        validateAppearance(request.getIconKey(), request.getColorKey());
        domain.setIconKey(resolveIconKey(request.getIconKey(), request.getName()));
        domain.setColorKey(resolveColorKey(request.getColorKey(), request.getName()));
        
        Domain savedDomain = domainRepository.save(domain);
        return toDto(savedDomain, Map.of());
    }

    @Transactional
    public DomainDTO updateDomainAppearance(
            Long id, UpdateDomainAppearanceRequest request) {
        Domain domain = domainRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Domain not found with id: " + id));
        validateAppearance(request.getIconKey(), request.getColorKey());
        domain.setIconKey(request.getIconKey());
        domain.setColorKey(request.getColorKey());

        Domain savedDomain = domainRepository.save(domain);
        return getDomainById(savedDomain.getId());
    }

    @Transactional
    public void deleteDomain(Long id) {
        // Check if domain exists
        Domain domain = domainRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Domain not found with id: " + id));

        // Check if domain has associated maturity models
        List<com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel> associatedModels = 
                maturityModelRepository.findByDomainId(id);
        
        if (!associatedModels.isEmpty()) {
            throw new IllegalOperationException(
                "DOMAIN_HAS_ASSOCIATED_MODELS",
                "Cannot delete domain '" + domain.getName() + "' because it has " + 
                associatedModels.size() + " associated maturity model(s)"
            );
        }

        // Delete domain if no associations exist
        domainRepository.delete(domain);
    }

    private Map<Long, DomainModelStats> loadModelStatsByDomainId() {
        List<Object[]> rows = maturityModelRepository.aggregateModelStatsByDomain();
        Map<Long, DomainModelStats> map = new HashMap<>();
        for (Object[] row : rows) {
            Long domainId = (Long) row[0];
            long count = ((Number) row[1]).longValue();
            int maxActive = ((Number) row[2]).intValue();
            map.put(domainId, new DomainModelStats(count, maxActive > 0));
        }
        return map;
    }

    private DomainDTO toDtoWithoutStats(Domain domain) {
        DomainDTO dto = new DomainDTO();
        dto.setId(domain.getId());
        dto.setName(domain.getName());
        dto.setDescription(domain.getDescription());
        dto.setIconKey(resolveIconKey(domain.getIconKey(), domain.getName()));
        dto.setColorKey(resolveColorKey(domain.getColorKey(), domain.getName()));
        return dto;
    }

    private String resolveIconKey(String iconKey, String name) {
        if (iconKey != null && DOMAIN_ICONS.contains(iconKey)) {
            return iconKey;
        }

        String value = name == null ? "" : name.toLowerCase(Locale.ROOT);
        if (value.matches(".*(security|cyber|risk).*$")) return "shield";
        if (value.matches(".*(software|development|devops|code).*$")) return "code";
        if (value.matches(".*(data|analytics|information).*$")) return "database";
        if (value.matches(".*(people|culture|workforce).*$")) return "users";
        if (value.matches(".*(operations|operation|process|service).*$")) return "settings";
        if (value.matches(".*(strategy|transformation).*$")) return "compass";
        return "layers";
    }

    private String resolveColorKey(String colorKey, String name) {
        if (colorKey != null && DOMAIN_COLORS.contains(colorKey)) {
            return colorKey;
        }
        String value = name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        return DOMAIN_COLORS.get(Math.floorMod(value.hashCode(), DOMAIN_COLORS.size()));
    }

    private void validateAppearance(String iconKey, String colorKey) {
        if (iconKey != null && !iconKey.isBlank() && !DOMAIN_ICONS.contains(iconKey)) {
            throw new IllegalOperationException(
                    "INVALID_ICON_KEY", "Unsupported domain icon.");
        }
        if (colorKey != null && !colorKey.isBlank() && !DOMAIN_COLORS.contains(colorKey)) {
            throw new IllegalOperationException(
                    "INVALID_COLOR_KEY", "Unsupported domain color.");
        }
    }

    private DomainDTO toDto(Domain domain, Map<Long, DomainModelStats> statsByDomainId) {
        DomainDTO dto = toDtoWithoutStats(domain);
        DomainModelStats s = statsByDomainId.getOrDefault(domain.getId(), DomainModelStats.ZERO);
        dto.setMaturityModelCount(s.count());
        dto.setHasActiveMaturityModel(s.hasActive());
        return dto;
    }

    private record DomainModelStats(long count, boolean hasActive) {
        static final DomainModelStats ZERO = new DomainModelStats(0, false);
    }
}
