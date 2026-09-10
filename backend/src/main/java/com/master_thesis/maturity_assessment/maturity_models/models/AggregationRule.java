package com.master_thesis.maturity_assessment.maturity_models.models;

/**
 * Supported rules for rolling child scores up to the next model granularity.
 */
public enum AggregationRule {
    AVERAGE,
    WEIGHTED_AVERAGE,
    MINIMUM,
    MAXIMUM,
    SUM,
    MEDIAN
}
