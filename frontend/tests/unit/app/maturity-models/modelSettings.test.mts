import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);

function harness(role = "CURATOR") {
  const state: any[] = [];
  let cursor = 0;
  let failure = false;
  let domainFailure = false;
  let resolveSave: (() => void) | undefined;
  let delayed = false;
  const requests: any[] = [];
  const saved: any[] = [];
  const versions = [{ id: 10, name: "Renamed", description: "Shared description", domainId: 7 }];
  const useState = (initial: any) => {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index], (value: any) => { state[index] = value; }];
  };
  const mocks: Record<string, any> = {
    react: { useState, useRef: (initial: any) => useState({ current: initial })[0] },
    "@headlessui/react": { Dialog: "dialog", DialogBackdrop: "backdrop", DialogPanel: "panel", DialogTitle: "h2", Description: "p" },
    "@/context": { useAuth: () => ({ user: { role } }) },
    "@/api/axios": { __esModule: true, default: {
      get: async () => { if (domainFailure) throw new Error("Unavailable"); return { data: [{ id: 1, name: "Original domain" }, { id: 7, name: "New category" }] }; },
      put: async (...args: any[]) => {
        requests.push(args);
        if (delayed) await new Promise<void>(resolve => { resolveSave = resolve; });
        if (failure) throw new Error("Unavailable");
        return { data: versions };
      },
    } },
    "@/components/ui/button": { Button: "button" },
    "@/config/textLimits": { TEXT_LIMITS: { name: 150, description: 2000, changelog: 50000 } },
    "./ModelPageState": { getModelErrorMessage: (_error: unknown, fallback: string) => fallback },
    "../components/FormFields": { inputClass: "input", labelClass: "label", Panel: "section" },
  };
  function load(relative: string) {
    const filename = new URL(`../../../../src/app/maturity-models/${relative}`, import.meta.url);
    const exports: any = {};
    const output = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    new Function("require", "exports", output)((id: string) => mocks[id] ?? require(id), exports);
    return exports.default;
  }
  const Action = load("[id]/ModelSettingsAction.tsx");
  const render = () => { cursor = 0; return Action({ model: { id: 20, name: "Original", description: "Description", domainId: 1 }, onSaved: (data: any) => saved.push(data) }); };
  return { load, render, requests, saved, versions,
    fail: () => { failure = true; }, failDomains: (value: boolean) => { domainFailure = value; },
    delay: () => { delayed = true; }, resolveSave: () => resolveSave!(),
    open: async () => { find(render(), byType("button")).props.onClick(); await new Promise(setImmediate); },
  };
}
function find(node: any, predicate: (node: any) => boolean): any {
  if (node == null || typeof node !== "object") return undefined;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const match = find(child, predicate);
    if (match) return match;
  }
}
const byType = (type: string) => (node: any) => node.type === type;
const byId = (id: string) => (node: any) => node.props?.id === id;
const submit = { preventDefault() {} };
const change = (h: ReturnType<typeof harness>, field: string, value: string) => find(h.render(), byId(`settings-model-${field}`)).props.onChange({ target: { value } });

test("shared settings are editable during creation and removed from version editing", () => {
  const Overview = harness().load("editor/steps/OverviewStep.tsx");
  const props = { document: { name: "Model", description: "Description", changelogMarkdown: "" }, domains: [], onChange() {} };
  for (const id of ["model-name", "model-description", "model-domain"]) {
    assert.ok(find(Overview({ ...props, editing: false }), byId(id)));
    assert.equal(find(Overview({ ...props, editing: true }), byId(id)), undefined);
  }
  assert.ok(find(Overview({ ...props, editing: true }), byId("model-changelog")));
});
test("settings are available only to curators and administrators", () => {
  assert.equal(harness("USER").render(), null);
  for (const role of ["CURATOR", "ADMIN"]) assert.ok(find(harness(role).render(), byType("button")));
});
test("settings open a prefilled dialog and save all shared fields together", async () => {
  const h = harness();
  await h.open();
  assert.equal(find(h.render(), byType("dialog")).props.open, true);
  assert.equal(find(h.render(), byId("settings-model-name")).props.value, "Original");
  change(h, "name", "  Renamed  ");
  change(h, "description", "  Shared description  ");
  change(h, "domain", "7");
  await find(h.render(), byType("form")).props.onSubmit(submit);
  assert.deepEqual(h.requests, [["/api/v1/maturity-model/20/settings", { name: "Renamed", description: "Shared description", domainId: 7 }]]);
  assert.deepEqual(h.saved, [h.versions]);
  assert.equal(find(h.render(), byType("dialog")).props.open, false);
});
test("blank fields and missing domains do not submit requests", async () => {
  for (const [field, value] of [["name", "   "], ["description", "   "], ["domain", ""]]) {
    const h = harness();
    await h.open();
    change(h, field, value);
    await find(h.render(), byType("form")).props.onSubmit(submit);
    assert.deepEqual(h.requests, []);
  }
});
test("cancel discards changes and reopening restores saved settings", async () => {
  const h = harness();
  await h.open();
  change(h, "name", "Unsaved");
  find(h.render(), (node) => node.type === "button" && node.props.children === "Cancel").props.onClick();
  assert.equal(find(h.render(), byType("dialog")).props.open, false);
  await h.open();
  assert.equal(find(h.render(), byId("settings-model-name")).props.value, "Original");
  assert.deepEqual(h.requests, []);
});
test("failed saving preserves input and shows an error", async () => {
  const h = harness();
  h.fail();
  await h.open();
  change(h, "name", "New name");
  await find(h.render(), byType("form")).props.onSubmit(submit);
  assert.equal(find(h.render(), byId("settings-model-name")).props.value, "New name");
  assert.equal(find(h.render(), byType("dialog")).props.open, true);
  assert.ok(find(h.render(), (node) => node.props?.role === "alert"));
  assert.deepEqual(h.saved, []);
});
test("domain load failures block saving and allow retry", async () => {
  const h = harness();
  h.failDomains(true);
  await h.open();
  await find(h.render(), byType("form")).props.onSubmit(submit);
  assert.deepEqual(h.requests, []);
  assert.ok(find(h.render(), (node) => node.props?.role === "alert"));
  h.failDomains(false);
  find(h.render(), (node) => node.type === "button" && node.props.children === "Try again").props.onClick();
  await new Promise(setImmediate);
  assert.equal(find(h.render(), (node) => node.props?.role === "alert"), undefined);
  await find(h.render(), byType("form")).props.onSubmit(submit);
  assert.equal(h.requests.length, 1);
});
test("saving blocks duplicate submissions and closing until completion", async () => {
  const h = harness();
  h.delay();
  await h.open();
  const form = find(h.render(), byType("form"));
  const saving = form.props.onSubmit(submit);
  await form.props.onSubmit(submit);
  find(h.render(), byType("dialog")).props.onClose();
  assert.equal(find(h.render(), byType("dialog")).props.open, true);
  assert.equal(h.requests.length, 1);
  h.resolveSave();
  await saving;
  assert.equal(find(h.render(), byType("dialog")).props.open, false);
});
