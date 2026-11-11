# Recovery from partial Hibernate upgrades (11 November 2026)

The local database had Flyway history through V40 and V43, while Hibernate `update`
had created some later tables and columns without running their data migrations.
V50's required reference-date and frequency columns failed to be added to existing
rows. Both `evidence_date` and an empty `collected_at` existed afterward.

This was repaired without editing applied migration files, resetting checksums,
or manually marking migrations as executed:

1. Stop the backend and create a full custom-format PostgreSQL backup. Verify the
   dump contains assessment and evidence data and restrict backup permissions.
2. Restore that backup into an isolated rehearsal database.
3. Validate applied migration checksums, allowing pending migrations only in this
   preflight check (`-Dflyway.ignoreMigrationPatterns=*:pending`).
4. Move Hibernate-created evidence/relationship tables into a temporary staging
   schema. Preserve existing dependency conditions, classifications and both date
   columns under temporary names so the original migration files can execute.
5. Run the unmodified pending migrations V41, V42 and V44–V50 through Flyway, using
   `-Dflyway.outOfOrder=true` only for this deliberate recovery.
6. Restore configured dependency conditions, explicit evidence requirements,
   classifications, relationship rows and original evidence dates. Retain V49's
   generic requirement conversion only for practices without explicit indicators.
7. Compare stored assessments, scores, reviews, evidence metadata and relationship
   data against the staged originals inside the restoration transaction. Abort on
   any unintended change. Remove staging objects without `CASCADE`.
8. Validate the migration history again without ignoring pending migrations and
   start the application against the rehearsal database with Hibernate `validate`.
9. Apply the rehearsed operation to the stopped local database, then enable
   `SPRING_FLYWAY_ENABLED=true` and `HIBERNATE_DDL_AUTO=validate` in its ignored
   `backend/.env`. Restart and verify the model API and schema validation.

The local recovery backup, exact staging/restoration SQL, execution script and logs
are retained in the ignored, private directory:
`backend/backups/pre-lifecycle-repair-20261111T164409Z/`.
The original dump is the sibling file with the same name and a `.dump` extension.

These SQL files are specific to the inspected drift and assert the expected
starting migration history. Do not run them on another schema without inspecting
and rehearsing its own recovery. No evidence files or stored assessment results
were removed or recalculated during this operation.

Normal startup now validates instead of automatically altering tables. Fresh empty
development databases still have an explicit bootstrap path in `GETTING_STARTED.md`;
Hibernate `update` must not be used to upgrade a populated database.
