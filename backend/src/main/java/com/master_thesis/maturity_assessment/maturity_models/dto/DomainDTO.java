package com.master_thesis.maturity_assessment.maturity_models.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
public class DomainDTO {
    private Long id;
    private String name;
    private String description;
    private String iconKey;
    private String colorKey;

    /** Number of distinct model lineages in this domain; versions count as one model. */
    @JsonInclude(JsonInclude.Include.NON_DEFAULT)
    private long maturityModelCount;
    /** Whether this domain has at least one active maturity model. */
    @JsonInclude(JsonInclude.Include.NON_DEFAULT)
    private boolean hasActiveMaturityModel;
}
