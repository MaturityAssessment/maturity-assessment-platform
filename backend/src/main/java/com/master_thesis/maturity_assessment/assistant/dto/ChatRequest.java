package com.master_thesis.maturity_assessment.assistant.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ChatRequest {

    @NotEmpty
    @Valid
    private List<ChatMessageDTO> messages;

    private String threadId;
}
