package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CsvUploadResponse {
    private boolean success;
    private String message;
    private MaturityModelDTO maturityModel;
    private String errorDetails;
}
