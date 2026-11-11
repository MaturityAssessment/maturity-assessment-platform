# V50: evidence lifecycle and assessment reference dates

Deploy backend and frontend together. Back up the database before applying V50.

The migration adds `frequency` and nullable `max_age_days` to evidence requirements.
Existing requirements default to `adhoc` with no expiry: no lifecycle policy is
invented for old model versions. The editor configures day limits and the Profile
1.1 defaults (monthly 31, quarterly 92, yearly 366). New versions copy these fields.

Evidence's `evidence_date` column is renamed to `collected_at`, preserving dates.
The API uses `collectedAt`, with `evidenceDate` retained as a legacy write alias.
Every new provided-evidence record needs this date, including additional supporting
material and notes. Unchanged legacy records may retain null; replacements and
reclassification require a date. No upload timestamp is substituted.

Assessments gain a stable `reference_date`. Existing rows use their creation date
and are explicitly marked `reference_date_inferred = true`. This is a migration
assumption, not a claim about the original assessment's effective date. New
assessments record their reference date explicitly and may edit it while the
respondent workflow permits edits. Future reference dates are rejected.

Historical evidence validity is derived at the reference date. Live dashboard
freshness is derived at today's UTC date. Neither calculation changes numeric
scores, reviewer decisions, assessment status, upload times or stored result dates.
Missing required indicators continue blocking submission; outdated indicators remain
satisfied and only produce warnings. No scheduled job or persisted outdated flag
is introduced. Verifier identity and evidence-driven scoring rules remain separate.

Validation includes the exact age boundary, mixed current/outdated attachments,
legacy unknown dates, model-version/workbook round-trips, completed assessment
immutability, campaign flows and browser focus/visibility/midnight refreshes.
The optional PostgreSQL migration test uses an isolated schema and rolls back:

```bash
EVIDENCE_MIGRATION_TEST_DATABASE=maturity-db ./mvnw -q test -Dtest=EvidenceLifecycleMigrationTest
```

Rollback requires restoring the database backup and the compatible application
version together.
