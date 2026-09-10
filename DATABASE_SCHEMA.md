# Database Schema Documentation

## Overview

The Maturity Assessment Platform uses **PostgreSQL** as its database management system. Versioned changes are managed by **Flyway**; Hibernate schema updates remain enabled for development compatibility.

**Schema Management Strategy:**

- Versioned migrations: `backend/src/main/resources/db/migration`
- Development compatibility: `spring.jpa.hibernate.ddl-auto=update`

## Database Information

- **Database Name:** `maturity-db`
- **Default User:** `postgres`
- **Default Port:** `5432`
- **Dialect:** PostgreSQL

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
└───┬─────────┬───┘
    │ 1       │ 1
    │         │
    │ *       │ *
┌───▼───┐ ┌───▼────────────┐
│refresh│ │  assessments   │
│tokens │ └───┬────────┬───┘
└───────┘     │ 1      │ 1
              │        │
              │ *      │ *
       ┌──────▼─────┐ ┌▼────────┐
       │ dimension  │ │evidence │
       │ _results   │ └─────────┘
       └────────────┘

┌─────────────┐
│   domains   │
└──────┬──────┘
       │ 1
       │
       │ *
┌──────▼───────────────┐
│   maturity_models    │
└──┬──────┬────────────┘
   │ 1    │ 1
   │      │
   │ *    │ *
┌──▼────┐ ┌▼──────────┐
│levels │ │dimensions │
└───────┘ └──────┬────┘
                 │ 1
                 │
                 │ *
          ┌──────▼───┐
          │ modules  │
          └──────┬───┘
                 │ 1
                 │
                 │ *
          ┌──────▼────┐
          │ practices │
          └──────┬────┘
                 │ 1
                 │
                 │ *
          ┌──────▼────┐
          │ questions │
          └───────────┘
```

Campaign execution adds the normalized path
`campaigns → campaign_participants → assessments → question_evaluations`.
Campaigns also reference their creator in `users` and one exact row in
`maturity_models`.

## Tables

### 1. users

Stores user accounts and authentication information.

**Table Name:** `users`

| Column            | Type         | Constraints      | Description                              |
| ----------------- | ------------ | ---------------- | ---------------------------------------- |
| id                | BIGSERIAL    | PRIMARY KEY      | Auto-incrementing user ID                |
| email             | VARCHAR(255) | UNIQUE, NOT NULL | User email (used as username)            |
| password          | VARCHAR(255) | NOT NULL         | BCrypt hashed password                   |
| name              | VARCHAR(255) |                  | User's display name                      |
| organization_name | VARCHAR(255) |                  | User's organization                      |
| role              | VARCHAR(50)  | NOT NULL         | User role (USER/CURATOR/ADMIN) |

**Indexes:**

- Primary key on `id`
- Unique index on `email`

**Notes:**

- Implements Spring Security's `UserDetails` interface
- Password must be hashed with BCrypt before storage
- Email is used as the username for authentication
- Role hierarchy: ADMIN > CURATOR > USER

---

### 2. refresh_tokens

Stores JWT refresh tokens for token rotation.

**Table Name:** `refresh_tokens`

| Column     | Type         | Constraints           | Description              |
| ---------- | ------------ | --------------------- | ------------------------ |
| id         | BIGSERIAL    | PRIMARY KEY           | Auto-incrementing ID     |
| token      | VARCHAR(255) | UNIQUE, NOT NULL      | Refresh token string     |
| user_id    | BIGINT       | FOREIGN KEY, NOT NULL | Reference to users       |
| expiry_date| TIMESTAMP    | NOT NULL              | Token expiration date    |
| created_at | TIMESTAMP    | NOT NULL              | Token creation timestamp |
| revoked    | BOOLEAN      | NOT NULL, DEFAULT false | Whether token is revoked |

**Foreign Keys:**

- `user_id` → `users(id)` ON DELETE CASCADE

---

### 3. domains

Stores domain categories for organizing maturity models.

**Table Name:** `domains`

| Column     | Type         | Constraints      | Description            |
| ---------- | ------------ | ---------------- | ---------------------- |
| id         | BIGSERIAL    | PRIMARY KEY      | Auto-incrementing ID   |
| name       | VARCHAR(255) | UNIQUE, NOT NULL | Domain name            |
| description| TEXT         |                  | Domain description     |
| created_at | TIMESTAMP    | NOT NULL         | Creation timestamp     |
| updated_at | TIMESTAMP    |                  | Last update timestamp  |

---

### 4. maturity_models

Stores maturity model definitions.

**Table Name:** `maturity_models`

| Column         | Type         | Constraints             | Description                          |
| -------------- | ------------ | ----------------------- | ------------------------------------ |
| id             | BIGSERIAL    | PRIMARY KEY             | Auto-incrementing model ID           |
| name           | VARCHAR(255) | NOT NULL                | Model name                           |
| description    | TEXT         |                         | Model description                    |
| changelog_markdown | TEXT     |                         | Markdown release notes for this exact version |
| is_active      | BOOLEAN      | NOT NULL, DEFAULT false | Whether this model version is active |
| auto_evaluated | BOOLEAN      | NOT NULL, DEFAULT true  | Whether scoring is automatic         |
| aggregation_rule | VARCHAR(32) | NOT NULL, DEFAULT `WEIGHTED_AVERAGE` | Dimensions → overall rule |
| version        | INTEGER      | NOT NULL, DEFAULT 1     | Model version number                 |
| base_model_id  | BIGINT       |                         | Links versions of same model (FK to self) |
| domain_id      | BIGINT       | FOREIGN KEY             | Reference to domains                 |
| created_by_user_id | BIGINT   | FOREIGN KEY, nullable   | User who created this exact version  |
| created_at     | TIMESTAMP    | NOT NULL                | Creation timestamp                   |
| updated_at     | TIMESTAMP    |                         | Last update timestamp                |

**Foreign Keys:**

- `domain_id` → `domains(id)`
- `created_by_user_id` → `users(id)` (`ON DELETE SET NULL`)

**Indexes:**

- `ux_maturity_models_one_active_version_per_lineage` is a partial unique index
  on `COALESCE(base_model_id, id)` for rows where `is_active IS TRUE`. It is
  created by migration V23 and permits only one active version per model
  lineage.

**Business Rules:**

- Multiple model lineages in the same domain can have `is_active = true`
- Only one version within each model lineage can have `is_active = true`
- Activating a version deactivates only another active version in the same
  lineage; models from other lineages are unchanged
- `base_model_id` points to the version 1 model for all versions of the same model
- `changelog_markdown` belongs to one exact version and is not inherited by the next version
- `created_by_user_id` identifies the creator of the exact version, rather than the model lineage
- Aggregation rules are one of `AVERAGE`, `WEIGHTED_AVERAGE`, `MINIMUM`,
  `MAXIMUM`, `SUM`, or `MEDIAN`

---

### 5. maturity_levels

Defines the maturity levels for each model (typically 1-5).

**Table Name:** `maturity_levels`

| Column            | Type         | Constraints           | Description                  |
| ----------------- | ------------ | --------------------- | ---------------------------- |
| id                | BIGSERIAL    | PRIMARY KEY           | Auto-incrementing level ID   |
| number            | INTEGER      | NOT NULL              | Level number (1, 2, 3, etc.) |
| name              | VARCHAR(255) | NOT NULL              | Level name (e.g., "Initial") |
| description       | TEXT         |                       | Level description            |
| maturity_model_id | BIGINT       | FOREIGN KEY, NOT NULL | Reference to maturity_models |
| created_at        | TIMESTAMP    | NOT NULL              | Creation timestamp           |
| updated_at        | TIMESTAMP    |                       | Last update timestamp        |

**Foreign Keys:**

- `maturity_model_id` → `maturity_models(id)` ON DELETE CASCADE

---

### 6. dimensions

Represents assessment dimensions within a maturity model.

**Table Name:** `dimensions`

| Column            | Type         | Constraints           | Description                    |
| ----------------- | ------------ | --------------------- | ------------------------------ |
| id                | BIGSERIAL    | PRIMARY KEY           | Auto-incrementing dimension ID |
| dimension_id      | VARCHAR(255) | NOT NULL              | Human-readable dimension ID    |
| name              | VARCHAR(255) | NOT NULL              | Dimension name                 |
| description       | TEXT         |                       | Dimension description          |
| weight            | DOUBLE       | NOT NULL, DEFAULT 1.0 | Weight factor for overall aggregation |
| aggregation_rule  | VARCHAR(32)  | NOT NULL, DEFAULT `WEIGHTED_AVERAGE` | Modules → dimension rule |
| maturity_model_id | BIGINT       | FOREIGN KEY, NOT NULL | Reference to maturity_models   |
| created_at        | TIMESTAMP    | NOT NULL              | Creation timestamp             |
| updated_at        | TIMESTAMP    |                       | Last update timestamp          |

**Foreign Keys:**

- `maturity_model_id` → `maturity_models(id)` ON DELETE CASCADE

---

### 6a. dimension_mapping_rules

Defines curator-configurable normalized-score thresholds for maturity levels at
the dimension boundary.

| Column        | Type             | Constraints                 | Description |
| ------------- | ---------------- | --------------------------- | ----------- |
| id            | BIGSERIAL        | PRIMARY KEY                 | Rule ID |
| dimension_id  | BIGINT           | FOREIGN KEY, NOT NULL       | Owning dimension |
| level_number  | INTEGER          | NOT NULL                    | Target maturity level |
| minimum_score | DOUBLE PRECISION | NOT NULL, between 0 and 1   | Inclusive normalized lower bound |

Rules are unique by `(dimension_id, level_number)`. Each dimension has one rule
per model maturity level; level 1 starts at `0`, and subsequent thresholds are
strictly increasing. Migration V34 backfills equal-width thresholds.

---

### 6b. gating_rules

Defines ordered numeric constraints evaluated after aggregation on practices,
modules, and dimensions.

| Column              | Type         | Constraints | Description |
| ------------------- | ------------ | ----------- | ----------- |
| id                  | BIGSERIAL    | PRIMARY KEY | Rule ID |
| practice_id         | BIGINT       | FOREIGN KEY, nullable | Owning practice |
| module_id           | BIGINT       | FOREIGN KEY, nullable | Owning module |
| dimension_id        | BIGINT       | FOREIGN KEY, nullable | Owning dimension |
| rule_order          | INTEGER      | NOT NULL, non-negative | 0-based evaluation order |
| selection           | VARCHAR(32)  | NOT NULL | `SPECIFIC_CHILD`, `ANY_CHILD`, or `ALL_CHILDREN` |
| child_code          | VARCHAR(64)  | conditional | Immediate child code for `SPECIFIC_CHILD` |
| comparison_operator | VARCHAR(32)  | NOT NULL | Atomic numeric comparison |
| threshold           | NUMERIC(3,2) | NOT NULL, 0–1 | Comparison threshold |
| score_operation     | VARCHAR(32)  | NOT NULL | `SET`, `ADD`, or `SUBTRACT` |
| operation_value     | NUMERIC(3,2) | NOT NULL, 0–1 | Effect operand |

Exactly one owner FK is populated. Order is unique per owner, and every owner
FK cascades on deletion. Application validation restricts `child_code` to the
owner's immediate children.

---

### 7. modules

Represents modules within dimensions. Modules group related practices.

**Table Name:** `modules`

| Column            | Type         | Constraints           | Description                      |
| ----------------- | ------------ | --------------------- | -------------------------------- |
| id                | BIGSERIAL    | PRIMARY KEY           | Auto-incrementing module ID      |
| code              | VARCHAR(255) | NOT NULL              | Module code (e.g., "PM1")        |
| name              | VARCHAR(255) | NOT NULL              | Module name                      |
| description       | TEXT         |                       | Module description               |
| label_type        | VARCHAR(255) |                       | Evaluative label type            |
| weight            | DOUBLE       | NOT NULL, DEFAULT 1.0 | Weight factor for aggregation    |
| aggregation_rule  | VARCHAR(32)  | NOT NULL, DEFAULT `WEIGHTED_AVERAGE` | Practices → module rule |
| dimension_id      | BIGINT       | FOREIGN KEY           | Reference to dimensions          |
| created_at        | TIMESTAMP    | NOT NULL              | Creation timestamp               |
| updated_at        | TIMESTAMP    |                       | Last update timestamp            |

**Foreign Keys:**

- `dimension_id` → `dimensions(id)` ON DELETE CASCADE

---

### 8. practices

Represents practices within modules. Practices contain questions.

**Table Name:** `practices`

| Column              | Type         | Constraints           | Description                      |
| ------------------- | ------------ | --------------------- | -------------------------------- |
| id                  | BIGSERIAL    | PRIMARY KEY           | Auto-incrementing practice ID    |
| name                | VARCHAR(255) | NOT NULL              | Practice name                    |
| description         | TEXT         |                       | Practice description             |
| classification_type | VARCHAR(255) |                       | Classification type              |
| weight              | INTEGER      | NOT NULL, DEFAULT 1   | Weight for scoring               |
| aggregation_rule    | VARCHAR(32)  | NOT NULL, DEFAULT `WEIGHTED_AVERAGE` | Questions → practice rule |
| module_id           | BIGINT       | FOREIGN KEY           | Reference to modules             |
| created_at          | TIMESTAMP    | NOT NULL              | Creation timestamp               |
| updated_at          | TIMESTAMP    |                       | Last update timestamp            |

**Foreign Keys:**

- `module_id` → `modules(id)` ON DELETE CASCADE

---

### 9. questions

Individual assessment questions within practices.

**Table Name:** `questions`

| Column                 | Type         | Constraints           | Description                               |
| ---------------------- | ------------ | --------------------- | ----------------------------------------- |
| id                     | BIGSERIAL    | PRIMARY KEY           | Auto-incrementing question ID             |
| weight                 | INTEGER      | NOT NULL, DEFAULT 1   | Question weight for scoring               |
| text                   | TEXT         | NOT NULL              | Question text                             |
| type                   | VARCHAR(50)  | NOT NULL              | Question type                             |
| help                   | TEXT         |                       | Help text for the question                |
| depends_on_question_id | VARCHAR(255) |                       | Reference to parent question for dependencies |
| requires_evidence      | BOOLEAN      | NOT NULL, DEFAULT false | Whether evidence upload is required       |
| required               | BOOLEAN      | NOT NULL, DEFAULT false | Whether this question must be answered    |
| boolean_correct_answer | BOOLEAN      | NOT NULL, DEFAULT true | Boolean answer receiving normalized score 1 |
| choice_options         | TEXT         |                       | JSON multiple-choice labels and normalized scores |
| scale_point_count      | INTEGER      | NOT NULL, DEFAULT 5, CHECK 2–100 | Number of Scale response points |
| scale_min_label        | VARCHAR(50)  |                       | Optional tag for point 1 |
| scale_max_label        | VARCHAR(50)  |                       | Optional tag for the highest point |
| scale_high_point_is_maximum | BOOLEAN | NOT NULL, DEFAULT true | Whether the highest point normalizes to 1 |
| range_min              | INTEGER      | NOT NULL, DEFAULT 0   | Inclusive Numeric/Percentage lower bound |
| range_max              | INTEGER      | NOT NULL, DEFAULT 100 | Inclusive Numeric/Percentage upper bound |
| range_high_value_is_maximum | BOOLEAN | NOT NULL, DEFAULT true | Whether the upper bound normalizes to 1 |
| practice_id            | BIGINT       | FOREIGN KEY           | Reference to practices                    |
| created_at             | TIMESTAMP    | NOT NULL              | Creation timestamp                        |
| updated_at             | TIMESTAMP    |                       | Last update timestamp                     |

**Foreign Keys:**

- `practice_id` → `practices(id)` ON DELETE CASCADE

**Question Types:**

- `boolean` - Yes/No questions; the configured correct answer scores 1 and the other scores 0 internally
- `likert` - independently sized Scale questions normalized linearly to 0–1 in the configured direction
- `open_answer` - Free text excluded from automatic scoring; evaluator level 1–N normalizes to 0–1 before aggregation
- `numeric` - Integer within configured inclusive bounds, normalized to 0–1
- `percentage` - Integer within configured inclusive bounds, normalized to 0–1
- `evidence` - Evidence file upload
- `boolean_justification` - Yes/No with text justification

---

### 10. campaigns

Stores a creator-owned invitation campaign pinned to one exact maturity-model
version. A future campaign API will restrict creation to curators/admins.

| Column              | Type         | Constraints           | Description |
| ------------------- | ------------ | --------------------- | ----------- |
| id                  | BIGSERIAL    | PRIMARY KEY           | Campaign ID |
| name                | VARCHAR(150) | NOT NULL, nonblank    | Display name |
| ends_at             | TIMESTAMPTZ  | NOT NULL              | Exact campaign expiry instant |
| maturity_model_id   | BIGINT       | FOREIGN KEY, NOT NULL | Exact maturity-model version |
| created_by_user_id  | BIGINT       | FOREIGN KEY, NOT NULL | Creating curator/admin |
| created_at          | TIMESTAMPTZ  | NOT NULL              | Creation instant |
| updated_at          | TIMESTAMPTZ  | NOT NULL              | Last update instant |

`ends_at` must be later than `created_at`. Model and creator deletion is
restricted while the campaign exists.

---

### 11. campaign_participants

Stores one unauthenticated invitation identity per email and campaign.

| Column                | Type         | Constraints           | Description |
| --------------------- | ------------ | --------------------- | ----------- |
| id                    | BIGSERIAL    | PRIMARY KEY           | Participant ID |
| campaign_id           | BIGINT       | FOREIGN KEY, NOT NULL | Owning campaign |
| email                 | VARCHAR(255) | NOT NULL, trimmed     | Normalized invitation email |
| invitation_token_hash | VARCHAR(64)  | UNIQUE, NOT NULL      | Lowercase SHA-256 token hash |
| revoked_at            | TIMESTAMPTZ  |                       | Optional invitation revocation |
| created_at            | TIMESTAMPTZ  | NOT NULL              | Creation instant |
| updated_at            | TIMESTAMPTZ  | NOT NULL              | Last update instant |

Email is unique case-insensitively within a campaign, but the same address may
participate in different campaigns. Deleting an unused campaign cascades its
participants. Raw invitation tokens and full URLs are never stored.

---

### 12. assessments

Stores saved drafts and submitted maturity assessments.

**Table Name:** `assessments`

| Column                   | Type         | Constraints            | Description                          |
| ------------------------ | ------------ | ---------------------- | ------------------------------------ |
| id                       | BIGSERIAL    | PRIMARY KEY            | Auto-incrementing assessment ID      |
| overall_average          | DOUBLE       | NOT NULL               | Overall maturity score (1.0-5.0)     |
| overall_percentage_score | DOUBLE       |                        | Normalized 0-100 score               |
| overall_maturity_level   | VARCHAR(255) | NOT NULL               | Overall maturity level name          |
| is_completed             | BOOLEAN      | NOT NULL, DEFAULT true | Assessment completion status         |
| status                   | VARCHAR(50)  | NOT NULL               | `DRAFT`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, or `COMPLETED` |
| user_id                  | BIGINT       | FOREIGN KEY            | Reference to users                   |
| campaign_id              | BIGINT       | FOREIGN KEY            | Campaign context for invited respondents |
| campaign_participant_id  | BIGINT       | FOREIGN KEY, UNIQUE    | Invited respondent; at most one assessment |
| maturity_model_id        | BIGINT       | FOREIGN KEY            | Reference to the maturity model used |
| evaluator_insight        | TEXT         |                        | Overall curator guidance             |
| created_at               | TIMESTAMP    | NOT NULL               | Creation timestamp                   |
| updated_at               | TIMESTAMP    | NOT NULL               | Last lifecycle/content update        |

**Foreign Keys:**

- `user_id` → `users(id)`
- `maturity_model_id` → `maturity_models(id)` ON DELETE RESTRICT
- `(campaign_id, maturity_model_id)` → `campaigns(id, maturity_model_id)` ON DELETE RESTRICT
- `(campaign_participant_id, campaign_id)` → `campaign_participants(id, campaign_id)` ON DELETE RESTRICT

Exactly one respondent source is required: either `user_id`, or both campaign
columns. Composite foreign keys prevent campaign/model and
campaign/participant mismatches.

---

### 13. question_evaluations

Stores the respondent response, immutable submitted score, and optional curator
review for one assessment/question pair.

| Column                   | Type         | Constraints                       | Description |
| ------------------------ | ------------ | --------------------------------- | ----------- |
| id                       | BIGSERIAL    | PRIMARY KEY                       | Row ID |
| assessment_id            | BIGINT       | FOREIGN KEY, NOT NULL             | Owning assessment |
| question_id              | BIGINT       | FOREIGN KEY, NOT NULL             | Canonical question relationship |
| response_key             | VARCHAR(500) | NOT NULL                          | Client correlation key |
| response                 | JSONB        |                                   | Number, string, or boolean respondent answer |
| initial_score            | DOUBLE       |                                   | Automated score frozen at submission; Boolean and Scale use normalized 0–1 |
| respondent_justification | TEXT         |                                   | Optional respondent explanation |
| validation_status        | VARCHAR(20)  |                                   | `ACCEPTED`, `ADJUSTED`, or `FLAGGED` after review |
| manual_score             | DOUBLE       |                                   | Optional curator override; Boolean and Scale use normalized 0–1 |
| reviewer_note            | TEXT         |                                   | Optional curator note |
| created_at               | TIMESTAMP    | NOT NULL                          | Creation timestamp |
| updated_at               | TIMESTAMP    |                                   | Last update timestamp |

The table is unique by both `(assessment_id, response_key)` and
`(assessment_id, question_id)`. `response` and review fields are nullable so an
evidence-only question can be reviewed without a respondent scalar answer.

---

### 14. dimension_results

Stores per-dimension results for each assessment.

**Table Name:** `dimension_results`

| Column         | Type         | Constraints           | Description                        |
| -------------- | ------------ | --------------------- | ---------------------------------- |
| id             | BIGSERIAL    | PRIMARY KEY           | Auto-incrementing result ID        |
| dimension_id   | VARCHAR(255) | NOT NULL              | Dimension identifier               |
| dimension_name | VARCHAR(255) | NOT NULL              | Dimension name (denormalized)      |
| average_score  | DOUBLE       | NOT NULL              | Dimension average score (1.0-5.0)  |
| maturity_level | VARCHAR(255) | NOT NULL              | Dimension maturity level name      |
| maturity_level_number | INTEGER | nullable for historic rows | Numeric mapped level used for overall aggregation |
| responses      | TEXT         |                       | JSON string of dimension responses |
| assessment_id  | BIGINT       | FOREIGN KEY, NOT NULL | Reference to assessments           |

**Foreign Keys:**

- `assessment_id` → `assessments(id)` ON DELETE CASCADE

---

### 15. evidence

Stores uploaded evidence files linked to assessments and questions.

**Table Name:** `evidence`

| Column              | Type         | Constraints           | Description                     |
| ------------------- | ------------ | --------------------- | ------------------------------- |
| id                  | BIGSERIAL    | PRIMARY KEY           | Auto-incrementing evidence ID   |
| assessment_id       | BIGINT       | FOREIGN KEY, NOT NULL | Reference to assessments        |
| question_id         | BIGINT       | FOREIGN KEY, NOT NULL | Reference to questions          |
| evidence_type       | VARCHAR(20)  |                       | `FILE` or `URL`                 |
| description         | TEXT         |                       | Optional evidence description   |
| external_url        | VARCHAR(1000)|                       | URL evidence target             |
| file_name           | VARCHAR(255) |                       | Original file name              |
| file_path           | VARCHAR(500) |                       | Storage path on server          |
| file_size           | BIGINT       |                       | File size in bytes              |
| file_type           | VARCHAR(100) |                       | MIME type of file               |
| uploaded_by_user_id | BIGINT       | FOREIGN KEY           | Authenticated uploader          |
| uploaded_by_campaign_participant_id | BIGINT | FOREIGN KEY | Invited campaign uploader |
| uploaded_at         | TIMESTAMP    | NOT NULL              | Upload timestamp                |

**Foreign Keys:**

- `assessment_id` → `assessments(id)`
- `question_id` → `questions(id)`
- `uploaded_by_user_id` → `users(id)`
- `(assessment_id, uploaded_by_campaign_participant_id)` →
  `assessments(id, campaign_participant_id)`

Exactly one uploader source is required. A campaign-participant uploader must
be the participant who owns the referenced assessment.

---

## Relationships Summary

### One-to-Many Relationships

1. **User → Assessments** (`assessments.user_id` → `users.id`)
2. **User → RefreshTokens** (`refresh_tokens.user_id` → `users.id`, CASCADE)
3. **User → Campaigns** (`campaigns.created_by_user_id` → `users.id`, RESTRICT)
4. **MaturityModel → Campaigns** (`campaigns.maturity_model_id` → `maturity_models.id`, RESTRICT)
5. **Campaign → Participants** (`campaign_participants.campaign_id` → `campaigns.id`, CASCADE)
6. **CampaignParticipant → Assessment** (`assessments.campaign_participant_id`, UNIQUE, RESTRICT)
7. **Domain → MaturityModels** (`maturity_models.domain_id` → `domains.id`)
8. **MaturityModel → MaturityLevels** (`maturity_levels.maturity_model_id` → `maturity_models.id`, CASCADE)
9. **MaturityModel → Dimensions** (`dimensions.maturity_model_id` → `maturity_models.id`, CASCADE)
10. **Dimension → Modules** (`modules.dimension_id` → `dimensions.id`, CASCADE)
11. **Module → Practices** (`practices.module_id` → `modules.id`, CASCADE)
12. **Practice → Questions** (`questions.practice_id` → `practices.id`, CASCADE)
13. **Dimension → GatingRules** (`gating_rules.dimension_id` → `dimensions.id`, CASCADE)
14. **Module → GatingRules** (`gating_rules.module_id` → `modules.id`, CASCADE)
15. **Practice → GatingRules** (`gating_rules.practice_id` → `practices.id`, CASCADE)
16. **Assessment → DimensionResults** (`dimension_results.assessment_id` → `assessments.id`, CASCADE)
17. **Assessment → Evidence** (`evidence.assessment_id` → `assessments.id`, CASCADE)

### Cascade Deletion Behavior

```
DELETE maturity_model
  ↓ CASCADE
  ├─ DELETE maturity_levels
  └─ DELETE dimensions
       ↓ CASCADE
       └─ DELETE modules
            ↓ CASCADE
            └─ DELETE practices
                 ↓ CASCADE
                 └─ DELETE questions

DELETE assessment
  ↓ CASCADE
  ├─ DELETE dimension_results
  └─ DELETE evidence

DELETE campaign
  ↓ CASCADE when no assessment exists
  └─ DELETE campaign_participants
  ↓ RESTRICT when an assessment references the campaign/participant

DELETE user or maturity_model
  ↓ RESTRICT when referenced by a campaign
```

---

## Backup and Maintenance

### Backup Database

```bash
# Full database backup
pg_dump -U postgres -d maturity-db -F c -f maturity-db-backup.dump

# SQL format backup
pg_dump -U postgres -d maturity-db > maturity-db-backup.sql
```

### Restore Database

```bash
# From custom format
pg_restore -U postgres -d maturity-db maturity-db-backup.dump

# From SQL format
psql -U postgres -d maturity-db < maturity-db-backup.sql
```

---

## Migration Considerations

### Moving to Production

1. **Change DDL Strategy** - Disable `hibernate.ddl-auto`, use Flyway or Liquibase
2. **Add Production Indexes** - Implement all recommended indexes
3. **Enable Connection Pooling** - Configure HikariCP settings
4. **Set Up Backups** - Regular automated backups
5. **Configure File Storage** - External storage for evidence files (S3, etc.)
