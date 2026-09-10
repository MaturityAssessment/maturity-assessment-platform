package com.master_thesis.maturity_assessment.maturity_models.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateDomainRequest {
    @NotBlank(message = "Domain name is required")
    private String name;
    
    private String description;

    private String iconKey;

    private String colorKey;
}


