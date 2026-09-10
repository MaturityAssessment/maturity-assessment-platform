package com.master_thesis.maturity_assessment.assistant.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatMessageDTO {

    @NotBlank
    private String role;

    @NotBlank
    private String content;
}
