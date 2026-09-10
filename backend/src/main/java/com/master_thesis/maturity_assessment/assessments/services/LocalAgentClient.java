package com.master_thesis.maturity_assessment.assessments.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LocalAgentClient {

    private final LocalAgentProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public LocalAgentClient(
            LocalAgentProperties properties,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        Duration timeout = Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds()));
        requestFactory.setConnectTimeout(timeout);
        requestFactory.setReadTimeout(timeout);

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public JsonNode chatJson(
            String schemaName,
            String systemPrompt,
            String userPrompt,
            Map<String, Object> responseSchema
    ) {
        validateConfiguration();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModel());
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));
        body.put("temperature", properties.getTemperature());
        body.put("max_tokens", properties.getMaxOutputTokens());
        body.put("stream", false);
        body.put("response_format", Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                        "name", schemaName,
                        "strict", true,
                        "schema", responseSchema
                )
        ));

        String responseBody;
        try {
            RestClient.RequestBodySpec request = restClient.post()
                    .uri(normalizedBaseUrl() + "/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON);
            if (StringUtils.hasText(properties.getApiKey())) {
                request.header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getApiKey().trim());
            }
            responseBody = request.body(body).retrieve().body(String.class);
        } catch (RestClientResponseException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Local agent returned " + ex.getStatusCode().value() + ": " + ex.getResponseBodyAsString()
            );
        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Unable to reach the local LM Studio agent: " + ex.getMessage()
            );
        }

        return parseStructuredContent(responseBody);
    }

    public void validateConfiguration() {
        if (!properties.isEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Local agent beta is disabled. Set LOCAL_AGENT_ENABLED=true to use it."
            );
        }
        if (!StringUtils.hasText(properties.getBaseUrl())) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Local agent base URL is not configured."
            );
        }
        if (!StringUtils.hasText(properties.getModel())) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Local agent model is not configured. Set LOCAL_AGENT_MODEL to an LM Studio model id."
            );
        }
    }

    private JsonNode parseStructuredContent(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Local agent returned an empty response.");
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (!content.isTextual() || !StringUtils.hasText(content.asText())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Local agent response did not include choices[0].message.content."
                );
            }
            return objectMapper.readTree(content.asText());
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Local agent returned malformed structured JSON."
            );
        }
    }

    private String normalizedBaseUrl() {
        String value = properties.getBaseUrl().trim();
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }
}
