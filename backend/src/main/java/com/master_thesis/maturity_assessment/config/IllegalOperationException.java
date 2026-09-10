package com.master_thesis.maturity_assessment.config;

public class IllegalOperationException extends RuntimeException {
    private final String errorCode;

    public IllegalOperationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}

