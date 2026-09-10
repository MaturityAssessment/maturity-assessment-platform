package com.master_thesis.maturity_assessment.maturity_models.repository;

import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MaturityModelRepository extends JpaRepository<MaturityModel, Long> {
    Optional<MaturityModel> findById(Long id);

    boolean existsById(Long id);

    List<MaturityModel> findByName(String name);

    List<MaturityModel> findByNameOrderByVersionDesc(String name);

    @Query("SELECT m FROM MaturityModel m "
            + "WHERE COALESCE(m.baseModelId, m.id) = :baseModelId ORDER BY m.version ASC")
    List<MaturityModel> findByBaseModelIdOrderByVersionAsc(@Param("baseModelId") Long baseModelId);

    List<MaturityModel> findByDomainId(Long domainId);

    @Query("SELECT COUNT(DISTINCT COALESCE(m.baseModelId, m.id)) "
            + "FROM MaturityModel m WHERE m.domain.id = :domainId")
    long countModelLineagesByDomainId(@Param("domainId") Long domainId);

    boolean existsByDomain_IdAndIsActiveTrue(Long domainId);

    @Query("SELECT m.domain.id, COUNT(DISTINCT COALESCE(m.baseModelId, m.id)), "
            + "MAX(CASE WHEN m.isActive = true THEN 1 ELSE 0 END) "
            + "FROM MaturityModel m GROUP BY m.domain.id")
    List<Object[]> aggregateModelStatsByDomain();

    List<MaturityModel> findByIsActiveTrue();
    
    List<MaturityModel> findByDomainIdAndIsActiveTrue(Long domainId);

    @Query("SELECT m.id, d.name, m.version FROM MaturityModel m LEFT JOIN m.domain d WHERE m.id IN :ids")
    List<Object[]> findAssessmentMetadataByIdIn(@Param("ids") Collection<Long> ids);
}
