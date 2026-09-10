package com.master_thesis.maturity_assessment.assessments.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LocalAgentClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parseStructuredContentAcceptsOpenAiCompatibleJsonString() {
        LocalAgentClient client = new LocalAgentClient(new LocalAgentProperties(), objectMapper);
        String response = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "{\\"summary\\":\\"Ready\\",\\"warnings\\":[]}"
                      }
                    }
                  ]
                }
                """;

        JsonNode parsed = ReflectionTestUtils.invokeMethod(client, "parseStructuredContent", response);

        assertEquals("Ready", parsed.path("summary").asText());
    }

    @Test
    void parseStructuredContentRejectsMalformedJsonPayload() {
        LocalAgentClient client = new LocalAgentClient(new LocalAgentProperties(), objectMapper);
        String response = """
                {"choices":[{"message":{"content":"not-json"}}]}
                """;

        assertThrows(
                ResponseStatusException.class,
                () -> ReflectionTestUtils.invokeMethod(client, "parseStructuredContent", response)
        );
    }
}
