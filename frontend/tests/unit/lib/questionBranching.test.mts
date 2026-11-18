import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateBranching, typedBranchingAnswer, resolveQuestionVisibility, branchingIssues, evidenceIndicatorActive, rewritePracticeBranchingReferences } from "../../../src/lib/questionBranching.ts";
import type { BranchingRule, Question } from "../../../src/api/types.ts";

const fixtures=JSON.parse(readFileSync(new URL("../../../../tests/fixtures/question-branching.json",import.meta.url),"utf8"));
for(const fixture of fixtures.cases) test(fixture.name,()=>assert.equal(evaluateBranching(fixture.expression,code=>fixture.answers[code])??null,fixture.expected));
const rule=(code:string,value:boolean):BranchingRule=>({version:1,when:{kind:"parent",code,predicate:{kind:"in",values:[value]}}});
const question=(id:number,code:string):Question & {clientKey:string}=>({id,code,clientKey:`key-${id}`,type:"boolean",weight:1,text:code,help:""});

test("forward references resolve; hidden defaults and stale answers never activate descendants",()=>{
  const a=question(1,"A"),b={...question(2,"B"),branchingRule:rule("A",true),hiddenScore:1},c={...question(3,"C"),branchingRule:rule("B",true)};
  const values=new Map<Question, boolean>([[a,false],[b,true]]), result=resolveQuestionVisibility([c,b,a],q=>values.get(q));
  assert.equal(result.get(a),true);assert.equal(result.get(b),false);assert.equal(result.get(c),false);
});
test("combined legacy and new graph cycles and duplicate predicates are rejected",()=>{
  const a:Question={...question(1,"A"),dependsOnQuestionCode:"B"},b={...question(2,"B"),branchingRule:rule("A",true)};
  assert.ok(branchingIssues([a,b]).some(issue=>issue.includes("cycles")));
  delete a.dependsOnQuestionCode;
  b.branchingRule={version:1,when:{kind:"and",conditions:[rule("A",true).when,rule("a",false).when]}};
  assert.ok(branchingIssues([a,b]).some(issue=>issue.includes("distinct")));
});
test("indicator group follows question identity through renames, deletion and prefix swaps",()=>{
  const a=question(1,"A"), b={...question(2,"B"),branchingRule:rule("A",true)};
  const before={questions:[a,b],evidenceRequirements:[{code:"r",name:"Report",instructions:"",required:true,format:"ANY" as const,questionCodes:["A"]}]};
  const swapped=rewritePracticeBranchingReferences(before,{...before,questions:[{...a,code:"B"},{...b,code:"A"}]});
  assert.equal(swapped.questions[1].branchingRule?.when.kind,"parent");
  assert.deepEqual(swapped.evidenceRequirements?.[0].questionCodes,["B"]);
  assert.equal(evidenceIndicatorActive(before.evidenceRequirements[0],before.questions,q=>q===b),false);
  const deleted=rewritePracticeBranchingReferences(before,{...before,questions:[{...b,code:"A"}]});
  assert.ok(deleted.evidenceRequirements?.[0].questionCodes?.[0].startsWith("missing:"));
  assert.ok(branchingIssues(deleted.questions,deleted.evidenceRequirements).length>0);
});

test("valid legacy boolean and integer string representations normalize consistently",()=>{
  const q=question(1,"A");
  for(const value of ["yes","true","1","1.0",1,1.0])assert.equal(typedBranchingAnswer(q,value),true);
  for(const value of ["no","false","0","0.0",0,0.0])assert.equal(typedBranchingAnswer(q,value),false);
  assert.equal(typedBranchingAnswer({...q,type:"numeric",rangeMin:0,rangeMax:10}," 1.0 "),1);
});
