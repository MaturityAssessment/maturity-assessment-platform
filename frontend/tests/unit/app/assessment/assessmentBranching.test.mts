import test from "node:test";
import assert from "node:assert/strict";
import type { AssessmentPracticeStep } from "../../../../src/app/assessment/AssessmentStep.tsx";
import { getFieldName, isPracticeRequiredComplete, pruneDisabledQuestionData } from "../../../../src/app/assessment/assessmentFlowUtils.ts";
import { collectQuestionResponses } from "../../../../src/app/assessment/assessmentQuestionResponses.ts";
import { getPracticeEvidenceField } from "../../../../src/app/assessment/assessmentEvidence.ts";
import type { AssessmentData } from "../../../../src/api/types.ts";

function fixture() {
  const step: AssessmentPracticeStep = {
    key:"practice-1",dimension:{id:"D",name:"Dimension",modules:[]},module:{code:"M",name:"Module",practices:[]},
    practice:{id:1,code:"P",name:"Practice",questions:[
      {id:1,code:"A",type:"boolean",weight:1,text:"Root",help:"",required:true,allowNotApplicable:true,notApplicableScore:0.4},
      {id:2,code:"B",type:"boolean",weight:1,text:"Child",help:"",required:true,hiddenScore:0.5,
        branchingRule:{version:1,when:{kind:"parent",code:"A",predicate:{kind:"in",values:[true]}}}},
    ],evidenceRequirements:[{code:"report",name:"Report",instructions:"",required:true,format:"ANY",questionCodes:["B"]}]},
  };
  return {step,root:getFieldName(step,step.practice.questions[0]),child:getFieldName(step,step.practice.questions[1])};
}
test("hidden defaults do not invent submitted answers or require their indicator",()=>{
  const {step,root,child}=fixture();const data:AssessmentData={[root]:0,[child]:1,[`${child}_justification`]:"Stale"};
  const pruned=pruneDisabledQuestionData([step],data);
  assert.ok(pruned.removedFields.has(child));assert.equal(pruned.formData[child],undefined);
  assert.equal(isPracticeRequiredComplete(step,pruned.formData,new Map()),true);
  const responses=collectQuestionResponses([step],pruned.formData);
  assert.deepEqual(Object.keys(responses),[root]);assert.equal(responses[root].response,0);
});
test("visible child restores required answer and evidence checks without deleting retained evidence",()=>{
  const {step,root,child}=fixture();const data:AssessmentData={[root]:1};const evidence=new Map();
  assert.equal(isPracticeRequiredComplete(step,data,evidence),false);
  data[child]=0;assert.equal(isPracticeRequiredComplete(step,data,evidence),false);
  evidence.set(getPracticeEvidenceField(1),[{id:"report",evidenceId:3,practiceId:1,requirementCode:"report",type:"text",description:"Retained report",file:null,url:""}]);
  assert.equal(isPracticeRequiredComplete(step,data,evidence),true);
  data[root]=0;pruneDisabledQuestionData([step],data);
  assert.equal(evidence.get(getPracticeEvidenceField(1)).length,1);
});
test("permitted scored NA satisfies the required root and can explicitly reveal a child",()=>{
  const {step,root,child}=fixture();step.practice.questions[1].branchingRule!.when={kind:"parent",code:"A",predicate:{kind:"in",values:[{notApplicable:true}]}};
  const data:AssessmentData={[root]:{notApplicable:true}};
  assert.equal(isPracticeRequiredComplete(step,data,new Map()),false);
  data[child]=1;
  const responses=collectQuestionResponses([step],data);
  assert.deepEqual(responses[root].response,{notApplicable:true});assert.ok(responses[child]);
});
