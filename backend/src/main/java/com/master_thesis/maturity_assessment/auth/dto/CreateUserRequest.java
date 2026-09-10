package com.master_thesis.maturity_assessment.auth.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import com.master_thesis.maturity_assessment.auth.models.UserRole;

@Getter
@Setter
@NoArgsConstructor
public class CreateUserRequest {
    private String email;
    private String password;
    private UserRole role;
}

