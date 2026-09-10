package com.master_thesis.maturity_assessment.config;

public final class TextLimits {
    public static final int CODE = 64;
    public static final int NAME = 150;
    public static final int QUESTION_TEXT = 500;
    public static final int SHORT_GUIDANCE = 500;
    public static final int DESCRIPTION = 2_000;
    public static final int CHANGELOG = 50_000;
    public static final int OPEN_ANSWER = 10_000;

    private TextLimits() {}

    public static void requireAtMost(String value, int limit, String field) {
        if (value != null && value.length() > limit) {
            throw new IllegalOperationException("TEXT_TOO_LONG",
                    field + " must be " + limit + " characters or fewer.");
        }
    }
}
