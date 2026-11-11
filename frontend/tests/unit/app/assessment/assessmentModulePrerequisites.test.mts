import test from "node:test";
import assert from "node:assert/strict";
import type { MaturityModel, AssessmentData, AssessmentEvidenceInputItem } from "../../../../src/api/types.ts";
import { getModulePrerequisiteStates } from "../../../../src/app/assessment/assessmentModulePrerequisites.ts";
import { buildPracticeSteps } from "../../../../src/app/assessment/assessmentRoutes.ts";
import { getFieldName } from "../../../../src/app/assessment/assessmentFlowUtils.ts";
import { getPracticeEvidenceField } from "../../../../src/app/assessment/assessmentEvidence.ts";

function fixture() {
  const model: MaturityModel = {
    id: 1, name: "Model", description: "Model", isActive: true,
    dimensions: [{ id: "D1", name: "Dimension", modules: ["A", "B", "C"].map((code, index) => ({
      code, name: `Module ${code}`, prerequisiteModuleCodes: index ? [index === 1 ? "A" : "B"] : [],
      practices: [{ id: index + 1, name: `Practice ${code}`, requiresEvidence: false, questions: [
        { id: index * 10 + 1, code: "Q1", text: "Required", help: "", type: "boolean" as const, required: true, weight: 1 },
        { id: index * 10 + 2, code: "Q2", text: "Optional", help: "", type: "open_answer" as const, required: false, weight: 1 },
      ] }],
    })) }],
  };
  const steps = buildPracticeSteps(model);
  const responses: AssessmentData = {};
  const evidence = new Map<string, AssessmentEvidenceInputItem[]>();
  const states = () => getModulePrerequisiteStates(model, steps, responses, evidence);
  const answer = (index: number) => { responses[getFieldName(steps[index], steps[index].practice.questions[0])] = 0; };
  return { model, steps, responses, evidence, states, answer, modules: model.dimensions[0].modules };
}

test("required completion unlocks a module without optional answers or a minimum score", () => {
  const { modules, states, answer } = fixture();
  assert.equal(states().get(modules[1])?.locked, true);
  answer(0); // A valid No answer completes a question regardless of its score.
  assert.equal(states().get(modules[1])?.locked, false);
  assert.equal(states().get(modules[2])?.locked, true);
  answer(1);
  assert.equal(states().get(modules[2])?.locked, false);
});

test("required evidence must be valid before a prerequisite is complete", () => {
  const { modules, states, answer, evidence } = fixture();
  modules[0].practices[0].requiresEvidence = true;
  answer(0);
  assert.equal(states().get(modules[1])?.locked, true);
  evidence.set(getPracticeEvidenceField(1), [{ id: "note", practiceId: 1, file: null, url: "", type: "text", description: "" }]);
  assert.equal(states().get(modules[1])?.locked, true);
  evidence.set(getPracticeEvidenceField(1), [{ id: "note", practiceId: 1, file: null, url: "", type: "text", description: "Evidence note" }]);
  assert.equal(states().get(modules[1])?.locked, false);
});

test("losing completion relocks the whole chain and retains downstream answers", () => {
  const { modules, states, answer, responses, steps } = fixture();
  answer(0); answer(1); answer(2);
  const downstream = responses[getFieldName(steps[2], steps[2].practice.questions[0])];
  delete responses[getFieldName(steps[0], steps[0].practice.questions[0])];
  assert.equal(states().get(modules[1])?.locked, true);
  assert.equal(states().get(modules[2])?.locked, true);
  assert.deepEqual(states().get(modules[1])?.missingPrerequisites, [{ code: "A", name: "Module A" }]);
  assert.equal(responses[getFieldName(steps[2], steps[2].practice.questions[0])], downstream);
  answer(0);
  assert.equal(states().get(modules[2])?.locked, false);
});

test("all selected prerequisites must be complete; unknown and hidden prerequisites fail closed", () => {
  const { modules, states, answer } = fixture();
  modules[2].prerequisiteModuleCodes = ["a", "B"];
  answer(0);
  assert.equal(states().get(modules[2])?.locked, true);
  answer(1);
  assert.equal(states().get(modules[2])?.locked, false);
  modules[0].visible = false;
  assert.equal(states().get(modules[2])?.locked, true);
  modules[2].prerequisiteModuleCodes = ["UNKNOWN"];
  assert.equal(states().get(modules[2])?.locked, true);
});

test("prerequisites only resolve within the same dimension", () => {
  const { model, modules, states, answer } = fixture();
  answer(0);
  model.dimensions.push({ id: "D2", name: "Other dimension", modules: [{ code: "OTHER", name: "Other", prerequisiteModuleCodes: ["A"], practices: [] }] });
  assert.equal(states().get(modules[1])?.locked, false);
  assert.equal(states().get(model.dimensions[1].modules[0])?.locked, true);
});


test("inactive dependent questions do not prevent prerequisite completion", () => {
  const { modules, states, answer } = fixture();
  const questions = modules[0].practices[0].questions;
  questions[1].required = true;
  questions[1].dependsOnQuestionCode = questions[0].code;
  questions[1].dependencyCondition = { type: "boolean", answers: [true] };
  answer(0);
  assert.equal(states().get(modules[1])?.locked, false);
});


test("co-requisites and mutex introduce no completion gates of their own", () => {
  const { model, modules, states } = fixture();
  modules[1].prerequisiteModuleCodes = [];
  modules[0].coRequisiteModuleCodes = [modules[1].code!];
  modules[1].coRequisiteModuleCodes = [modules[0].code!];
  assert.equal(states().get(modules[0])?.complete, false);
  assert.equal(states().get(modules[1])?.locked, false);
  modules[0].mutexModuleCodes = [modules[2].code!];
  modules[2].visible = false;
  assert.equal(states().get(model.dimensions[0].modules[0])?.locked, false);
});
