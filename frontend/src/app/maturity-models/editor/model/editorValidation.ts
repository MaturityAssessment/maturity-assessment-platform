import type {
  MaturityModelEditorDocument,
  ModelEditorPractice,
  QuestionChoice,
} from "@/api/types";
import { countItems } from "./editorDocument";
import type { EditorIssue, Selection } from "./editorTypes";
import { TEXT_LIMITS } from "@/config/textLimits";
import { hasGatingRuleIssues } from "./gatingRules";

function validCode(code: string) {
  return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(code.trim());
}

function choiceIssues(choices: QuestionChoice[] | undefined) {
  if (!choices?.length || choices.length > 100) return true;
  return choices.some(
    (choice) =>
      !choice.label.trim() ||
      !Number.isFinite(choice.score) ||
      choice.score < 0 ||
      choice.score > 1
  );
}

function rangeIssues(minimum: number, maximum: number) {
  return (
    !Number.isInteger(minimum) ||
    !Number.isInteger(maximum) ||
    minimum >= maximum
  );
}

export function dependencyWouldCycle(
  practice: ModelEditorPractice,
  questionCode: string,
  candidateParentCode: string
) {
  const byCode = new Map(
    practice.questions.map((question) => [
      question.code.toLowerCase(),
      question,
    ])
  );
  const target = questionCode.toLowerCase();
  let cursor: string | undefined = candidateParentCode.toLowerCase();
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === target || seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = byCode.get(cursor)?.dependsOnQuestionCode?.toLowerCase();
  }
  return false;
}

export function validateDocument(
  document: MaturityModelEditorDocument
): EditorIssue[] {
  const issues: EditorIssue[] = [];
  const add = (issue: Omit<EditorIssue, "id">) =>
    issues.push({ ...issue, id: `${issue.step}-${issues.length}` });

  if (!document.name.trim()) {
    add({
      step: "overview",
      severity: "error",
      message: "Model name is required.",
      field: "model-name",
    });
  }
  if (document.name.length > TEXT_LIMITS.name) {
    add({ step: "overview", severity: "error", message: `Model name must be ${TEXT_LIMITS.name} characters or fewer.`, field: "model-name" });
  }
  if (document.description.length > TEXT_LIMITS.description) {
    add({ step: "overview", severity: "error", message: `Model description must be ${TEXT_LIMITS.description} characters or fewer.`, field: "model-description" });
  }
  if (!document.description.trim()) {
    add({
      step: "overview",
      severity: "error",
      message: "Model description is required.",
      field: "model-description",
    });
  }
  if (document.changelogMarkdown.length > TEXT_LIMITS.changelog) {
    add({
      step: "overview",
      severity: "error",
      message: `Version changelog must be ${TEXT_LIMITS.changelog.toLocaleString()} characters or fewer.`,
      field: "model-changelog",
    });
  }
  if (!document.domainId) {
    add({
      step: "overview",
      severity: "error",
      message: "Select a domain.",
      field: "model-domain",
    });
  }
  if (document.levels.length < 2 || document.levels.length > 12) {
    add({
      step: "scale",
      severity: "error",
      message: "Define between 2 and 12 maturity levels.",
    });
  }
  document.levels.forEach((level, index) => {
    if (!level.name.trim()) {
      add({
        step: "scale",
        severity: "error",
        message: `Level ${index + 1} needs a name.`,
        field: `level-${index}-name`,
      });
    }
  });

  if (!document.dimensions.length) {
    add({
      step: "structure",
      severity: "error",
      message: "Add at least one dimension.",
    });
  }

  const dimensionCodes = new Map<string, string>();
  const checkCode = (
    usedCodes: Map<string, string>,
    code: string,
    label: string,
    scope: string,
    selection: Selection,
    field: string
  ) => {
    if (!validCode(code)) {
      add({
        step: "structure",
        severity: "error",
        message: `${label} has an invalid public code.`,
        selection,
        field,
      });
      return;
    }
    const normalized = code.toLowerCase();
    if (usedCodes.has(normalized)) {
      add({
        step: "structure",
        severity: "error",
        message: `Public code ${code} is used more than once in the same ${scope}.`,
        selection,
        field,
      });
    } else {
      usedCodes.set(normalized, label);
    }
  };

  document.dimensions.forEach((dimension, dimensionIndex) => {
    const dimensionSelection: Selection = {
      type: "dimension",
      key: dimension.clientKey,
    };
    checkCode(
      dimensionCodes,
      dimension.code,
      `Dimension ${dimensionIndex + 1}`,
      "maturity model",
      dimensionSelection,
      `dimension-${dimension.clientKey}-code`
    );
    if (!dimension.name.trim()) {
      add({
        step: "structure",
        severity: "error",
        message: `Dimension ${dimensionIndex + 1} needs a name.`,
        selection: dimensionSelection,
      });
    }
    const mappingRules = dimension.mappingRules ?? [];
    const invalidMappingRules =
      mappingRules.length !== document.levels.length ||
      mappingRules.some((rule, index) =>
        rule.levelNumber !== index + 1 ||
        !Number.isFinite(rule.minimumScore) ||
        rule.minimumScore < 0 ||
        rule.minimumScore > 1 ||
        (index === 0 && rule.minimumScore !== 0) ||
        (index > 0 &&
          rule.minimumScore <= mappingRules[index - 1].minimumScore)
      );
    if (invalidMappingRules) {
      add({
        step: "structure",
        severity: "error",
        message: `Dimension ${dimensionIndex + 1} mapping thresholds must start at 0% and increase for every level.`,
        selection: dimensionSelection,
      });
    }
    if (
      hasGatingRuleIssues(
        dimension.gatingRules,
        dimension.modules.map((module) => module.code)
      )
    ) {
      add({
        step: "structure",
        severity: "error",
        message: `Dimension ${dimensionIndex + 1} has an invalid gating rule. Use immediate modules and normalized values with at most two decimals.`,
        selection: dimensionSelection,
      });
    }
    if (!dimension.modules.length) {
      add({
        step: "structure",
        severity: "error",
        message: `${dimension.name || `Dimension ${dimensionIndex + 1}`} needs a module.`,
        selection: dimensionSelection,
      });
    }
    const moduleCodes = new Map<string, string>();
    dimension.modules.forEach((module, moduleIndex) => {
      const moduleSelection: Selection = {
        type: "module",
        key: module.clientKey,
      };
      checkCode(
        moduleCodes,
        module.code,
        `Module ${moduleIndex + 1}`,
        "dimension",
        moduleSelection,
        `module-${module.clientKey}-code`
      );
      if (!module.name.trim()) {
        add({
          step: "structure",
          severity: "error",
          message: `Module ${moduleIndex + 1} needs a name.`,
          selection: moduleSelection,
        });
      }
      if (!module.practices.length) {
        add({
          step: "structure",
          severity: "error",
          message: `${module.name || `Module ${moduleIndex + 1}`} needs a practice.`,
          selection: moduleSelection,
        });
      }
      if (
        hasGatingRuleIssues(
          module.gatingRules,
          module.practices.map((practice) => practice.code)
        )
      ) {
        add({
          step: "structure",
          severity: "error",
          message: `Module ${moduleIndex + 1} has an invalid gating rule. Use immediate practices and normalized values with at most two decimals.`,
          selection: moduleSelection,
        });
      }
      const practiceCodes = new Map<string, string>();
      module.practices.forEach((practice, practiceIndex) => {
        const practiceSelection: Selection = {
          type: "practice",
          key: practice.clientKey,
        };
        if (
          hasGatingRuleIssues(
            practice.gatingRules,
            practice.questions.map((question) => question.code)
          )
        ) {
          add({
            step: "structure",
            severity: "error",
            message: `Practice ${practiceIndex + 1} has an invalid gating rule. Use immediate questions and normalized values with at most two decimals.`,
            selection: practiceSelection,
          });
        }
        checkCode(
          practiceCodes,
          practice.code,
          `Practice ${practiceIndex + 1}`,
          "module",
          practiceSelection,
          `practice-${practice.clientKey}-code`
        );
        if (!practice.name.trim()) {
          add({
            step: "structure",
            severity: "error",
            message: `Practice ${practiceIndex + 1} needs a name.`,
            selection: practiceSelection,
          });
        }
        if (!practice.questions.length) {
          add({
            step: "structure",
            severity: "error",
            message: `${practice.name || `Practice ${practiceIndex + 1}`} needs a question.`,
            selection: practiceSelection,
          });
        }
        const localCodes = new Set(
          practice.questions.map((question) => question.code.toLowerCase())
        );
        const questionCodes = new Map<string, string>();
        practice.questions.forEach((question, questionIndex) => {
          checkCode(
            questionCodes,
            question.code,
            `Question ${questionIndex + 1}`,
            "practice",
            practiceSelection,
            `question-${question.clientKey}-code`
          );
          if (!question.text.trim()) {
            add({
              step: "structure",
              severity: "error",
              message: `Question ${questionIndex + 1} in ${practice.name || "this practice"} needs text.`,
              selection: practiceSelection,
              field: `question-${question.clientKey}-text`,
            });
          }
          if (
            question.type === "multiple_choice" &&
            choiceIssues(question.choices)
          ) {
            add({
              step: "structure",
              severity: "error",
              message: `${question.code || `Question ${questionIndex + 1}`} has invalid answer options.`,
              selection: practiceSelection,
            });
          }
          if (
            question.type === "likert" &&
            (!Number.isInteger(question.scalePointCount) ||
              question.scalePointCount < 2 ||
              question.scalePointCount > 100)
          ) {
            add({
              step: "structure",
              severity: "error",
              message: `${question.code} must have between 2 and 100 scale points.`,
              selection: practiceSelection,
            });
          }
          if (
            (question.type === "numeric" ||
              question.type === "percentage") &&
            rangeIssues(question.rangeMin, question.rangeMax)
          ) {
            add({
              step: "structure",
              severity: "error",
              message: `${question.code} needs integer bounds with the minimum below the maximum.`,
              selection: practiceSelection,
            });
          }
          if (question.dependsOnQuestionCode) {
            const parent = practice.questions.find(
              (candidate) =>
                candidate.code.toLowerCase() ===
                question.dependsOnQuestionCode?.toLowerCase()
            );
            if (!localCodes.has(question.dependsOnQuestionCode.toLowerCase())) {
              add({
                step: "structure",
                severity: "error",
                message: `${question.code} has a broken dependency.`,
                selection: practiceSelection,
              });
            } else if (parent && parent.type !== "boolean") {
              add({
                step: "structure",
                severity: "error",
                message: `${question.code} must depend on a boolean question.`,
                selection: practiceSelection,
              });
            } else if (
              dependencyWouldCycle(
                practice,
                question.code,
                question.dependsOnQuestionCode
              )
            ) {
              add({
                step: "structure",
                severity: "error",
                message: `${question.code} creates a dependency cycle.`,
                selection: practiceSelection,
              });
            }
          }
        });
      });
    });
  });

  const hasOpenAnswers = document.dimensions.some((dimension) =>
    dimension.modules.some((module) =>
      module.practices.some((practice) =>
        practice.questions.some(
          (question) => question.type === "open_answer"
        )
      )
    )
  );
  if (hasOpenAnswers && document.autoEvaluated) {
    add({
      step: "overview",
      severity: "error",
      message:
        "Models with open-answer questions cannot use automatic evaluation.",
      field: "model-auto-evaluated",
    });
  }

  if (countItems(document).questions > 250) {
    add({
      step: "review",
      severity: "warning",
      message:
        "This is a large model. Review the structure carefully before saving.",
    });
  }
  return issues;
}
