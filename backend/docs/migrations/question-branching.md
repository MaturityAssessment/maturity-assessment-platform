# Question branching and indicator groups (V59)

V59 adds nullable `questions.branching_rule` JSONB, nullable normalized
`questions.hidden_score`, and nullable `practice_evidence_requirements.question_codes`
JSONB. Existing rows keep their existing behavior; there is no response backfill
or historical result recalculation. Zero is a valid hidden score.

The backend validates practice-local references and the combined legacy/branching
DAG on model writes. A hidden default is a scoring input, never a respondent answer.
Indicator groups affect required evidence and freshness without deleting uploads.
Both model DTOs and workbook round trips preserve the new fields. See the
[API contract](../api/reference/maturity-models.md#question-branching-v59).

Apply V59 using the database's existing migration procedure before deploying the
new backend. Keep compatible clients that preserve the fields; UI authoring is
deferred. Leaving the new columns in place supports application rollback for
models that do not use the new configuration. Models using it require a compatible
runtime and must not be assessed or edited by an older client.

`BranchingPersistenceIntegrationTest` is opt-in and requires a disposable PostgreSQL
database: Hibernate creates and drops its schema. Configure
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and
`SPRING_DATASOURCE_PASSWORD` for that database, then run from `backend/`:

```bash
BRANCHING_PERSISTENCE_TEST=true ./mvnw -o -Dtest=BranchingPersistenceIntegrationTest test
```

The tests exercise the actual V59 SQL against a legacy-shaped fixture and verify
data preservation, JSONB reloads, zero defaults, Excel import/export and new model
versions. They also exercise JSON draft save and multipart submission through the
assessment controller with real services and repositories, verify stored default
provenance and absence of fabricated response rows, compare ordinary/campaign
results, and verify that a newly visible linked question restores its evidence
requirement. External agent suggestions are mocked; no files are uploaded.

The repository's pre-existing Flyway scripts upgrade a legacy schema rather than
provide an empty-database baseline; see [local database setup](../../../GETTING_STARTED.md).
This test deliberately verifies V59 independently of that bootstrap limitation.
