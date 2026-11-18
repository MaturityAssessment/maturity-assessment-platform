package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.*;
import com.master_thesis.maturity_assessment.maturity_models.models.*;
import org.junit.jupiter.api.Test;
import java.nio.file.Path;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class QuestionBranchingTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private BranchingRule rule(String code, Object value) throws Exception {
        return new BranchingRule(1, mapper.readTree("{\"kind\":\"parent\",\"code\":\"" + code + "\",\"predicate\":{\"kind\":\"in\",\"values\":[" + mapper.writeValueAsString(value) + "]}}"));
    }
    @Test void sharedTruthTables() throws Exception {
        var fixtures = mapper.readTree(Path.of("../tests/fixtures/question-branching.json").toFile());
        for (var fixture : fixtures.get("cases")) {
            var expected = fixture.get("expected");
            assertEquals(expected.isNull() ? null : expected.booleanValue(),
                    QuestionBranching.evaluate(fixture.get("expression"), code -> {
                        var value = fixture.get("answers").get(code); return value == null || value.isNull() ? null : value;
                    }), fixture.get("name").asText());
        }
    }
    @Test void mixedGraphRejectsCyclesDuplicateParentsAndCrossPracticeReferences() throws Exception {
        QuestionDTO a = new QuestionDTO(); a.setCode("A"); a.setType("boolean");
        QuestionDTO b = new QuestionDTO(); b.setCode("B"); b.setType("boolean"); b.setBranchingRule(rule("A", true));
        PracticeDTO practice = new PracticeDTO(); practice.setQuestions(List.of(a,b));
        assertDoesNotThrow(() -> QuestionBranching.validate(practice));
        a.setDependsOnQuestionCode("B");
        assertThrows(IllegalOperationException.class, () -> QuestionBranching.validate(practice));
        a.setDependsOnQuestionCode(null);
        b.setBranchingRule(new BranchingRule(1, mapper.readTree("{\"kind\":\"and\",\"conditions\":[" + rule("A", true).when() + "," + rule("a", false).when() + "]}")));
        assertThrows(IllegalOperationException.class, () -> QuestionBranching.validate(practice));
        b.setBranchingRule(rule("outside", true));
        assertThrows(IllegalOperationException.class, () -> QuestionBranching.validate(practice));
    }
    @Test void strictSchemaAndTypedValues() throws Exception {
        assertThrows(Exception.class, () -> mapper.readValue("{\"version\":1,\"when\":{},\"effect\":\"withheld\"}", BranchingRule.class));
        QuestionDTO a = new QuestionDTO(); a.setCode("A"); a.setType("numeric"); a.setRangeMin(0); a.setRangeMax(10);
        QuestionDTO b = new QuestionDTO(); b.setCode("B"); b.setType("boolean"); b.setBranchingRule(rule("A", 11));
        PracticeDTO practice = new PracticeDTO(); practice.setQuestions(List.of(a,b));
        assertThrows(IllegalOperationException.class, () -> QuestionBranching.validate(practice));
        b.setBranchingRule(rule("A", 5)); b.setHiddenScore(0.0);
        assertDoesNotThrow(() -> QuestionBranching.validate(practice));
        b.setHiddenScore(Double.NaN);
        assertThrows(IllegalOperationException.class, () -> QuestionBranching.validate(practice));
        b.setHiddenScore(null); b.setBranchingRule(rule("A", Map.of("notApplicable",true)));
        assertThrows(IllegalOperationException.class, () -> QuestionBranching.validate(practice));
        a.setAllowNotApplicable(true);
        assertDoesNotThrow(() -> QuestionBranching.validate(practice));
    }
    @Test void hiddenDefaultAndStaleAnswerDoNotActivateDescendantsAndOrderDoesNotMatter() throws Exception {
        Question a = question(1,"A"), b = question(2,"B"), c = question(3,"C");
        b.setBranchingRule(rule("A", true)); b.setHiddenScore(1.0); c.setBranchingRule(rule("B", true));
        Practice practice = new Practice(); practice.setQuestions(List.of(c,b,a));
        for (var q : practice.getQuestions()) q.setPractice(practice);
        Map<Long, QuestionDependencies.Answer> answers = Map.of(1L,new QuestionDependencies.Answer(false,null),2L,new QuestionDependencies.Answer(true,null));
        var result = QuestionBranching.resolve(practice.getQuestions(), answers::get, mapper);
        assertTrue(result.get(a)); assertFalse(result.get(b)); assertFalse(result.get(c));
    }
    @Test void scoredNaAndChoiceIdentityAreIndependentOfScores() throws Exception {
        Question a = question(1,"A"), b = question(2,"B");
        a.setAllowNotApplicable(true); a.setNotApplicableScore(0.0); b.setBranchingRule(rule("A", Map.of("notApplicable",true)));
        Practice practice = new Practice(); practice.setQuestions(List.of(a,b)); a.setPractice(practice); b.setPractice(practice);
        assertTrue(QuestionBranching.resolve(practice.getQuestions(), id -> id == 1 ? new QuestionDependencies.Answer(Map.of("notApplicable",true),null) : null, mapper).get(b));
        a.setType("multiple_choice"); a.setChoiceOptions("[{\"id\":\"a\",\"label\":\"A\",\"score\":0.5},{\"id\":\"b\",\"label\":\"B\",\"score\":0.5}]");
        b.setBranchingRule(rule("A", "b"));
        assertTrue(QuestionBranching.resolve(practice.getQuestions(), id -> id == 1 ? new QuestionDependencies.Answer(0.5,1) : null, mapper).get(b));
        assertFalse(QuestionBranching.resolve(practice.getQuestions(), id -> id == 1 ? new QuestionDependencies.Answer(0.5,0) : null, mapper).get(b));
        assertFalse(QuestionBranching.resolve(practice.getQuestions(), id -> id == 1 ? new QuestionDependencies.Answer(0.5,null) : null, mapper).get(b));
    }
    @Test void evidenceGroupUsesVisibilityNotScoresAndRetainsWholePracticeDefault() {
        Question a=question(1,"A"), b=question(2,"B");
        Practice practice=new Practice(); practice.setQuestions(List.of(a,b));
        EvidenceRequirement requirement=new EvidenceRequirement("report","Report","",true,EvidenceRequirement.Format.ANY);
        requirement.setQuestionCodes(List.of("B")); b.setHiddenScore(1.0);
        assertFalse(EvidenceApplicability.active(requirement,practice,q->q==a));
        assertTrue(EvidenceApplicability.active(requirement,practice,q->q==b));
        requirement.setQuestionCodes(null);
        assertTrue(EvidenceApplicability.active(requirement,practice,q->q==a));
        requirement.setQuestionCodes(List.of("B"));
        assertEquals(List.of("B"),requirement.copy().getQuestionCodes());
    }
    @Test void historicalSnapshotsWithoutNewMetadataRemainReadable() throws Exception {
        var result = mapper.readValue("{\"elementType\":\"question\",\"state\":\"computed\",\"normalizedScore\":0,\"includedCount\":100,\"coverage\":100}",
                com.master_thesis.maturity_assessment.assessments.models.AssessmentElementResult.class);
        assertEquals(0.0,result.normalizedScore());assertNull(result.visible());assertNull(result.scoreSource());
    }
    @Test void acceptedLegacyBooleanAndNumericRepresentationsNormalizeForBranching() throws Exception {
        Question a=question(1,"A"),b=question(2,"B");
        Practice practice=new Practice();practice.setQuestions(List.of(a,b));a.setPractice(practice);b.setPractice(practice);
        b.setBranchingRule(rule("A",true));
        for(Object value:List.of("yes","true","1","1.0",1,1.0))
            assertTrue(QuestionBranching.resolve(practice.getQuestions(),id->id==1?new QuestionDependencies.Answer(value,null):null,mapper).get(b));
        b.setBranchingRule(rule("A",false));
        for(Object value:List.of("no","false","0","0.0",0,0.0))
            assertTrue(QuestionBranching.resolve(practice.getQuestions(),id->id==1?new QuestionDependencies.Answer(value,null):null,mapper).get(b));
        a.setType("numeric");a.setRangeMin(0);a.setRangeMax(10);b.setBranchingRule(rule("A",1));
        assertTrue(QuestionBranching.resolve(practice.getQuestions(),id->id==1?new QuestionDependencies.Answer(" 1.0 ",null):null,mapper).get(b));
        QuestionDTO parent=new QuestionDTO();parent.setCode("A");parent.setType("numeric");parent.setRangeMin(0);parent.setRangeMax(10);
        QuestionDTO child=new QuestionDTO();child.setCode("B");child.setType("boolean");
        child.setBranchingRule(new BranchingRule(1,mapper.readTree("{\"kind\":\"parent\",\"code\":\"A\",\"predicate\":{\"kind\":\"in\",\"values\":[1,1.0]}}")));
        PracticeDTO definition=new PracticeDTO();definition.setQuestions(List.of(parent,child));
        assertThrows(IllegalOperationException.class,()->QuestionBranching.validate(definition));
    }
    private Question question(long id,String code) { Question q=new Question();q.setId(id);q.setCode(code);q.setType("boolean");return q; }
}
