package com.master_thesis.maturity_assessment.auth.models;

public enum UserRole {
    ADMIN("ADMIN"),
    CURATOR("CURATOR"),
    USER("USER");

    private final String roleName;

    UserRole(String roleName) {
        this.roleName = roleName;
    }

    public String getRoleName() {
        return roleName;
    }

    @Override
    public String toString() {
        return roleName;
    }
}