package com.master_thesis.maturity_assessment.assistant.controllers;

import com.master_thesis.maturity_assessment.assistant.dto.ChatRequest;
import com.master_thesis.maturity_assessment.assistant.dto.ChatResponse;
import com.master_thesis.maturity_assessment.assistant.services.AssistantService;
import com.master_thesis.maturity_assessment.config.ErrorResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        return ResponseEntity.ok(assistantService.ask(request));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleAssistantUnavailable(IllegalStateException ex) {
        ErrorResponse errorResponse = new ErrorResponse(
                "ASSISTANT_UNAVAILABLE",
                ex.getMessage());

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorResponse);
    }
}
