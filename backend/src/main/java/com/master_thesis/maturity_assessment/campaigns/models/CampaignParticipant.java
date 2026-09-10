package com.master_thesis.maturity_assessment.campaigns.models;

import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "campaign_participants")
@Data
@NoArgsConstructor
@ToString(exclude = { "campaign", "assessment" })
@EqualsAndHashCode(exclude = { "campaign", "assessment" })
public class CampaignParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "invitation_token_hash", nullable = false, unique = true, length = 64)
    private String invitationTokenHash;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @OneToOne(mappedBy = "campaignParticipant", fetch = FetchType.LAZY)
    private Assessment assessment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void normalizeIdentityFields() {
        if (email != null) {
            email = email.trim().toLowerCase(Locale.ROOT);
        }
        if (invitationTokenHash != null) {
            invitationTokenHash = invitationTokenHash.trim().toLowerCase(Locale.ROOT);
        }
    }

    @Transient
    public boolean hasCompleted() {
        if (assessment == null || assessment.getStatus() == null) {
            return false;
        }
        AssessmentStatus status = assessment.getStatus();
        return status == AssessmentStatus.PENDING_REVIEW
                || status == AssessmentStatus.COMPLETED;
    }
}
