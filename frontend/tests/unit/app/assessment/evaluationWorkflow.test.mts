import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourceRoot = fileURLToPath(new URL("../../../../src/", import.meta.url));
const assessment = { id: 41, status: "PENDING_REVIEW", evaluatorInsight: "", questionEvaluations: {
  D_M_1_1: { response: true, questionId: 1 }, D_M_1_2: { response: "Policy", questionId: 2 },
} };
const model = { id: 7, dimensions: [{ id: "D", modules: [{ code: "M", practices: [{ id: 1, questions: [{ id: 1, type: "boolean" }, { id: 2, type: "open_answer" }] }] }] }] };
function deferred() { let resolve!: (value?: any) => void; let reject!: (error: any) => void; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

// Deterministic hook host: execute the production controller, React dependency
// effects and save queue without a browser or a second React renderer package.
function harness(initial = assessment) {
  let slots: any[] = [], index = 0, dirty = false;
  let effects: Array<() => void> = [];
  const timers = new Map<number, () => void>(); let timerId = 0;
  const listeners = new Map<string, Function>();
  const requests: Array<{ url: string; data: any }> = [];
  const pushes: string[] = [];
  let put: (url: string, data: any) => Promise<any> = async () => ({ data: {} });
  let post: () => Promise<any> = async () => ({ data: {} });
  const api = { put: (url: string, data: any) => { requests.push({ url, data }); return put(url, data); }, post: () => post(), delete: async () => ({}), get: async () => ({}) };
  const router = { push: (url: string) => pushes.push(url) };
  const same = (a?: any[], b?: any[]) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(value: any) { const i = index++; if (!(i in slots)) slots[i] = typeof value === "function" ? value() : value; return [slots[i], (next: any) => { const value = typeof next === "function" ? next(slots[i]) : next; if (!Object.is(value, slots[i])) { slots[i] = value; dirty = true; } }]; },
    useRef(value: any) { const i = index++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useMemo(fn: Function, deps: any[]) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useEffect(fn: Function, deps: any[]) { const i = index++; if (!same(slots[i]?.deps, deps)) { effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); } },
  };
  const window = { addEventListener: (key: string, fn: Function) => listeners.set(key, fn), removeEventListener: (key: string) => listeners.delete(key), confirm: () => true, location: { href: "http://localhost/assessment?draftId=41", origin: "http://localhost", assign: (url: string) => pushes.push(url) } };
  const document = { addEventListener: (key: string, fn: Function) => listeners.set(key, fn), removeEventListener: (key: string) => listeners.delete(key) };
  const cache = new Map<string, any>();
  function load(path: string): any {
    const filename = [path, `${path}.ts`, `${path}.tsx`].find(p => existsSync(p) && /\.(ts|tsx)$/.test(p));
    assert.ok(filename, path);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {}; cache.set(filename, exports);
    const localRequire = (id: string): any => id === "react" ? react : id === "next/navigation" ? { useRouter: () => router } : id === "@/api/axios" ? api : id.startsWith("@/") ? load(resolve(sourceRoot, id.slice(2))) : id.startsWith(".") ? load(resolve(dirname(filename), id)) : require(id);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
    new Function("require", "exports", "window", "document", "setTimeout", "clearTimeout", outputText)(localRequire, exports, window, document, (fn: () => void, delay: number) => { assert.equal(delay, 1000); timers.set(++timerId, fn); return timerId; }, (id: number) => timers.delete(id));
    return exports;
  }
  const useEvaluation = load(resolve(sourceRoot, "app/assessment/evaluation/useEvaluation.ts")).default;
  let current: any;
  function render() {
    let attempts = 0;
    do { dirty = false; index = 0; current = useEvaluation(initial, model, true, true); const pending = effects; effects = []; pending.forEach(fn => fn()); assert.ok(++attempts < 20, "render loop"); } while (dirty);
    return current;
  }
  render();
  return { render, requests, pushes, listeners, setPut: (fn: typeof put) => { put = fn; }, setPost: (fn: typeof post) => { post = fn; }, tick: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); }, dispose: () => slots.forEach(slot => slot?.cleanup?.()) };
}

test("evaluation autosaves after debounce and serializes newer edits without overwriting them", async () => {
  const h = harness();
  try {
    const first = deferred();
    h.setPut(() => h.requests.length === 1 ? first.promise : Promise.resolve({}));
    h.render().updateReview("D_M_1_1", { validationStatus: "ACCEPTED", reviewerNote: "First" });
    h.render(); assert.equal(h.requests.length, 0);
    h.tick(); assert.equal(h.requests.length, 1);
    h.render().updateReview("D_M_1_1", { validationStatus: "FLAGGED", reviewerNote: "Newer" });
    h.render(); h.tick(); assert.equal(h.requests.length, 1);
    first.resolve({}); await h.render().flush();
    assert.equal(h.requests.length, 2);
    assert.equal(h.requests[0].data.questionEvaluations.D_M_1_1.reviewerNote, "First");
    assert.equal(h.requests[1].data.questionEvaluations.D_M_1_1.reviewerNote, "Newer");
    assert.equal(h.render().reviews.D_M_1_1.reviewerNote, "Newer");
    assert.equal(h.render().status, "saved");
  } finally { h.dispose(); }
});
test("completion flushes pending edits and never completes after a failed save", async () => {
  const h = harness();
  try {
    h.render().updateReview("D_M_1_1", { validationStatus: "ACCEPTED", reviewerNote: "" });
    h.render().updateReview("D_M_1_2", { validationStatus: "ACCEPTED", manualScore: 3, reviewerNote: "" });
    h.setPut(async () => { throw new Error("Offline"); });
    await h.render().transition("finish");
    assert.equal(h.requests.length, 1); assert.match(h.requests[0].url, /reviews$/);
    assert.equal(h.render().status, "error"); assert.equal(h.pushes.length, 0);
    h.setPut(async () => ({}));
    await h.render().transition("finish");
    assert.deepEqual(h.requests.slice(1).map(r => r.url.split("/").at(-1)), ["reviews", "finish"]);
    assert.deepEqual(h.pushes, ["/evaluate"]);
  } finally { h.dispose(); }
});
test("request changes validates notes and flushes before returning to the queue", async () => {
  const h = harness();
  try {
    h.render().updateReview("D_M_1_1", { validationStatus: "FLAGGED", reviewerNote: "" });
    await h.render().transition("send-back"); assert.equal(h.requests.length, 0);
    h.render().updateReview("D_M_1_1", { validationStatus: "FLAGGED", reviewerNote: "Please attach evidence" });
    await h.render().transition("send-back");
    assert.deepEqual(h.requests.map(r => r.url.split("/").at(-1)), ["reviews", "send-back"]);
  } finally { h.dispose(); }
});
test("agent suggestions preserve edits and intentionally cleared remarks made while generating", async () => {
  const h = harness();
  try {
    const agent = deferred(); h.setPost(() => agent.promise);
    const generation = h.render().runAgent();
    h.render().updateReview("D_M_1_1", { reviewerNote: "Human note" });
    h.render().updateRemarks("Human remarks"); h.render().updateRemarks("");
    agent.resolve({ data: { assessmentId: 41, summary: "Agent remarks", questionEvaluations: {
      D_M_1_1: { validationStatus: "ACCEPTED", reviewerNote: "Agent overwrite" },
      D_M_1_2: { validationStatus: "ACCEPTED", manualScore: 3, reviewerNote: "Suggestion" },
    } } }); await generation;
    const e = h.render();
    assert.equal(e.reviews.D_M_1_1.reviewerNote, "Human note");
    assert.equal(e.reviews.D_M_1_2.reviewerNote, "Suggestion"); assert.equal(e.finalRemarks, "");
    await e.transition("finish"); assert.equal(h.pushes.length, 0);
  } finally { h.dispose(); }
});
test("remarks-only autosaves, unload warnings, and navigation failure protection", async () => {
  const h = harness({ ...assessment, questionEvaluations: {} } as typeof assessment);
  try {
    h.render().updateRemarks("Final remarks"); h.render();
    let warned = false;
    h.listeners.get("beforeunload")!({ preventDefault: () => { warned = true; } }); assert.equal(warned, true);
    h.setPut(async () => { throw new Error("Offline"); });
    let prevented = false;
    h.listeners.get("click")!({ button: 0, target: { closest: () => ({ href: "http://localhost/evaluate", target: "", hasAttribute: () => false }) }, preventDefault: () => { prevented = true; }, stopPropagation() {} });
    await h.render().flush(); assert.equal(prevented, true); assert.equal(h.pushes.length, 0);
    h.setPut(async () => ({})); await h.render().flush();
    assert.deepEqual(h.requests.at(-1)?.data.questionEvaluations, {});
    assert.equal(h.requests.at(-1)?.data.evaluatorInsight, "Final remarks");
    warned = false; h.listeners.get("beforeunload")!({ preventDefault: () => { warned = true; } }); assert.equal(warned, false);
  } finally { h.dispose(); }
});
