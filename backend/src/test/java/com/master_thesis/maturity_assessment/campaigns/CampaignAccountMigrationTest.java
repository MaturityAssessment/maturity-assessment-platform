package com.master_thesis.maturity_assessment.campaigns;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.sql.*;
import java.nio.file.*;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "PASSWORD_TEST_DB_URL", matches = ".+")
class CampaignAccountMigrationTest {
    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void resetsOnlyCampaignDataAndEnforcesRealOwnership(boolean hibernateColumnsPresent) throws Exception {
        try (Connection c = DriverManager.getConnection(System.getenv("PASSWORD_TEST_DB_URL"),
                System.getenv().getOrDefault("PASSWORD_TEST_DB_USER", "postgres"), "");
             Statement s = c.createStatement()) {
            String schema = "migration_" + UUID.randomUUID().toString().replace("-", "");
            s.execute("CREATE SCHEMA " + schema);
            try {
                s.execute("SET search_path TO " + schema);
                s.execute("""
                    CREATE TABLE users(id BIGSERIAL PRIMARY KEY, email TEXT);
                    CREATE TABLE maturity_models(id BIGSERIAL PRIMARY KEY);
                    CREATE TABLE assessments(id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), maturity_model_id BIGINT, status TEXT);
                    CREATE TABLE evidence(id BIGSERIAL PRIMARY KEY, assessment_id BIGINT REFERENCES assessments(id), uploaded_by_user_id BIGINT NOT NULL REFERENCES users(id));
                    CREATE TABLE dimension_results(id BIGSERIAL PRIMARY KEY, assessment_id BIGINT REFERENCES assessments(id));
                    CREATE TABLE question_evaluations(id BIGSERIAL PRIMARY KEY, assessment_id BIGINT REFERENCES assessments(id));
                    INSERT INTO users VALUES (1, 'owner@example.com'), (2, 'respondent@example.com');
                    INSERT INTO maturity_models VALUES (1);
                    INSERT INTO assessments VALUES (1, 1, 1, 'DRAFT');
                    INSERT INTO evidence VALUES (1, 1, 1);
                    INSERT INTO dimension_results VALUES (1, 1);
                    INSERT INTO question_evaluations VALUES (1, 1);
                    """);
                s.execute(migration("V16__enforce_one_draft_per_user_and_model.sql"));
                s.execute(migration("V21__add_campaign_persistence.sql"));
                s.execute("""
                    INSERT INTO campaigns(id,name,ends_at,maturity_model_id,created_by_user_id) VALUES (1,'Old',CURRENT_TIMESTAMP + INTERVAL '1 day',1,1);
                    INSERT INTO campaign_participants(id,campaign_id,email,invitation_token_hash) VALUES (1,1,'old@example.com',repeat('a',64));
                    INSERT INTO assessments VALUES (2,NULL,1,'DRAFT',1,1);
                    INSERT INTO evidence(id,assessment_id,uploaded_by_campaign_participant_id) VALUES (2,2,1);
                    INSERT INTO dimension_results VALUES (2,2);
                    INSERT INTO question_evaluations VALUES (2,2);
                    """);
                if (hibernateColumnsPresent) {
                    s.execute("ALTER TABLE users ADD COLUMN profile_completion_required BOOLEAN NOT NULL DEFAULT FALSE");
                    s.execute("ALTER TABLE users ADD COLUMN initial_credentials_pending BOOLEAN NOT NULL DEFAULT FALSE");
                    s.execute("ALTER TABLE campaign_participants ADD COLUMN user_id BIGINT REFERENCES users(id)");
                }
                s.execute(migration("V43__campaign_user_accounts.sql"));
                for (String table : new String[]{"assessments", "evidence", "dimension_results", "question_evaluations"}) {
                    try (ResultSet r = s.executeQuery("SELECT count(*) FROM " + table)) { r.next(); assertEquals(1, r.getInt(1)); }
                }
                for (String table : new String[]{"campaigns", "campaign_participants"}) {
                    try (ResultSet r = s.executeQuery("SELECT count(*) FROM " + table)) { r.next(); assertEquals(0, r.getInt(1)); }
                }
                s.execute("""
                    INSERT INTO campaigns(id,name,ends_at,maturity_model_id,created_by_user_id) VALUES (2,'New',CURRENT_TIMESTAMP + INTERVAL '1 day',1,1), (3,'Other',CURRENT_TIMESTAMP + INTERVAL '1 day',1,1);
                    INSERT INTO campaign_participants(id,campaign_id,email,user_id) VALUES (2,2,'owner@example.com',1),(3,3,'owner@example.com',1);
                    INSERT INTO assessments VALUES (3,1,1,'DRAFT',2,2),(4,1,1,'DRAFT',3,3);
                    """);
                assertThrows(SQLException.class, () -> s.execute("INSERT INTO assessments VALUES (5,2,1,'DRAFT',2,2)"));
                assertThrows(SQLException.class, () -> s.execute("INSERT INTO assessments VALUES (6,1,1,'DRAFT',NULL,NULL)"));
                assertThrows(SQLException.class, () -> s.execute("INSERT INTO users(id,email) VALUES (99,'OWNER@example.com')"));
            } finally { s.execute("DROP SCHEMA " + schema + " CASCADE"); }
        }
    }
    private String migration(String name) throws Exception {
        return Files.readString(Path.of("src/main/resources/db/migration", name));
    }
}
