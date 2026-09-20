package com.master_thesis.maturity_assessment.maturity_models.repository;

import com.master_thesis.maturity_assessment.maturity_models.models.Practice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PracticeRepository extends JpaRepository<Practice, Long> {
}
