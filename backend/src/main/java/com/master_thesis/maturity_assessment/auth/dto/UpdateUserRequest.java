package com.master_thesis.maturity_assessment.auth.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import com.master_thesis.maturity_assessment.auth.models.UserRole;

@Getter
@Setter
@NoArgsConstructor
public class UpdateUserRequest {
    private String email;
    private String password; // Optional - only set if you want to change it
    private UserRole role;
}

