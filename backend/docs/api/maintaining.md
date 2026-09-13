# Maintaining API documentation

[API documentation](README.md)

Update these Markdown files in the same change as an API change. No documentation
generator, OpenAPI dependency, or separate documentation server is required.

## Where to make changes

| Change | Documentation to update |
|---|---|
| Add, remove, or rename an endpoint | Functional reference page and the index in `README.md` |
| Request/response field, validation, or status | Endpoint section and its shared contract/example |
| Role, ownership, or token behavior | Endpoint section and `authentication.md` |
| State transition or sequence of calls | Relevant page in `workflows/` |
| Shared error handling, uploads, dates, or versioning | `conventions.md` and affected endpoint exceptions |
| First-request instructions | `getting-started.md` |
| Deployment/environment setup | `backend/README.md` or the project setup guide; link from API docs |

Keep endpoint details in one functional reference page. Link to shared request
and response contracts instead of copying them across operations. Keep the root
and backend READMEs as entry points; do not add a second endpoint catalogue there.

## Endpoint template

Use a level-two heading containing the full method and path so endpoints can be
found by search and linked directly from the index:

````markdown
## POST /api/v1/resource

Purpose and any important side effect.

**Access:** Required role and ownership rule.
**Request:** Content type, path/query/header parameters, body fields, and defaults.

```json
{"exampleField":"example value"}
```

**Response:** Actual success status and response contract or example.
**Errors:** Relevant status/code pairs and the conditions that cause them.
````

For bodyless operations, say “No body.” For optional request bodies, explain what
happens when omitted. For shared schemas, link to a field table and example.
Describe destructive effects, partial-versus-full updates, retry behavior,
ordering, filters, and state restrictions whenever they affect a client.

## Review checklist

1. Read the controller mapping, DTOs, service validation, security matchers,
   method-level permissions, and exception handlers. A DTO field alone does not
   establish whether a value is required or supported.
2. Document actual HTTP statuses and serialization, including empty/text errors,
   enum values, nullable fields, and multipart part names. Do not silently
   describe a preferred behavior that the implementation does not provide.
3. Update examples using fictional data. Ensure each JSON block parses. Replace
   old property names and removed routes across the docs and repository links.
4. Confirm that every controller operation appears in the endpoint index and
   reference. Check each supported content type when mappings share method/path.
5. Check relative links and heading anchors. Review the Markdown rendering.
6. For an implementation change, run the relevant backend tests and exercise the
   changed contract in a suitable local/test environment. Documentation-only
   moves generally need link, example, and coverage checks rather than a full
   application test run. State whether examples were actually executed.

Useful searches from the repository root:

```bash
rg -n '@(Request|Get|Post|Put|Patch|Delete)Mapping' backend/src/main/java
rg -n '@PreAuthorize|requestMatchers' backend/src/main/java
rg -n 'OldFieldName|/old-route' backend/docs README.md frontend/README.md
git diff --check
```

When removing an endpoint, remove it from the current index and document the
replacement in the affected workflow. Label compatibility endpoints explicitly;
do not invent a deprecation deadline. Git history retains previous contracts.

## Sources of truth

The guide describes the implementation in this repository. Controllers establish
routes, DTOs establish serialized shapes, services establish business behavior,
and security/exception configuration establishes access and error behavior.
Reference pages link to the relevant source directories so a reviewer can check
the whole contract. Update the guide whenever any of those layers changes.
