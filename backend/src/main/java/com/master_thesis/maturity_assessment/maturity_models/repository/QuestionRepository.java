package com.master_thesis.maturity_assessment.maturity_models.repository;

import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    Optional<Question> findById(Long id);
}

