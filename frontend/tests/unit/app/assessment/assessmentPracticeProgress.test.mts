import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AssessmentData, Question } from "../../../../src/api/types.ts";
import type { AssessmentPracticeStep } from "../../../../src/app/assessment/AssessmentStep.tsx";
import {
  getAssessmentPracticeProgress,
  getAssessmentPracticeRailState,
  getAssessmentPracticeRouteChangeAction,
  getFieldName,
} from "../../../../src/app/assessment/assessmentFlowUtils.ts";

function buildStep(questions: Question[]): AssessmentPracticeStep {
  return {
    key: "dimension/module/practice",
    dimension: {
      id: "dimension",
      name: "Dimension",
      modules: [],
    },
    module: {
      code: "module",
      name: "Module",
      practices: [],
    },
    practice: {
      id: 10,
      code: "practice",
      name: "Practice",
      questions,
    },
  };
}

function field(step: AssessmentPracticeStep, question: Question) {
  return getFieldName(step, question);
}

test("optional unanswered questions count toward the total but do not block required completion", () => {
  const requiredQuestion: Question = {
    id: 1,
    weight: 1,
    text: "Required",
    type: "boolean",
    help: "",
    required: true,
  };
  const optionalQuestion: Question = {
    id: 2,
    weight: 1,
    text: "Optional",
    type: "open_answer",
    help: "",
    required: false,
  };
  const step = buildStep([requiredQuestion, optionalQuestion]);
  const requiredField = field(step, requiredQuestion);
  const formData: AssessmentData = {
    [requiredField]: 1,
  };

  const progress = getAssessmentPracticeProgress(step, formData, new Map());

  assert.equal(progress.answeredCount, 1);
  assert.equal(progress.totalEnabledQuestions, 2);
  assert.equal(progress.isRequiredComplete, true);
  assert.equal(progress.isFullyAnswered, false);
});

test("ordinary answers count as answered while disabled dependencies are excluded", () => {
  const parent: Question = {
    id: 1,
    code: "parent",
    weight: 1,
    text: "Parent",
    type: "boolean",
    help: "",
    required: true,
  };
  const otherQuestion: Question = {
    id: 2,
    weight: 1,
    text: "Other question",
    type: "boolean",
    help: "",
    required: true,
  };
  const dependent: Question = {
    id: 3,
    weight: 1,
    text: "Dependent",
    type: "boolean",
    help: "",
    required: true,
    dependsOnQuestionCode: "parent",
  };
  const step = buildStep([parent, otherQuestion, dependent]);
  const parentField = field(step, parent);
  const otherField = field(step, otherQuestion);
  const formData: AssessmentData = {
    [parentField]: 0,
    [otherField]: 1,
  };

  const progress = getAssessmentPracticeProgress(step, formData, new Map());

  assert.equal(progress.answeredCount, 2);
  assert.equal(progress.totalEnabledQuestions, 2);
  assert.equal(progress.isRequiredComplete, true);
  assert.equal(progress.isFullyAnswered, true);
});

test("invalid numeric responses count as answered but do not count as complete", () => {
  const question: Question = {
    id: 1,
    weight: 1,
    text: "Percentage",
    type: "percentage",
    help: "",
    required: true,
    rangeMin: 0,
    rangeMax: 100,
    rangeHighValueIsMaximum: true,
  };
  const step = buildStep([question]);
  const questionField = field(step, question);
  const formData: AssessmentData = {
    [questionField]: 120,
  };

  const progress = getAssessmentPracticeProgress(step, formData, new Map());

  assert.equal(progress.answeredCount, 1);
  assert.equal(progress.totalEnabledQuestions, 1);
  assert.equal(progress.isRequiredComplete, false);
  assert.equal(progress.isFullyAnswered, false);
});

test("a missing response is not counted as a valid answer", () => {
  const question: Question = {
    id: 1,
    weight: 1,
    text: "Required",
    type: "boolean",
    help: "",
    required: true,
  };
  const step = buildStep([question]);
  const formData: AssessmentData = {};

  const progress = getAssessmentPracticeProgress(step, formData, new Map());

  assert.equal(progress.answeredCount, 0);
  assert.equal(progress.isRequiredComplete, false);
  assert.equal(progress.isFullyAnswered, false);
});

test("required evidence affects completion without changing answered progress", () => {
  const question: Question = {
    id: 1,
    weight: 1,
    text: "Evidence",
    type: "boolean",
    help: "",
    required: true,
    requiresEvidence: true,
  };
  const step = buildStep([question]);
  const questionField = field(step, question);
  const formData: AssessmentData = {
    [questionField]: 1,
  };

  const withoutEvidence = getAssessmentPracticeProgress(
    step,
    formData,
    new Map()
  );
  const withEvidence = getAssessmentPracticeProgress(
    step,
    formData,
    new Map([
      [
        questionField,
        [
          {
            id: "evidence-link",
            questionId: question.id!,
            type: "link",
            description: "",
            file: null,
            url: "https://example.com/evidence",
          },
        ],
      ],
    ])
  );

  assert.equal(withoutEvidence.answeredCount, 1);
  assert.equal(withoutEvidence.isRequiredComplete, false);
  assert.equal(withEvidence.answeredCount, 1);
  assert.equal(withEvidence.isRequiredComplete, true);
});

test("standalone evidence requests accept either files or links without a response value", () => {
  const question: Question = {
    id: 1,
    weight: 1,
    text: "Provide maintenance regulatory files",
    type: "evidence",
    help: "",
    required: true,
    requiresEvidence: true,
  };
  const step = buildStep([question]);
  const questionField = field(step, question);
  const formData: AssessmentData = {};

  const missing = getAssessmentPracticeProgress(step, formData, new Map());
  const withLink = getAssessmentPracticeProgress(
    step,
    formData,
    new Map([
      [
        questionField,
        [
          {
            id: "evidence-link",
            questionId: question.id!,
            type: "link",
            description: "",
            file: null,
            url: "https://example.com/evidence",
          },
        ],
      ],
    ])
  );
  const file = new File(["evidence"], "maintenance.pdf", {
    type: "application/pdf",
  });
  const complete = getAssessmentPracticeProgress(
    step,
    formData,
    new Map([
      [
        questionField,
        [
          {
            id: "matching-file",
            questionId: question.id!,
            type: "file",
            description: "",
            file,
            fileName: file.name,
            url: "",
          },
        ],
      ],
    ])
  );

  assert.equal(missing.answeredCount, 0);
  assert.equal(missing.isRequiredComplete, false);
  assert.equal(withLink.answeredCount, 1);
  assert.equal(withLink.isRequiredComplete, true);
  assert.equal(complete.answeredCount, 1);
  assert.equal(complete.isRequiredComplete, true);
  assert.equal(complete.isFullyAnswered, true);
});

test("optional standalone evidence does not block required completion", () => {
  const question: Question = {
    id: 1,
    weight: 1,
    text: "Provide optional supporting evidence",
    type: "evidence",
    help: "",
    required: false,
    requiresEvidence: true,
  };
  const step = buildStep([question]);

  const progress = getAssessmentPracticeProgress(step, {}, new Map());

  assert.equal(progress.answeredCount, 0);
  assert.equal(progress.isRequiredComplete, true);
  assert.equal(progress.isFullyAnswered, false);
});

test("rail state distinguishes current, complete, incomplete-behind, and following practices", () => {
  assert.equal(getAssessmentPracticeRailState(1, 1, false), "current");
  assert.equal(getAssessmentPracticeRailState(3, 1, true), "completed");
  assert.equal(
    getAssessmentPracticeRailState(0, 1, false),
    "behind-incomplete"
  );
  assert.equal(getAssessmentPracticeRailState(2, 1, false), "following");
});

test("practice pages isolate question scrolling from animated practice navigation", () => {
  const source = readFileSync(
    new URL("../../../../src/app/assessment/AssessmentStep.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /practiceSteps\.map/);
  assert.match(source, /data-practice-pager/);
  assert.match(source, /data-practice-scroll/);
  assert.match(source, /className="relative min-h-0 min-w-0 overflow-clip"/);
  assert.match(source, /absolute inset-0 h-full min-h-0 overflow-y-auto/);
  assert.match(source, /overflow-y-auto overscroll-y-contain/);
  assert.match(source, /transition-transform duration-500/);
  assert.match(source, /practiceIndex < visiblePracticeIndex/);
  assert.match(source, /practiceIndex > visiblePracticeIndex/);
  assert.doesNotMatch(source, /pager\.(scrollTop|scrollTo)/);
  assert.match(source, /inert=\{!isVisible\}/);
  assert.doesNotMatch(source, /\bsnap-(start|always|end|proximity|mandatory)\b/);
  assert.match(source, /Previous Practice/);
  assert.ok(
    source.indexOf("Previous Practice") <
      source.indexOf('className="space-y-4"')
  );
  assert.match(source, /inline-flex flex-col items-center/);
  assert.doesNotMatch(source, /border border-indigo-200 bg-white/);
});

test("stale internal route acknowledgements wait for the latest practice target", () => {
  assert.equal(
    getAssessmentPracticeRouteChangeAction(
      "practice-2",
      null,
      "practice-3"
    ),
    "await-internal-route"
  );
  assert.equal(
    getAssessmentPracticeRouteChangeAction(
      "practice-3",
      null,
      "practice-3"
    ),
    "acknowledge-explicit"
  );
  assert.equal(
    getAssessmentPracticeRouteChangeAction(
      "practice-1",
      null,
      null
    ),
    "scroll-from-route"
  );
});
