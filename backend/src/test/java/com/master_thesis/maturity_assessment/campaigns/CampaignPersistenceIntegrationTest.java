package com.master_thesis.maturity_assessment.campaigns;

import com.master_thesis.maturity_assessment.assessments.models.Assessment;
import com.master_thesis.maturity_assessment.assessments.models.AssessmentStatus;
import com.master_thesis.maturity_assessment.assessments.models.Evidence;
import com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository;
import com.master_thesis.maturity_assessment.assessments.repository.EvidenceRepository;
import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.auth.models.UserApprovalStatus;
import com.master_thesis.maturity_assessment.auth.models.UserRole;
import com.master_thesis.maturity_assessment.auth.repository.UserRepository;
import com.master_thesis.maturity_assessment.campaigns.models.Campaign;
import com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignParticipantRepository;
import com.master_thesis.maturity_assessment.campaigns.repository.CampaignRepository;
import com.master_thesis.maturity_assessment.maturity_models.models.MaturityModel;
import com.master_thesis.maturity_assessment.maturity_models.models.Question;
import com.master_thesis.maturity_assessment.maturity_models.repository.MaturityModelRepository;
import com.master_thesis.maturity_assessment.maturity_models.repository.QuestionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true"
})
class CampaignPersistenceIntegrationTest {

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private CampaignParticipantRepository participantRepository;

    @Autowired
    private AssessmentRepository assessmentRepository;

    @Autowired
    private EvidenceRepository evidenceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MaturityModelRepository maturityModelRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void persistsAndLoadsValidCampaignGraph() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        Campaign campaign = saveCampaign(owner, model);
        CampaignParticipant participant = saveParticipant(campaign, uniqueEmail(), hash('a'));
        Assessment assessment = saveCampaignAssessment(campaign, participant, model, AssessmentStatus.DRAFT);
        Question question = saveQuestion();

        Evidence evidence = new Evidence();
        evidence.setAssessment(assessment);
        evidence.setQuestion(question);
        evidence.setUploadedByCampaignParticipant(participant);
        Evidence savedEvidence = evidenceRepository.saveAndFlush(evidence);

        CampaignParticipant loaded = participantRepository.findByInvitationTokenHash(hash('a'))
                .orElseThrow();
        CampaignParticipant locked = participantRepository
                .findByInvitationTokenHashForUpdate(hash('a'))
                .orElseThrow();
        assertEquals(campaign.getId(), loaded.getCampaign().getId());
        assertEquals(participant.getId(), locked.getId());
        assertEquals(assessment.getId(), loaded.getAssessment().getId());
        assertEquals(participant.getId(), savedEvidence.getUploadedByCampaignParticipant().getId());
        assertFalse(loaded.hasCompleted());
        assertTrue(participantRepository.existsByCampaignIdAndEmailIgnoreCase(
                campaign.getId(),
                loaded.getEmail().toUpperCase()
        ));
        assertEquals(
                assessment.getId(),
                assessmentRepository.findByCampaignParticipantId(participant.getId())
                        .orElseThrow()
                        .getId()
        );
        assertEquals(
                assessment.getId(),
                assessmentRepository.findCampaignAssessmentByIdForUpdate(
                        assessment.getId(),
                        participant.getId()
                ).orElseThrow().getId()
        );
    }

    @Test
    void normalizesParticipantIdentityFields() {
        Campaign campaign = saveCampaign(saveOwner(), saveModel());
        CampaignParticipant participant = saveParticipant(
                campaign,
                "  INVITED." + UUID.randomUUID() + "@EXAMPLE.COM  ",
                "A".repeat(64)
        );

        assertEquals(participant.getEmail(), participant.getEmail().toLowerCase());
        assertEquals(hash('a'), participant.getInvitationTokenHash());
    }

    @Test
    void rejectsDuplicateEmailWithinCampaignIgnoringCase() {
        Campaign campaign = saveCampaign(saveOwner(), saveModel());
        String email = uniqueEmail();
        saveParticipant(campaign, email, hash('a'));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> saveParticipant(campaign, email.toUpperCase(), hash('b'))
        );
    }

    @Test
    void allowsSameEmailInDifferentCampaigns() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        String email = uniqueEmail();

        CampaignParticipant first = saveParticipant(
                saveCampaign(owner, model),
                email,
                hash('a')
        );
        CampaignParticipant second = saveParticipant(
                saveCampaign(owner, model),
                email.toUpperCase(),
                hash('b')
        );

        assertNotNull(first.getId());
        assertNotNull(second.getId());
    }

    @Test
    void rejectsDuplicateInvitationTokenHash() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        saveParticipant(saveCampaign(owner, model), uniqueEmail(), hash('a'));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> saveParticipant(
                        saveCampaign(owner, model),
                        uniqueEmail(),
                        hash('a')
                )
        );
    }

    @Test
    void rejectsCampaignWithMissingCreator() {
        MaturityModel model = saveModel();

        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        """
                        INSERT INTO campaigns (
                            name, ends_at, maturity_model_id, created_by_user_id
                        ) VALUES (?, CURRENT_TIMESTAMP + INTERVAL '1 day', ?, ?)
                        """,
                        "Missing creator",
                        model.getId(),
                        Long.MAX_VALUE
                )
        );
    }

    @Test
    void rejectsBlankCampaignName() {
        User owner = saveOwner();
        MaturityModel model = saveModel();

        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        """
                        INSERT INTO campaigns (
                            name, ends_at, maturity_model_id, created_by_user_id
                        ) VALUES ('   ', CURRENT_TIMESTAMP + INTERVAL '1 day', ?, ?)
                        """,
                        model.getId(),
                        owner.getId()
                )
        );
    }

    @Test
    void rejectsCampaignEndingBeforeCreation() {
        User owner = saveOwner();
        MaturityModel model = saveModel();

        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        """
                        INSERT INTO campaigns (
                            name, ends_at, maturity_model_id, created_by_user_id
                        ) VALUES (?, CURRENT_TIMESTAMP - INTERVAL '1 day', ?, ?)
                        """,
                        "Already ended",
                        model.getId(),
                        owner.getId()
                )
        );
    }

    @Test
    void rejectsCampaignWithMissingModel() {
        User owner = saveOwner();

        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        """
                        INSERT INTO campaigns (
                            name, ends_at, maturity_model_id, created_by_user_id
                        ) VALUES (?, CURRENT_TIMESTAMP + INTERVAL '1 day', ?, ?)
                        """,
                        "Missing model",
                        Long.MAX_VALUE,
                        owner.getId()
                )
        );
    }

    @Test
    void rejectsParticipantWithMissingCampaign() {
        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        """
                        INSERT INTO campaign_participants (
                            campaign_id, email, invitation_token_hash
                        ) VALUES (?, ?, ?)
                        """,
                        Long.MAX_VALUE,
                        uniqueEmail(),
                        hash('a')
                )
        );
    }

    @Test
    void rejectsCampaignAssessmentUsingWrongModel() {
        User owner = saveOwner();
        MaturityModel campaignModel = saveModel();
        MaturityModel otherModel = saveModel();
        Campaign campaign = saveCampaign(owner, campaignModel);
        CampaignParticipant participant = saveParticipant(campaign, uniqueEmail(), hash('a'));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertCampaignAssessment(
                        otherModel.getId(),
                        campaign.getId(),
                        participant.getId(),
                        null
                )
        );
    }

    @Test
    void rejectsParticipantFromAnotherCampaign() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        Campaign firstCampaign = saveCampaign(owner, model);
        Campaign secondCampaign = saveCampaign(owner, model);
        CampaignParticipant firstParticipant = saveParticipant(
                firstCampaign,
                uniqueEmail(),
                hash('a')
        );

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertCampaignAssessment(
                        model.getId(),
                        secondCampaign.getId(),
                        firstParticipant.getId(),
                        null
                )
        );
    }

    @Test
    void rejectsAssessmentWithBothRespondentSources() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        Campaign campaign = saveCampaign(owner, model);
        CampaignParticipant participant = saveParticipant(campaign, uniqueEmail(), hash('a'));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertCampaignAssessment(
                        model.getId(),
                        campaign.getId(),
                        participant.getId(),
                        owner.getId()
                )
        );
    }

    @Test
    void rejectsAssessmentWithNoRespondentSource() {
        MaturityModel model = saveModel();

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertCampaignAssessment(model.getId(), null, null, null)
        );
    }

    @Test
    void rejectsSecondAssessmentForParticipant() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        Campaign campaign = saveCampaign(owner, model);
        CampaignParticipant participant = saveParticipant(campaign, uniqueEmail(), hash('a'));
        saveCampaignAssessment(campaign, participant, model, AssessmentStatus.DRAFT);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertCampaignAssessment(
                        model.getId(),
                        campaign.getId(),
                        participant.getId(),
                        null
                )
        );
    }

    @Test
    void rejectsDeletingCampaignWithAssessmentHistory() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        Campaign campaign = saveCampaign(owner, model);
        CampaignParticipant participant = saveParticipant(campaign, uniqueEmail(), hash('a'));
        saveCampaignAssessment(campaign, participant, model, AssessmentStatus.COMPLETED);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        "DELETE FROM campaigns WHERE id = ?",
                        campaign.getId()
                )
        );
    }

    @Test
    void rejectsEvidenceWithBothUploaderSources() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        Campaign campaign = saveCampaign(owner, model);
        CampaignParticipant participant = saveParticipant(campaign, uniqueEmail(), hash('a'));
        Assessment assessment = saveCampaignAssessment(
                campaign,
                participant,
                model,
                AssessmentStatus.DRAFT
        );
        Question question = saveQuestion();

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertEvidence(
                        assessment.getId(),
                        question.getId(),
                        owner.getId(),
                        participant.getId()
                )
        );
    }

    @Test
    void rejectsEvidenceUploadedByDifferentCampaignParticipant() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        Campaign campaign = saveCampaign(owner, model);
        CampaignParticipant assessmentParticipant = saveParticipant(
                campaign,
                uniqueEmail(),
                hash('a')
        );
        CampaignParticipant otherParticipant = saveParticipant(
                campaign,
                uniqueEmail(),
                hash('b')
        );
        Assessment assessment = saveCampaignAssessment(
                campaign,
                assessmentParticipant,
                model,
                AssessmentStatus.DRAFT
        );
        Question question = saveQuestion();

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertEvidence(
                        assessment.getId(),
                        question.getId(),
                        null,
                        otherParticipant.getId()
                )
        );
    }

    @Test
    void derivesCompletionFromCurrentAssessmentStatus() {
        CampaignParticipant participant = new CampaignParticipant();
        assertFalse(participant.hasCompleted());

        Assessment assessment = new Assessment();
        participant.setAssessment(assessment);

        assessment.setStatus(AssessmentStatus.DRAFT);
        assertFalse(participant.hasCompleted());

        assessment.setStatus(AssessmentStatus.PENDING_REVIEW);
        assertTrue(participant.hasCompleted());

        assessment.setStatus(AssessmentStatus.COMPLETED);
        assertTrue(participant.hasCompleted());

        assessment.setStatus(AssessmentStatus.CHANGES_REQUESTED);
        assertFalse(participant.hasCompleted());
    }

    @Test
    void campaignQueriesReturnParticipantsAndDerivedCompletionCount() {
        User owner = saveOwner();
        MaturityModel model = saveModel();
        Campaign campaign = saveCampaign(owner, model);
        CampaignParticipant draftParticipant =
                saveParticipant(campaign, uniqueEmail(), hash('a'));
        CampaignParticipant completedParticipant =
                saveParticipant(campaign, uniqueEmail(), hash('b'));
        saveCampaignAssessment(
                campaign,
                draftParticipant,
                model,
                AssessmentStatus.DRAFT
        );
        saveCampaignAssessment(
                campaign,
                completedParticipant,
                model,
                AssessmentStatus.PENDING_REVIEW
        );

        assertEquals(2L, participantRepository.countByCampaignId(campaign.getId()));
        assertEquals(
                1L,
                participantRepository.countCompletedByCampaignId(
                        campaign.getId(),
                        List.of(
                                AssessmentStatus.PENDING_REVIEW,
                                AssessmentStatus.COMPLETED
                        )
                )
        );

        List<CampaignParticipant> participants =
                participantRepository.findWithAssessmentByCampaignId(campaign.getId());
        assertEquals(2, participants.size());
        assertEquals(
                1L,
                participants.stream().filter(CampaignParticipant::hasCompleted).count()
        );
    }

    private User saveOwner() {
        User user = new User();
        user.setEmail(uniqueEmail());
        user.setPassword("test-password");
        user.setName("Campaign test owner");
        user.setRole(UserRole.CURATOR);
        user.setApprovalStatus(UserApprovalStatus.APPROVED);
        return userRepository.saveAndFlush(user);
    }

    private MaturityModel saveModel() {
        MaturityModel model = new MaturityModel();
        model.setName("Campaign test model " + UUID.randomUUID());
        model.setDescription("Created by campaign persistence integration tests.");
        model.setIsActive(true);
        model.setAutoEvaluated(true);
        model.setVersion(1);
        return maturityModelRepository.saveAndFlush(model);
    }

    private Campaign saveCampaign(User owner, MaturityModel model) {
        Campaign campaign = new Campaign();
        campaign.setName("Campaign " + UUID.randomUUID());
        campaign.setEndsAt(Instant.now().plusSeconds(86_400));
        campaign.setCreatedBy(owner);
        campaign.setMaturityModel(model);
        return campaignRepository.saveAndFlush(campaign);
    }

    private CampaignParticipant saveParticipant(
            Campaign campaign,
            String email,
            String tokenHash
    ) {
        CampaignParticipant participant = new CampaignParticipant();
        participant.setCampaign(campaign);
        participant.setEmail(email);
        participant.setInvitationTokenHash(tokenHash);
        return participantRepository.saveAndFlush(participant);
    }

    private Assessment saveCampaignAssessment(
            Campaign campaign,
            CampaignParticipant participant,
            MaturityModel model,
            AssessmentStatus status
    ) {
        Assessment assessment = new Assessment();
        assessment.setOverallAverage(0.0);
        assessment.setOverallPercentageScore(0.0);
        assessment.setOverallMaturityLevel("Draft");
        assessment.setIsCompleted(status == AssessmentStatus.COMPLETED);
        assessment.setStatus(status);
        assessment.setMaturityModelId(model.getId());
        assessment.setCampaign(campaign);
        assessment.setCampaignParticipant(participant);
        Assessment saved = assessmentRepository.saveAndFlush(assessment);
        participant.setAssessment(saved);
        return saved;
    }

    private Question saveQuestion() {
        Question question = new Question();
        question.setCode("CAMPAIGN_TEST_" + UUID.randomUUID());
        question.setText("Campaign persistence evidence question");
        question.setType("open_answer");
        return questionRepository.saveAndFlush(question);
    }

    private void insertCampaignAssessment(
            Long maturityModelId,
            Long campaignId,
            Long participantId,
            Long userId
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO assessments (
                    overall_average,
                    overall_maturity_level,
                    overall_percentage_score,
                    is_completed,
                    status,
                    maturity_model_id,
                    user_id,
                    campaign_id,
                    campaign_participant_id,
                    created_at,
                    updated_at
                ) VALUES (0, 'Draft', 0, FALSE, 'DRAFT', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                maturityModelId,
                userId,
                campaignId,
                participantId
        );
    }

    private void insertEvidence(
            Long assessmentId,
            Long questionId,
            Long uploadedByUserId,
            Long uploadedByParticipantId
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO evidence (
                    assessment_id,
                    question_id,
                    evidence_type,
                    uploaded_at,
                    uploaded_by_user_id,
                    uploaded_by_campaign_participant_id
                ) VALUES (?, ?, 'FILE', CURRENT_TIMESTAMP, ?, ?)
                """,
                assessmentId,
                questionId,
                uploadedByUserId,
                uploadedByParticipantId
        );
    }

    private String uniqueEmail() {
        return "campaign-" + UUID.randomUUID() + "@example.com";
    }

    private String hash(char value) {
        return String.valueOf(Character.toLowerCase(value)).repeat(64);
    }
}
