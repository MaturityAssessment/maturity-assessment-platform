package com.master_thesis.maturity_assessment.auth.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Getter
@Setter
@NoArgsConstructor
public class CreateUserRequest {
    @NotBlank(message = "Email is required.")
    @Email(message = "Enter a valid email address.")
    @Size(max = 255, message = "Email must contain at most 255 characters.")
    private String email;
    @NotBlank(message = "Name is required.")
    @Size(max = 255, message = "Name must contain at most 255 characters.")
    private String name;
    @NotBlank(message = "Organization is required.")
    @Size(max = 255, message = "Organization must contain at most 255 characters.")
    private String organizationName;
    private UserRole role;

    public void setEmail(String email) {
        this.email = email == null ? null : email.trim();
    }
}

