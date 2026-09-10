package com.master_thesis.maturity_assessment.maturity_models.repository;

import com.master_thesis.maturity_assessment.maturity_models.models.Domain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DomainRepository extends JpaRepository<Domain, Long> {
    Optional<Domain> findById(Long id);
    
    Optional<Domain> findByName(String name);
    
    boolean existsByName(String name);
}

