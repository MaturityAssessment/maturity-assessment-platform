# Domains

[API index](../README.md#endpoint-index)

Sources: [controller](../../../src/main/java/com/master_thesis/maturity_assessment/maturity_models/controllers/DomainController.java),
[service](../../../src/main/java/com/master_thesis/maturity_assessment/maturity_models/services/DomainService.java).

## GET /api/v1/domain

**Access:** Public. **Request:** No body or filters.
**Response:** `200`, array of [domain objects](#domain-contract).

## GET /api/v1/domain/with-models

**Access:** Public. **Request:** No body or filters.
**Response:** `200`, domain array restricted to domains with at least one model
lineage. Models do not have to be active. Nested model documents are not returned.

## GET /api/v1/domain/{id}

**Access:** Public. **Request:** Numeric domain `id`; no body.
**Response:** `200`, domain object.
**Errors:** A missing domain currently produces `500 INTERNAL_SERVER_ERROR`
because the service throws a generic exception.

## POST /api/v1/domain

**Access:** Curator/admin. **Request:** JSON with nonblank `name`; optional
`description`, `iconKey`, and `colorKey`:

```json
{"name":"Software Development","description":"Engineering practices","iconKey":"code","colorKey":"blue"}
```

**Response:** `201`, created domain object. Omitted appearance values receive
defaults based on the name.
**Errors:** `400 DOMAIN_NAME_EXISTS`, `INVALID_ICON_KEY`, `INVALID_COLOR_KEY`,
or `BAD_REQUEST` for body validation.

## PATCH /api/v1/domain/{id}/appearance

**Access:** Curator/admin. **Request:** Numeric domain `id`; JSON with both
nonblank appearance fields:

```json
{"iconKey":"shield","colorKey":"emerald"}
```

**Response:** `200`, updated domain object. This operation does not rename the domain.
**Errors:** `400` for unsupported/missing appearance values; missing domain
currently returns `500`.

## DELETE /api/v1/domain/{id}

**Access:** Curator/admin. **Request:** Numeric domain `id`; no body.
**Response:** `204`, no body.
**Errors:** `400 DOMAIN_HAS_ASSOCIATED_MODELS` if any models remain; missing
domain currently returns `500`.

## Domain contract

```json
{
  "id": 1,
  "name": "Software Development",
  "description": "Engineering practices",
  "iconKey": "code",
  "colorKey": "blue",
  "maturityModelCount": 2,
  "hasActiveMaturityModel": true
}
```

`maturityModelCount` counts distinct lineages, not individual model versions.
The count is omitted when zero; `hasActiveMaturityModel` is omitted when false.
Treat missing values as `0` and `false` respectively.

Allowed icons: `layers`, `shield`, `code`, `database`, `users`, `settings`,
`compass`, `chart`, `cloud`, `briefcase`.
Allowed colors: `blue`, `emerald`, `violet`, `amber`, `rose`, `slate`.
