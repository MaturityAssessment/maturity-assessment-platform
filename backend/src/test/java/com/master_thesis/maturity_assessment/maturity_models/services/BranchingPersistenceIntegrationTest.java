package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import com.master_thesis.maturity_assessment.maturity_models.repository.DomainRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.context.TestPropertySource;
import java.io.ByteArrayInputStream;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

/** Explicitly enabled only against a disposable database: Hibernate creates its schema. */
@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"})
@EnabledIfEnvironmentVariable(named = "BRANCHING_PERSISTENCE_TEST", matches = "true")
@Import({MaturityModelService.class,MaturityModelExcelService.class,CsvParsingService.class,BranchingPersistenceIntegrationTest.Json.class,
        com.master_thesis.maturity_assessment.assessments.services.AssessmentService.class,
        com.master_thesis.maturity_assessment.assessments.services.AssessmentEvidenceWorkflowService.class,
        com.master_thesis.maturity_assessment.assessments.services.AssessmentAuditService.class,
        com.master_thesis.maturity_assessment.assessments.services.EvidenceLifecycleService.class,
        com.master_thesis.maturity_assessment.assessments.services.EvidenceService.class,
        com.master_thesis.maturity_assessment.assessments.services.FileStorageService.class,
        MaturityScoringService.class})
class BranchingPersistenceIntegrationTest {
    @TestConfiguration static class Json { @Bean ObjectMapper objectMapper() { return new ObjectMapper(); } }
    @Autowired EntityManager entities;
    @Autowired MaturityModelService models;
    @Autowired MaturityModelExcelService excel;
    @Autowired DomainRepository domains;
    @Autowired ObjectMapper mapper;
    @Autowired com.master_thesis.maturity_assessment.assessments.services.AssessmentService assessments;
    @Autowired com.master_thesis.maturity_assessment.assessments.services.AssessmentEvidenceWorkflowService workflow;
    @Autowired com.master_thesis.maturity_assessment.assessments.services.EvidenceService evidence;
    @Autowired com.master_thesis.maturity_assessment.auth.repository.UserRepository users;
    @Autowired com.master_thesis.maturity_assessment.assessments.repository.AssessmentRepository assessmentRepository;
    @Autowired com.master_thesis.maturity_assessment.assessments.repository.QuestionEvaluationRepository responses;

    @Test void branchingAndGroupsSurvivePersistReloadExcelAndNewVersion() throws Exception {
        Domain domain=new Domain(); domain.setName("Branching integration"); domain.setIconKey("layers"); domain.setColorKey("blue");
        domain=domains.saveAndFlush(domain);
        var source=MaturityModelExcelServiceTest.buildOfficialTemplateModel(); source.setDomainId(domain.getId());
        var editor=models.prepareEditorDocument(source);
        var practice=editor.getDimensions().getFirst().getModules().getFirst().getPractices().getFirst();
        var parent=practice.getQuestions().getFirst(); var child=practice.getQuestions().getLast();
        child.setDependsOnQuestionCode(null);child.setDependencyCondition(null);
        child.setBranchingRule(new BranchingRule(1,mapper.readTree("{\"kind\":\"parent\",\"code\":\""+parent.getCode()+"\",\"predicate\":{\"kind\":\"answered\"}}")));
        child.setHiddenScore(0.0);
        var requirement=new EvidenceRequirement("report","Report","",true,EvidenceRequirement.Format.ANY);
        requirement.setQuestionCodes(List.of(child.getCode()));practice.setEvidenceRequirements(List.of(requirement));
        var created=models.createFromEditor(editor);entities.flush();entities.clear();
        var reloaded=models.getMaturityModelById(created.getId());
        var stored=reloaded.getDimensions().getFirst().getModules().getFirst().getPractices().getFirst();
        assertEquals(child.getBranchingRule(),stored.getQuestions().getLast().getBranchingRule());
        assertEquals(0.0,stored.getQuestions().getLast().getHiddenScore());
        assertEquals(List.of(child.getCode()),stored.getEvidenceRequirements().getFirst().getQuestionCodes());
        var parsed=excel.parseExcelWorkbook(new ByteArrayInputStream(excel.exportMaturityModelToXlsx(reloaded)));
        assertTrue(parsed.isSuccess(),parsed.getErrorDetails());parsed.getMaturityModel().setDomainId(domain.getId());
        var version=models.createVersionFromEditor(created.getId(),models.prepareEditorDocument(parsed.getMaturityModel()));
        entities.flush();entities.clear();
        var next=models.getMaturityModelById(version.getId()).getDimensions().getFirst().getModules().getFirst().getPractices().getFirst();
        assertEquals(2,version.getVersion());
        assertEquals(child.getBranchingRule(),next.getQuestions().getLast().getBranchingRule());
        assertEquals(stored.getEvidenceRequirements(),next.getEvidenceRequirements());
        assertEquals(0.0,next.getQuestions().getLast().getHiddenScore());
    }

    @Test void apiDraftSubmissionAndCampaignAgreeOnDefaultsEvidenceAndStoredResults() throws Exception {
        var user=new com.master_thesis.maturity_assessment.auth.models.User();user.setEmail("branching-api@example.test");
        user.setRole(com.master_thesis.maturity_assessment.auth.models.UserRole.USER);user=users.saveAndFlush(user);
        Domain domain=new Domain();domain.setName("API integration");domain.setIconKey("layers");domain.setColorKey("blue");domain=domains.saveAndFlush(domain);
        var source=MaturityModelExcelServiceTest.buildOfficialTemplateModel();source.setDomainId(domain.getId());
        var editor=models.prepareEditorDocument(source);editor.setAutoEvaluated(true);
        var dimension=editor.getDimensions().getFirst();var module=dimension.getModules().getFirst();var practice=module.getPractices().getFirst();
        editor.setDimensions(List.of(dimension));dimension.setModules(List.of(module));module.setPractices(List.of(practice));
        var root=practice.getQuestions().getFirst();var child=practice.getQuestions().getLast();
        practice.setQuestions(List.of(root,child));root.setType("boolean");root.setRequired(true);root.setAllowNotApplicable(true);root.setNotApplicableScore(0.25);
        root.setDependsOnQuestionCode(null);root.setDependencyCondition(null);
        child.setType("boolean");child.setRequired(true);child.setDependsOnQuestionCode(null);child.setDependencyCondition(null);
        child.setBranchingRule(new BranchingRule(1,mapper.readTree("{\"kind\":\"parent\",\"code\":\""+root.getCode()+"\",\"predicate\":{\"kind\":\"in\",\"values\":[true]}}")));
        child.setHiddenScore(0.5);practice.setAggregationRule(AggregationRule.AVERAGE);
        var requirement=new EvidenceRequirement("report","Report","",true,EvidenceRequirement.Format.ANY);requirement.setQuestionCodes(List.of(child.getCode()));
        practice.setEvidenceRequirements(List.of(requirement));
        var model=models.createFromEditor(editor);var entity=entities.find(MaturityModel.class,model.getId());entity.setIsActive(true);entities.flush();
        var stored=model.getDimensions().getFirst().getModules().getFirst().getPractices().getFirst();
        var storedRoot=stored.getQuestions().getFirst();var storedChild=stored.getQuestions().getLast();
        String prefix=model.getDimensions().getFirst().getId()+"_"+module.getCode()+"_"+stored.getId()+"_";
        var answer=new com.master_thesis.maturity_assessment.assessments.dto.QuestionResponseRequest();answer.setQuestionId(storedRoot.getId());answer.setResponse(false);
        var request=new com.master_thesis.maturity_assessment.assessments.dto.AssessmentRequest();request.setMaturityModelId(model.getId());request.setQuestionResponses(java.util.Map.of(prefix+storedRoot.getId(),answer));
        var controller=new com.master_thesis.maturity_assessment.assessments.controllers.AssessmentController(assessments,evidence,workflow,
                org.mockito.Mockito.mock(com.master_thesis.maturity_assessment.assessments.services.LocalAgentEvaluationService.class),mapper);
        var http=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(controller).build();
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(user,"",user.getAuthorities()));
        try {
            http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/assessments/drafts")
                    .contentType("application/json").content(mapper.writeValueAsBytes(request)))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
            var submitted=http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/v1/assessments")
                    .file(new org.springframework.mock.web.MockMultipartFile("assessment","","application/json",mapper.writeValueAsBytes(request)))
                    .param("evidenceMetadata","[]")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk()).andReturn();
            var result=mapper.readTree(submitted.getResponse().getContentAsByteArray());assertEquals("COMPLETED",result.path("status").asText());
            long id=result.get("id").longValue();entities.flush();entities.clear();
            var assessment=assessmentRepository.findById(id).orElseThrow();
            var snapshot=assessment.getElementResults().stream().filter(row->"question".equals(row.elementType())&&storedChild.getCode().equals(row.questionCode())).findFirst().orElseThrow();
            assertEquals(false,snapshot.visible());assertEquals("default",snapshot.scoreSource());assertEquals(0.5,snapshot.normalizedScore());
            assertEquals(1,responses.findByAssessmentIdOrderByIdAsc(id).size());
            assertEquals(100,assessment.getElementResults().stream().filter(row->"practice".equals(row.elementType())).findFirst().orElseThrow().coverage());
            var campaign=new com.master_thesis.maturity_assessment.campaigns.models.Campaign();campaign.setName("Branching campaign");campaign.setEndsAt(java.time.Instant.now().plusSeconds(3600));
            campaign.setMaturityModel(entities.find(MaturityModel.class,model.getId()));campaign.setCreatedBy(entities.find(com.master_thesis.maturity_assessment.auth.models.User.class,user.getId()));entities.persist(campaign);
            var participant=new com.master_thesis.maturity_assessment.campaigns.models.CampaignParticipant();participant.setCampaign(campaign);participant.setUser(campaign.getCreatedBy());participant.setEmail(user.getEmail());entities.persist(participant);entities.flush();
            assessments.ensureCampaignAssessment(participant);
            var campaignResult=workflow.submitCampaignAssessment(request,participant,List.of(),List.of(),List.of());
            assertEquals(assessment.getElementResults(),campaignResult.getElementResults());
            // A visible child restores its required evidence obligation; no upload was invented or deleted.
            answer.setResponse(true);
            var childAnswer=new com.master_thesis.maturity_assessment.assessments.dto.QuestionResponseRequest();childAnswer.setQuestionId(storedChild.getId());childAnswer.setResponse(true);
            request.setQuestionResponses(java.util.Map.of(prefix+storedRoot.getId(),answer,prefix+storedChild.getId(),childAnswer));
            http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/v1/assessments")
                    .file(new org.springframework.mock.web.MockMultipartFile("assessment","","application/json",mapper.writeValueAsBytes(request)))
                    .param("evidenceMetadata","[]")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
        } finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    }

    @Test void actualV59MigrationPreservesLegacyRowsAndDoesNotInventDefaults() {
        Practice practice=new Practice();practice.setCode("P");practice.setName("Practice");
        practice.setEvidenceRequirements(List.of(new EvidenceRequirement("report","Report","",true,EvidenceRequirement.Format.ANY)));
        Question question=new Question();question.setCode("Q");question.setText("Question");question.setType("boolean");question.setPractice(practice);
        practice.setQuestions(List.of(question));entities.persist(practice);entities.flush();entities.clear();
        entities.unwrap(Session.class).doWork(connection->{
            try(var statement=connection.createStatement()) {
                statement.execute("ALTER TABLE questions DROP COLUMN branching_rule, DROP COLUMN hidden_score");
                statement.execute("ALTER TABLE practice_evidence_requirements DROP COLUMN question_codes");
            }
            new ResourceDatabasePopulator(new ClassPathResource("db/migration/V59__add_question_branching_and_indicator_groups.sql")).populate(connection);
        });
        var reloaded=entities.find(Question.class,question.getId());
        assertNull(reloaded.getBranchingRule());assertNull(reloaded.getHiddenScore());assertEquals("Question",reloaded.getText());
        assertNull(entities.find(Practice.class,practice.getId()).getEvidenceRequirements().getFirst().getQuestionCodes());
        entities.unwrap(Session.class).doWork(connection->{
            var metadata=connection.getMetaData();
            try(var columns=metadata.getColumns(null,null,"questions","branching_rule")){assertTrue(columns.next());assertEquals("jsonb",columns.getString("TYPE_NAME"));}
        });
    }
}
