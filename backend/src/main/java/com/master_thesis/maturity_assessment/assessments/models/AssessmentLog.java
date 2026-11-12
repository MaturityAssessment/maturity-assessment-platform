package com.master_thesis.maturity_assessment.assessments.models;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;

/** Append-only snapshots: actor and target identities survive later edits and item removal. */
@Entity
@Table(name = "assessment_logs")
@Immutable
@Getter
@Setter
public class AssessmentLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, updatable = false)
    private Long assessmentId;
    @Column(nullable = false, updatable = false)
    private Long actorUserId;
    @Column(updatable = false)
    /** Optional campaign membership context; actorUserId always identifies the person. */
    private Long actorCampaignParticipantId;
    @Column(updatable = false)
    private String actorName;
    @Column(updatable = false)
    private String actorEmail;
    @Column(nullable = false, updatable = false)
    private String actorRole;
    @Column(nullable = false, updatable = false)
    private String action;
    @Column(nullable = false, updatable = false)
    private String targetType;
    @Column(nullable = false, updatable = false)
    private Long targetId;
    @Column(nullable = false, updatable = false, columnDefinition = "TEXT")
    private String targetLabel;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(updatable = false, columnDefinition = "jsonb")
    private JsonNode beforeValue;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(updatable = false, columnDefinition = "jsonb")
    private JsonNode afterValue;
    @Column(nullable = false, updatable = false)
    private Instant occurredAt;
}
