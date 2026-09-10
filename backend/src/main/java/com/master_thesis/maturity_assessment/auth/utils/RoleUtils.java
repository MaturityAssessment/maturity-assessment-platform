package com.master_thesis.maturity_assessment.auth.utils;

import com.master_thesis.maturity_assessment.auth.models.UserRole;

public class RoleUtils {

    /**
     * Checks if a user role has the required permission based on hierarchical role system.
     * Higher roles inherit all lower role permissions.
     * 
     * @param userRole The role of the user
     * @param requiredRole The minimum role required for the operation
     * @return true if userRole has the required permission, false otherwise
     */
    public static boolean hasRequiredRole(UserRole userRole, UserRole requiredRole) {
        if (userRole == null || requiredRole == null) {
            return false;
        }

        // Role hierarchy: ADMIN > CURATOR > USER
        switch (requiredRole) {
            case USER:
                // All roles have USER permission
                return true;
            case CURATOR:
                // CURATOR and ADMIN have CURATOR permission
                return userRole == UserRole.CURATOR || 
                       userRole == UserRole.ADMIN;
            case ADMIN:
                // Only ADMIN has ADMIN permission
                return userRole == UserRole.ADMIN;
            default:
                return false;
        }
    }
}
