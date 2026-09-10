package com.master_thesis.maturity_assessment.config;

import com.master_thesis.maturity_assessment.maturity_models.services.MaturityModelService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private MaturityModelService maturityModelService;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Add auto_evaluated column if it doesn't exist
        try {
            entityManager.createNativeQuery(
                "ALTER TABLE maturity_models ADD COLUMN IF NOT EXISTS auto_evaluated BOOLEAN NOT NULL DEFAULT true"
            ).executeUpdate();
        } catch (Exception e) {
            // Column might already exist, continue
            System.out.println("Column auto_evaluated might already exist: " + e.getMessage());
        }
        
        // Add version column if it doesn't exist
        try {
            // Check if column exists using information_schema
            List<?> result = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'maturity_models' AND column_name = 'version'"
            ).getResultList();
            
            boolean columnExists = ((Number) result.get(0)).intValue() > 0;
            
            if (!columnExists) {
                // Add the column
                entityManager.createNativeQuery(
                    "ALTER TABLE maturity_models ADD COLUMN version INTEGER NOT NULL DEFAULT 1"
                ).executeUpdate();
            } else {
                // Column exists, update any NULL values to 1 (in case column was added without default)
                try {
                    entityManager.createNativeQuery(
                        "UPDATE maturity_models SET version = 1 WHERE version IS NULL"
                    ).executeUpdate();
                } catch (Exception e) {
                    // Ignore if update fails
                    System.out.println("Could not update version column: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            // Column might already exist or other error, continue
            System.out.println("Error handling version column: " + e.getMessage());
        }
        
        // Add base_model_id column if it doesn't exist
        try {
            // Check if column exists using information_schema
            List<?> result = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'maturity_models' AND column_name = 'base_model_id'"
            ).getResultList();
            
            boolean columnExists = ((Number) result.get(0)).intValue() > 0;
            
            if (!columnExists) {
                // Add the column (nullable, as it will be set after model creation)
                entityManager.createNativeQuery(
                    "ALTER TABLE maturity_models ADD COLUMN base_model_id BIGINT"
                ).executeUpdate();
                
                // Set base_model_id for existing models (point to their own ID for version 1)
                entityManager.createNativeQuery(
                    "UPDATE maturity_models SET base_model_id = id WHERE base_model_id IS NULL"
                ).executeUpdate();
            }
        } catch (Exception e) {
            // Column might already exist or other error, continue
            System.out.println("Error handling base_model_id column: " + e.getMessage());
        }
        
        // Add maturity_model_id column to assessments table if it doesn't exist
        try {
            // Check if column exists using information_schema
            List<?> result = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'assessments' AND column_name = 'maturity_model_id'"
            ).getResultList();
            
            boolean columnExists = ((Number) result.get(0)).intValue() > 0;
            
            if (!columnExists) {
                // Add the column as nullable initially (for existing records)
                entityManager.createNativeQuery(
                    "ALTER TABLE assessments ADD COLUMN maturity_model_id BIGINT"
                ).executeUpdate();
                
                // Try to set a default value for existing assessments using the active maturity model
                // If there's an active model, use it; otherwise leave NULL
                try {
                    List<?> activeModelResult = entityManager.createNativeQuery(
                        "SELECT id FROM maturity_models WHERE is_active = true LIMIT 1"
                    ).getResultList();
                    
                    if (!activeModelResult.isEmpty()) {
                        Long activeModelId = ((Number) activeModelResult.get(0)).longValue();
                        entityManager.createNativeQuery(
                            "UPDATE assessments SET maturity_model_id = :modelId WHERE maturity_model_id IS NULL"
                        ).setParameter("modelId", activeModelId).executeUpdate();
                    }
                } catch (Exception e) {
                    // If we can't set a default, that's okay - existing records will be NULL
                    System.out.println("Could not set default maturity_model_id for existing assessments: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            // Column might already exist or other error, continue
            System.out.println("Error handling maturity_model_id column in assessments: " + e.getMessage());
        }

        // Add assessment lifecycle columns and backfill existing rows.
        try {
            entityManager.createNativeQuery(
                "ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status VARCHAR(50)"
            ).executeUpdate();
            entityManager.createNativeQuery(
                "UPDATE assessments SET status = CASE WHEN is_completed = true THEN 'COMPLETED' ELSE 'PENDING_REVIEW' END WHERE status IS NULL"
            ).executeUpdate();
            entityManager.createNativeQuery(
                "ALTER TABLE assessments ALTER COLUMN status SET DEFAULT 'COMPLETED'"
            ).executeUpdate();
            entityManager.createNativeQuery(
                "ALTER TABLE assessments ALTER COLUMN status SET NOT NULL"
            ).executeUpdate();

            entityManager.createNativeQuery(
                "ALTER TABLE assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"
            ).executeUpdate();
            entityManager.createNativeQuery(
                "UPDATE assessments SET updated_at = created_at WHERE updated_at IS NULL"
            ).executeUpdate();
            entityManager.createNativeQuery(
                "ALTER TABLE assessments ALTER COLUMN updated_at SET NOT NULL"
            ).executeUpdate();

        } catch (Exception e) {
            System.out.println("Error handling assessment lifecycle columns: " + e.getMessage());
        }

        try {
            entityManager.createNativeQuery(
                "ALTER TABLE dimension_results ALTER COLUMN dimension_description TYPE TEXT"
            ).executeUpdate();
        } catch (Exception e) {
            System.out.println("Error handling dimension result text columns: " + e.getMessage());
        }
        
        // Add domain_id column to maturity_models table if it doesn't exist
        try {
            List<?> result = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'maturity_models' AND column_name = 'domain_id'"
            ).getResultList();
            
            boolean columnExists = ((Number) result.get(0)).intValue() > 0;
            
            if (!columnExists) {
                entityManager.createNativeQuery(
                    "ALTER TABLE maturity_models ADD COLUMN domain_id BIGINT"
                ).executeUpdate();
            }
        } catch (Exception e) {
            System.out.println("Error handling domain_id column: " + e.getMessage());
        }

        // Add approval_status column to users table and backfill existing users
        try {
            List<?> result = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'users' AND column_name = 'approval_status'"
            ).getResultList();

            boolean columnExists = ((Number) result.get(0)).intValue() > 0;

            if (!columnExists) {
                entityManager.createNativeQuery(
                    "ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) DEFAULT 'APPROVED'"
                ).executeUpdate();
            }

            entityManager.createNativeQuery(
                "UPDATE users SET approval_status = 'APPROVED' WHERE approval_status IS NULL"
            ).executeUpdate();
        } catch (Exception e) {
            System.out.println("Error handling approval_status column: " + e.getMessage());
        }

        // Migrate deprecated EVALUATOR role to CURATOR (idempotent)
        try {
            entityManager.createNativeQuery(
                "UPDATE users SET role = 'CURATOR' WHERE role = 'EVALUATOR'"
            ).executeUpdate();
        } catch (Exception e) {
            System.out.println("Error migrating evaluator role to curator: " + e.getMessage());
        }
        
    }
}
