package com.master_thesis.maturity_assessment.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompleteProfileRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String organizationName) {}
