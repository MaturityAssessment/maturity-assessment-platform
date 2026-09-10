package com.master_thesis.maturity_assessment.assessments.models;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.campaigns.models.Campaign;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;

@Data
@Entity
@Table(name = "assessments")
public class Assessment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double overallAverage;

    @Column(nullable = false)
    private String overallMaturityLevel;

    @Column(nullable = false)
    private Boolean isCompleted = true;

    @Enumerated(EnumType.STRING)
    @Column
    private AssessmentStatus status = AssessmentStatus.COMPLETED;

    @OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<DimensionResult> dimensionResults;

    @OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<com.master_thesis.maturity_assessment.assessments.models.Evidence> evidence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    private Campaign campaign;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_participant_id", unique = true)
    private CampaignParticipant campaignParticipant;

    @Column(name = "overall_percentage_score")
    private Double overallPercentageScore; // 0-100 normalized score

    @Column(name = "maturity_model_id")
    private Long maturityModelId; // Reference to the maturity model used in this assessment

    @Column(name = "evaluator_insight", columnDefinition = "TEXT")
    private String evaluatorInsight; // Optional evaluator guidance for next maturity level

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        syncCompletionFlag();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        syncCompletionFlag();
    }

    private void syncCompletionFlag() {
        if (status == null) {
            status = Boolean.TRUE.equals(isCompleted)
                    ? AssessmentStatus.COMPLETED
                    : AssessmentStatus.PENDING_REVIEW;
        }
        isCompleted = status == AssessmentStatus.COMPLETED;
    }
}
