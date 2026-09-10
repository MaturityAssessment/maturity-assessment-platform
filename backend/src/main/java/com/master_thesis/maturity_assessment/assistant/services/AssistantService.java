package com.master_thesis.maturity_assessment.assistant.services;

import com.master_thesis.maturity_assessment.assistant.dto.ChatMessageDTO;
import com.master_thesis.maturity_assessment.assistant.dto.ChatRequest;
import com.master_thesis.maturity_assessment.assistant.dto.ChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.net.http.HttpClient;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.List;
import java.util.Map;

@Service
public class AssistantService {

    private final RestClient restClient;
    private final String endpoint;
    private final String channelId;
    private final String apiKey;

    public AssistantService(
            RestClient.Builder restClientBuilder,
            @Value("${iaedu.api.endpoint:${iaedu.api.base-url:}}") String endpoint,
            @Value("${iaedu.api.channel-id:}") String channelId,
            @Value("${iaedu.api.key:}") String apiKey,
            @Value("${iaedu.api.trust-all-ssl:false}") boolean trustAllSsl) {
        this.endpoint = endpoint;
        this.channelId = channelId;
        this.apiKey = apiKey;

        if (trustAllSsl) {
            restClientBuilder.requestFactory(new JdkClientHttpRequestFactory(createTrustAllHttpClient()));
        }

        this.restClient = restClientBuilder
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.TEXT_EVENT_STREAM_VALUE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public ChatResponse ask(ChatRequest request) {
        validateConfiguration();

        MultiValueMap<String, Object> iaeduRequest = new LinkedMultiValueMap<>();
        iaeduRequest.add("channel_id", channelId);
        iaeduRequest.add("thread_id", getThreadId(request));
        iaeduRequest.add("user_info", "{}");
        iaeduRequest.add("message", getLatestUserMessage(request.getMessages()));

        String responseBody;
        try {
            responseBody = restClient.post()
                    .uri(endpoint)
                    .header("x-api-key", apiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(iaeduRequest)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "IAedu assistant API returned "
                            + ex.getStatusCode().value()
                            + ": "
                            + ex.getResponseBodyAsString(),
                    ex);
        } catch (RestClientException ex) {
            throw new IllegalStateException("Unable to reach the IAedu assistant API: " + ex.getMessage(), ex);
        }

        String answer = extractAnswer(responseBody);
        return new ChatResponse(answer);
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(endpoint)) {
            throw new IllegalStateException("IAedu API endpoint is not configured");
        }
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("IAedu API key is not configured");
        }
        if (!StringUtils.hasText(channelId)) {
            throw new IllegalStateException("IAedu channel ID is not configured");
        }
    }

    private String getLatestUserMessage(List<ChatMessageDTO> messages) {
        for (int index = messages.size() - 1; index >= 0; index--) {
            ChatMessageDTO message = messages.get(index);
            if ("user".equals(message.getRole()) && StringUtils.hasText(message.getContent())) {
                return message.getContent();
            }
        }

        throw new IllegalStateException("No user message was provided");
    }

    private String getThreadId(ChatRequest request) {
        if (StringUtils.hasText(request.getThreadId())) {
            return request.getThreadId();
        }

        throw new IllegalStateException("IAedu thread ID is not configured for this chat");
    }

    @SuppressWarnings("unchecked")
    private String extractAnswer(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            throw new IllegalStateException("IAedu returned an empty response");
        }

        StringBuilder tokenAnswer = new StringBuilder();
        StringBuilder finalMessageAnswer = new StringBuilder();
        StringBuilder fallbackAnswer = new StringBuilder();

        for (String line : responseBody.split("\\R")) {
            String trimmedLine = line.trim();
            if (trimmedLine.isEmpty() || "[DONE]".equals(trimmedLine)) {
                continue;
            }

            String payload = trimmedLine.startsWith("data:")
                    ? trimmedLine.substring("data:".length()).trim()
                    : trimmedLine;

            appendTextFromPayload(tokenAnswer, finalMessageAnswer, fallbackAnswer, payload);
        }

        String parsedAnswer = finalMessageAnswer.toString().trim();
        if (!StringUtils.hasText(parsedAnswer)) {
            parsedAnswer = tokenAnswer.toString().trim();
        }
        if (!StringUtils.hasText(parsedAnswer)) {
            parsedAnswer = fallbackAnswer.toString().trim();
        }

        return StringUtils.hasText(parsedAnswer) ? parsedAnswer : responseBody.trim();
    }

    @SuppressWarnings("unchecked")
    private void appendTextFromPayload(
            StringBuilder tokenAnswer,
            StringBuilder finalMessageAnswer,
            StringBuilder fallbackAnswer,
            String payload) {
        if (!StringUtils.hasText(payload) || "[DONE]".equals(payload)) {
            return;
        }

        if (!payload.startsWith("{")) {
            fallbackAnswer.append(payload);
            return;
        }

        try {
            Map<String, Object> event = JsonSupport.OBJECT_MAPPER.readValue(payload, Map.class);
            String eventType = event.get("type") instanceof String type ? type : "";

            if ("token".equals(eventType)) {
                appendIfText(tokenAnswer, event.get("content"));
                return;
            }

            if ("message".equals(eventType)) {
                Object content = event.get("content");
                if (content instanceof Map<?, ?> contentMap) {
                    appendIfText(finalMessageAnswer, contentMap.get("content"));
                } else {
                    appendIfText(finalMessageAnswer, content);
                }
                return;
            }

            appendIfText(fallbackAnswer, event.get("answer"));
            appendIfText(fallbackAnswer, event.get("text"));
            appendIfText(fallbackAnswer, event.get("delta"));
        } catch (Exception ex) {
            fallbackAnswer.append(payload);
        }
    }

    private void appendIfText(StringBuilder answer, Object value) {
        if (value instanceof String text && StringUtils.hasText(text)) {
            answer.append(text);
        }
    }

    private HttpClient createTrustAllHttpClient() {
        try {
            TrustManager[] trustAllManagers = new TrustManager[] {
                    new X509TrustManager() {
                        @Override
                        public void checkClientTrusted(X509Certificate[] chain, String authType) {
                        }

                        @Override
                        public void checkServerTrusted(X509Certificate[] chain, String authType) {
                        }

                        @Override
                        public X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[0];
                        }
                    }
            };

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllManagers, new SecureRandom());

            SSLParameters sslParameters = new SSLParameters();
            sslParameters.setEndpointIdentificationAlgorithm("");

            return HttpClient.newBuilder()
                    .sslContext(sslContext)
                    .sslParameters(sslParameters)
                    .build();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to configure IAedu SSL client", ex);
        }
    }

    private static class JsonSupport {
        private static final com.fasterxml.jackson.databind.ObjectMapper OBJECT_MAPPER =
                new com.fasterxml.jackson.databind.ObjectMapper();
    }
}
