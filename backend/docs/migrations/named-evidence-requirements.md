# V49: named evidence requirements and source dates

Deploy backend and frontend together after backing up the database. V49 adds an
ordered, practice-owned requirements collection and nullable `requirement_code`
and `evidence_date` fields to evidence. A composite foreign key prevents evidence
from referencing another practice's requirement.

Existing required practices receive one mandatory `supporting-evidence`
requirement accepting files, links and notes. Their existing evidence is assigned
to that requirement. Other evidence stays additional supporting material. Evidence
IDs, files, question references, upload timestamps, assessment statuses and scores
are preserved. Source dates remain null; no upload date is substituted.

New classified evidence needs a source date; unchanged historical attachments with
unknown dates can be retained. Replacing content or assigning it to another named
requirement requires a date. Each named requirement and the additional-evidence
group allows five items, with existing over-limit groups retained until reduced.

The editor's Evidence tab defines names, instructions, mandatory flags and accepted
formats. Workbook exports and the downloadable template add the optional JSON
column `practiceEvidenceRequirements`; older workbooks still import. Age limits,
expiry calculation and verifier identity are deferred.

Check an older assessment, a new named requirement, exact draft save/resubmission,
campaign submission, and workbook import/export after deployment. Rollback requires
restoring the database backup and the compatible application version together.

An optional PostgreSQL test executes the migration in an isolated schema and rolls
back, without changing application tables:

```bash
EVIDENCE_MIGRATION_TEST_DATABASE=maturity-db ./mvnw -q test -Dtest=NamedEvidenceRequirementsMigrationTest
```
