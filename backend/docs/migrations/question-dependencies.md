# Conditional question dependencies (V41)

V41 adds `questions.dependency_condition` as JSON stored in TEXT. Existing boolean
dependencies are backfilled to `{ "type": "boolean", "answers": [true] }`.
Existing multiple-choice options receive IDs derived from question ID and option
position, while existing IDs, option order, labels, and scores are preserved.
Stored assessment `choice_index` values therefore retain their meaning.

Apply V41 before running the updated backend; release the compatible frontend
runtime and editor together before authoring or importing new conditions. Earlier
clients do not understand the additional activation rules. Application rollback
should retain the new column and option IDs and disable editing/assessment of
models that use the new conditions until a compatible client is available.

The backend and frontend consume the same activation examples in
`tests/fixtures/question-dependencies.json`. Model, workbook, and assessment tests
cover validation, save/reload, and required-answer behavior. The opt-in
`MaturityModelExcelPersistenceIntegrationTest` exercises database persistence and
version round trips against a disposable PostgreSQL schema.

To check the actual migration against a disposable database initialized with the
current entity schema, run from the repository root:

```bash
psql "$TEST_DATABASE_URL" -f backend/src/test/resources/db/question-dependency-migration.sql
```

The script temporarily drops the new column, inserts legacy examples, applies the
actual V41 file, verifies the data, and rolls the entire transaction back. Never
point integration tests at an application database.
