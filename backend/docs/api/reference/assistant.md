# Assistant

[API index](../README.md#endpoint-index)

Sources: [controller](../../../src/main/java/com/master_thesis/maturity_assessment/assistant/controllers/AssistantController.java),
[service](../../../src/main/java/com/master_thesis/maturity_assessment/assistant/services/AssistantService.java).

## POST /api/v1/assistant/chat

Ask the configured IAedu assistant a question.

**Access:** Authenticated.
**Request:** JSON with nonempty `messages` and a nonblank `threadId`. Each message
has nonblank `role` and `content`. Include a message whose role is exactly `user`:

```json
{
  "threadId": "example-conversation",
  "messages": [
    {"role":"user","content":"How do I submit an assessment?"}
  ]
}
```

The backend forwards the **latest user message** and the thread ID to IAedu;
it does not forward the complete supplied history. Reuse the appropriate thread
ID to continue a conversation. There is no thread-creation endpoint here.

**Response:** `200` JSON, not a streaming response:

```json
{"answer":"Open your draft, complete the required questions, and submit it."}
```

The answer above is illustrative and generated content varies.
**Errors:** `400 BAD_REQUEST` for an empty/invalid message list; `503
ASSISTANT_UNAVAILABLE` for missing thread ID, no user message, missing IAedu
configuration, empty upstream response, or upstream connection/API failure.
The service requires a thread ID even though the request DTO does not annotate it
as required. These failures currently share the same `503` error contract.

IAedu configuration belongs to backend deployment settings; API consumers send
their platform bearer token, not the upstream API key. For structured assessment
review suggestions, use [agent evaluation draft](assessments.md#post-apiv1assessmentsidagent-evaluationdraft).
