package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaturityModelEditorImportResponse {
    private boolean success;
    private String message;
    private MaturityModelEditorDTO document;
    private List<String> warnings = new ArrayList<>();
    private String errorDetails;
}
