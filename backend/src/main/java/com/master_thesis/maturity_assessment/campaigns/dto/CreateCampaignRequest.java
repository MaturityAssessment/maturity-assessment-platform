package com.master_thesis.maturity_assessment.campaigns.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class CreateCampaignRequest {

    @NotBlank
    @Size(max = 150)
    private String name;

    @NotNull
    @Future
    private Instant endsAt;

    @NotNull
    private Long maturityModelId;

    @NotEmpty
    @Size(max = 1_000)
    private List<@NotBlank @Email @Size(max = 255) String> participantEmails;
}
