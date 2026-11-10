# Evidence question references (V44)

Deploy the additive V44 Flyway migration and backend before the frontend. Existing
evidence remains owned by its practice and initially has no question references.
No files move, no historical associations are inferred, and scoring is unchanged.

The new join table has a unique evidence/question pair, cascades references when
evidence is deleted, and restricts deletion of referenced questions. The service
validates same-practice and exact-model ownership before storing new uploads.

The existing evidence metadata and read contracts add `referencedQuestionIds`.
Responses return an array. Omitted/null preserves existing references on retained
items; an empty array clears them. This permits older clients to retain evidence
without erasing links. New clients should send the complete reference array.

Both normal and campaign assessment flows use the same transaction. References
are optional and survive inactive dependencies. Reference-only edits autosave
without marking flagged content corrected; answer or evidence-content edits use
the existing correction tracking.

Verify migration preservation, uniqueness and deletion rules with:

```bash
EVIDENCE_MIGRATION_TEST_DATABASE=<disposable-database> \
EVIDENCE_MIGRATION_TEST_USER=<database-user> \
./mvnw -Dtest=EvidenceQuestionReferencesMigrationTest test
```

The test rolls its isolated schema back. Use PostgreSQL connection variables
(`PGHOST`, `PGPORT`) when the test database is not on the default local socket.

The database-backed lifecycle tests are opt-in against a disposable migrated
database configured with `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`:

```bash
EVIDENCE_REFERENCE_INTEGRATION_TEST=true \
./mvnw -Dtest=EvidenceQuestionReferencesIntegrationTest test
```

They cover manual review/send-back/correction, automatic and campaign submission,
reference-only corrections, deletion cleanup, and transactional rollback. The
rollback test commits temporary fixtures and removes them in its cleanup.
