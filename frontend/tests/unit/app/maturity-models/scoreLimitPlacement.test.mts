import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as React from "react";
import ts from "typescript";
import * as editorDocument from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import * as editorCodes from "../../../../src/app/maturity-models/editor/model/editorCodes.ts";
import * as moduleBadges from "../../../../src/app/maturity-models/editor/model/moduleBadges.ts";
import * as conditionalGating from "../../../../src/app/maturity-models/editor/model/conditionalGating.ts";
import * as editorValidation from "../../../../src/app/maturity-models/editor/model/editorValidation.ts";
import * as questionBranchingEditor from "../../../../src/app/maturity-models/editor/model/questionBranchingEditor.ts";
import { TEXT_LIMITS } from "../../../../src/config/textLimits.ts";

const require = createRequire(import.meta.url);
const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];

for (const kind of ["Dimension", "Module", "Practice"]) {
  test(`${kind} limits live in Scoring and update only the selected element`, () => {
    const exports: any = {};
    const code = ts.transpileModule(readFileSync(new URL(`../../../../src/app/maturity-models/editor/steps/structure/${kind}Editor.tsx`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    new Function("require", "exports", code)((name: string) => {
      if (name === "react") return { ...React, useState: (value: any) => [value, () => {}], useMemo: (fn: any) => fn() };
      if (name === "../../model/editorDocument") return editorDocument;
      if (name === "../../model/editorCodes") return editorCodes;
      if (name === "../../model/moduleBadges") return moduleBadges;
      if (name === "../../model/conditionalGating") return conditionalGating;
      if (name === "../../model/editorValidation") return editorValidation;
      if (name === "../../model/questionBranchingEditor") return questionBranchingEditor;
      if (name === "@/config/textLimits") return { TEXT_LIMITS };
      if (name === "../../components/FormFields") return { CodeField: "code-field", inputClass: "", labelClass: "" };
      if (name === "@/components/ui/badge") return { Badge: "badge" };
      if (name.startsWith(".")) return { __esModule: true, default: name, EditorSectionHeading: "section-heading" };
      return require(name);
    }, exports);
    const document = editorDocument.createEmptyDocument();
    const dimension = document.dimensions[0], module = dimension.modules[0], practice = module.practices[0];
    const owner = kind === "Dimension" ? dimension : kind === "Module" ? module : practice;
    const changes: any[] = [];
    const commands = { [`update${kind}`]: (...args: any[]) => changes.push(args) };
    const rendered = exports.default({ document, dimension, module, practice, commands, onSelect() {} });
    const tabs = nodes(rendered).find(node => node.type === "./ElementEditorTabs").props.tabs;
    const scoring = nodes(tabs.find((tab: any) => tab.id === "scoring").content);
    const limits = scoring.find(node => node.type === "../../components/ScoreLimitFields");
    assert.ok(limits);
    assert.equal(limits.props.owner, owner);
    const gating = nodes(tabs.find((tab: any) => tab.id === "gating").content);
    assert.equal(gating.some(node => node.type === "../../components/ScoreLimitFields"), false);
    const next = [{ kind: "ceiling", value: 0.75 }];
    limits.props.onChange(next);
    assert.deepEqual(changes[0].at(-1), { ...owner, scoreLimits: next });
    assert.equal(owner.scoreLimits?.length ?? 0, 0);
  });
}
