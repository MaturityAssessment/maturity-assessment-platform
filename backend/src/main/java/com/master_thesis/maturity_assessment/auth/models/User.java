package com.master_thesis.maturity_assessment.auth.models;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@Entity
@Table(name = "users")
public class User implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;

    private String password;
    
    private String name;
    
    private String organizationName;
    
    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    private UserApprovalStatus approvalStatus = UserApprovalStatus.APPROVED;

    @Column(name = "help_balloons_enabled", nullable = false)
    private boolean helpBalloonsEnabled = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "completed_help_tours", nullable = false, columnDefinition = "jsonb")
    private Map<String, Integer> completedHelpTours = new LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dismissed_help_tour_prompts", nullable = false, columnDefinition = "jsonb")
    private Map<String, Integer> dismissedHelpTourPrompts = new LinkedHashMap<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RefreshToken> refreshTokens = new ArrayList<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        List<GrantedAuthority> authorities = new ArrayList<>();
        
        // Hierarchical role permissions: higher roles inherit lower role permissions
        switch (role) {
            case ADMIN:
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                authorities.add(new SimpleGrantedAuthority("ROLE_CURATOR"));
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                break;
            case CURATOR:
                authorities.add(new SimpleGrantedAuthority("ROLE_CURATOR"));
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                break;
            case USER:
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                break;
        }
        
        return authorities;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return approvalStatus == UserApprovalStatus.APPROVED;
    }
}
