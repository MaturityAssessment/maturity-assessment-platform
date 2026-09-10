package com.master_thesis.maturity_assessment.maturity_models.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateDomainAppearanceRequest {
    @NotBlank(message = "Domain icon is required")
    private String iconKey;

    @NotBlank(message = "Domain color is required")
    private String colorKey;
}
