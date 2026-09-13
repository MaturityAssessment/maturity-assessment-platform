# Model management workflow

[API documentation](../README.md) · [Model reference](../reference/maturity-models.md)

## Create a model

1. Sign in as curator/admin.
2. Select a domain using `GET /api/v1/domain`, or create one with
   `POST /api/v1/domain`.
3. Build an [editor document](../reference/maturity-models.md#editor-document) with
   the selected `domainId`, levels, and complete hierarchy. Alternatively, parse
   an Excel workbook through `POST /api/v1/maturity-model/editor/parse-upload`.
4. Review the editor document, including generated codes, question settings,
   evidence requirements, scoring, and import warnings. Parsing a workbook does
   not save a model.
5. Submit the document to `POST /api/v1/maturity-model/editor` and keep the returned
   model `id` and `version`. It starts inactive.
6. Activate it using `PUT /api/v1/maturity-model/{id}/activate` when it should be
   available for new drafts and campaigns.

Public GET endpoints allow clients to read model definitions without a token;
authoring/editor operations require curator/admin. Use the exported workbook or
repository template for the import layout, rather than inventing a spreadsheet
column format. Import expects `.xlsx`; the old direct CSV upload route is absent.

## Update an existing model

1. Load `GET /api/v1/maturity-model/{id}/editor`.
2. Edit its content while preserving stable public codes and valid dependencies.
   Supply the complete hierarchy and the desired `changelogMarkdown`.
3. Send it to `POST /api/v1/maturity-model/{id}/versions/editor`.
4. Use the returned new ID to inspect and activate the version.

An update always creates a new inactive version, even if no assessments use the
source. `PUT /api/v1/maturity-model/{id}` has the same version-creation behavior
with the public DTO contract. Neither route replaces the source in place. Retrying
an update can create another version, so inspect the lineage if a response is lost.

The response includes `updateMode: "VERSIONED"` and the source's
`assessmentUsageCount`. Existing assessments and campaigns retain their original
model reference. Activating the new version deactivates other active versions in
that lineage; it does not deactivate unrelated models in the domain.

## Inspect and retire versions

Use `GET /api/v1/maturity-model/{id}/versions` for version history and
`GET /api/v1/maturity-model/{id}/export.xlsx` for a workbook export.
Deactivate a version with `PUT /api/v1/maturity-model/{id}/deactivate` to remove it
from active selection while preserving history.

Deleting a model version is rejected when assessments use it. Domain deletion is
rejected while models remain. Check the operation's error contract before
presenting a deletion option; deactivation is the appropriate action when the
intention is to stop new use while retaining existing results.
