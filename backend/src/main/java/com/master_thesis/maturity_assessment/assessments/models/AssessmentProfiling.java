package com.master_thesis.maturity_assessment.assessments.models;

import java.util.Map;

/** Answers use stable question/option identities and are separate from scored responses. */
public record AssessmentProfiling(boolean complete, Map<String, String> answers, String profileId, String profileName) {}
