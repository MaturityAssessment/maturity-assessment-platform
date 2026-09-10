package com.master_thesis.maturity_assessment.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CompleteHelpTourRequest {

    @NotNull
    @Positive
    private Integer version;
}
