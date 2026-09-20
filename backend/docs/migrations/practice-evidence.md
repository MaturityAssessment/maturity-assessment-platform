# V38: practice-level evidence

Deploy backend and frontend together. Evidence metadata/DTOs now use `practiceId`;
the filtered GET path ends in `/practice/{practiceId}`. Question-based uploads,
including file-only multipart uploads without metadata, are no longer accepted.
Practice requirements default to false. Question-level model flags are ignored;
the evidence-only question type is rejected.

## Migration behavior

V38 updates all model versions, including those used by saved assessments.
For each practice it ORs child `requires_evidence` flags and required evidence-only
questions. Every evidence row moves to the original question's parent practice.
Evidence IDs, descriptions, file paths, URLs, uploader identity and timestamps are
unchanged. Files stay in place; new uploads use assessment/practice directories.
Assessment statuses, answers, reviews and stored scores are not recalculated.

The migration aborts on orphaned/cross-model evidence, evidence-only questions
with response/review references, dependent questions, or specific-child gating
references. It verifies the complete evidence metadata and counts after conversion.
Unreferenced evidence-only questions are removed, including their text/help.
The database backup preserves that retired configuration.

Existing practices with more than five merged items retain all of them. They can
be edited or reduced, but a snapshot containing any new item must total at most
five items for that practice. There is no deduplication or file deletion.

## Deployment

1. Back up PostgreSQL and the configured evidence storage together.
2. Stop assessment writes and old backend instances. Rehearse V38 on a restored
   database; resolve any reported references explicitly rather than deleting
   historical answers or reviews.
3. Deploy the new backend and frontend together and let Flyway apply V38.
4. Check evidence counts, model practice flags, an old file download, an old URL,
   draft save/resubmission, and an invitation-based campaign assessment.

Submission uses the new rule immediately: at least one attachment for each
required practice with a visible child question. Drafts remain incomplete until
submission; previously completed assessments stay completed.

Rollback after a successful deployment requires restoring the database backup
and compatible application release together. Dropped question ownership cannot
be reconstructed from practice ownership alone. Preserve any uploads created
after deployment before restoring.

## Repeatable SQL tests

Run from `backend`:

```bash
EVIDENCE_MIGRATION_TEST_DATABASE=maturity-db ./mvnw -q test -Dtest=PracticeEvidenceMigrationTest
```

Tests use `psql` and the local PostgreSQL user `postgres` by default (override
`EVIDENCE_MIGRATION_TEST_USER`). They create only temporary tables with an isolated
search path and roll back each session; application tables are never migrated by
this test. Without the environment variable, this optional integration test is skipped.
