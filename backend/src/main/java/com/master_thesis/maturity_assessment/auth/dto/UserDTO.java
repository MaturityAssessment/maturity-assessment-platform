package com.master_thesis.maturity_assessment.auth.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.models.UserRole;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String email;
    private String name;
    private String organizationName;
    private UserRole role;
    private UserApprovalStatus approvalStatus;
    private boolean helpBalloonsEnabled;
    private Map<String, Integer> completedHelpTours;
    private Map<String, Integer> dismissedHelpTourPrompts;
}
