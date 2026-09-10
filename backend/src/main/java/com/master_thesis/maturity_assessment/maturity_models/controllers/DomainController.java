package com.master_thesis.maturity_assessment.maturity_models.controllers;

import com.master_thesis.maturity_assessment.maturity_models.dto.CreateDomainRequest;
import com.master_thesis.maturity_assessment.maturity_models.dto.DomainDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.UpdateDomainAppearanceRequest;
import com.master_thesis.maturity_assessment.maturity_models.services.DomainService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/domain")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DomainController {

    private final DomainService domainService;

    @GetMapping
    public ResponseEntity<List<DomainDTO>> getAllDomains() {
        List<DomainDTO> domains = domainService.getAllDomains();
        return ResponseEntity.ok(domains);
    }

    @GetMapping("/with-models")
    public ResponseEntity<List<DomainDTO>> getDomainsWithModels() {
        List<DomainDTO> domains = domainService.getDomainsWithModels();
        return ResponseEntity.ok(domains);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DomainDTO> getDomainById(@PathVariable Long id) {
        DomainDTO domain = domainService.getDomainById(id);
        return ResponseEntity.ok(domain);
    }

    @PostMapping
    public ResponseEntity<DomainDTO> createDomain(@Valid @RequestBody CreateDomainRequest request) {
        DomainDTO createdDomain = domainService.createDomain(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdDomain);
    }

    @PatchMapping("/{id}/appearance")
    public ResponseEntity<DomainDTO> updateDomainAppearance(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDomainAppearanceRequest request) {
        return ResponseEntity.ok(domainService.updateDomainAppearance(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDomain(@PathVariable Long id) {
        domainService.deleteDomain(id);
        return ResponseEntity.noContent().build();
    }
}
