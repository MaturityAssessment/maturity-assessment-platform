import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourceRoot = fileURLToPath(new URL("../../../../src/", import.meta.url));

function harness() {
  const pushes: string[] = [];
  const listeners = new Map<string, Function>();
  const cleanups: Function[] = [];
  let confirmed = true;
  let confirmations = 0;
  const window = {
    confirm: () => { confirmations++; return confirmed; },
    addEventListener: (key: string, fn: Function) => listeners.set(key, fn),
    removeEventListener: (key: string) => listeners.delete(key),
  };
  const document = { ...window };
  const cache = new Map<string, any>();
  function load(path: string): any {
    const filename = [path, `${path}.ts`, `${path}.tsx`].find(p => existsSync(p));
    assert.ok(filename, path);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const localRequire = (id: string): any => {
      if (id === "react") return {
        ...React,
        useRef: (current: unknown) => ({ current }),
        useEffect: (effect: Function) => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
      };
      if (id === "next/link") return ({ children, ...props }: any) => React.createElement("a", props, children);
      if (id === "next/image") return ({ src, priority, ...props }: any) => React.createElement("img", { ...props, src: src.src });
      if (id === "next/navigation") return { useRouter: () => ({ push: (href: string) => pushes.push(href) }), usePathname: () => "/dashboard" };
      if (id === "@/context") return { useAuth: () => ({ user: { role: "USER" } }) };
      if (id === "./UserMenu") return () => null;
      if (id.endsWith(".png")) return { src: id };
      if (id.startsWith(".")) return load(resolve(dirname(filename), id));
      return require(id);
    };
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    new Function("require", "exports", "window", "document", outputText)(localRequire, exports, window, document);
    return exports;
  }
  return {
    load: (path: string) => load(resolve(sourceRoot, path)), pushes, listeners,
    confirm: (value: boolean) => { confirmed = value; },
    get confirmations() { return confirmations; },
    dispose: () => cleanups.forEach(fn => fn()),
  };
}

function click(overrides = {}) {
  return { button: 0, defaultPrevented: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    preventDefault() { this.defaultPrevented = true; }, ...overrides };
}

test("every shared navigation logo is an accessible home link, including tabbed chrome", () => {
  const h = harness();
  for (const [name, props] of [
    ["TopNavbar", { title: "Assessment", showUserMenu: false }],
    ["TopNavbarWithTabs", { title: "Model editor", tabs: null, tabsLabel: "Steps" }],
    ["SideNavbar", {}],
  ] as const) {
    const Component = h.load(`components/navigation/${name}.tsx`).default;
    const html = renderToStaticMarkup(React.createElement(Component, props));
    assert.match(html, /<a[^>]*href="\/dashboard"[^>]*aria-label="Go to home"[^>]*title="Go to home"[^>]*><img[^>]*alt="Maturity Assessment Platform"/);
    assert.match(html, /focus-visible:ring-2/);
  }
});

test("home waits for page saving, blocks duplicate clicks, and navigates only after success", async () => {
  const h = harness();
  const Logo = h.load("components/navigation/LogoHomeLink.tsx").default;
  let saved!: (result: boolean) => void;
  let calls = 0;
  const link = Logo({ children: "Logo", beforeNavigateHome: () => { calls++; return new Promise<boolean>(resolve => { saved = resolve; }); } });
  assert.equal(link.props["data-navigation-guard"], "page");
  const event = click();
  const navigation = link.props.onClick(event);
  assert.equal(event.defaultPrevented, true);
  await link.props.onClick(click());
  assert.equal(calls, 1);
  assert.deepEqual(h.pushes, []);
  saved(true);
  await navigation;
  assert.deepEqual(h.pushes, ["/dashboard"]);
});

test("failed saving keeps the user on the page and allows retry", async () => {
  const h = harness();
  const Logo = h.load("components/navigation/LogoHomeLink.tsx").default;
  let saved = false;
  const link = Logo({ children: "Logo", beforeNavigateHome: async () => saved });
  await link.props.onClick(click());
  assert.deepEqual(h.pushes, []);
  saved = true;
  await link.props.onClick(click());
  assert.deepEqual(h.pushes, ["/dashboard"]);
});

test("ordinary links and modified clicks keep native link behavior", async () => {
  const h = harness();
  const Logo = h.load("components/navigation/LogoHomeLink.tsx").default;
  let calls = 0;
  const nativeLink = Logo({ children: "Logo" });
  const event = click();
  await nativeLink.props.onClick(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(nativeLink.props["data-navigation-guard"], undefined);
  const guarded = Logo({ children: "Logo", beforeNavigateHome: async () => { calls++; return true; } });
  for (const override of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    const event = click(override);
    await guarded.props.onClick(event);
    assert.equal(event.defaultPrevented, override.defaultPrevented ?? false);
  }
  assert.equal(calls, 0);
  assert.deepEqual(h.pushes, []);
});

test("editor home link uses the existing leave confirmation and cancellation", () => {
  const h = harness();
  const { useUnsavedNavigationGuard } = h.load("app/maturity-models/editor/hooks/useUnsavedNavigationGuard.ts");
  useUnsavedNavigationGuard(true);
  try {
    const anchor = { target: "", hasAttribute: () => false };
    const event = { ...click(), target: { closest: () => anchor }, stopped: false, stopPropagation() { this.stopped = true; } };
    h.confirm(false);
    h.listeners.get("click")!(event);
    assert.equal(h.confirmations, 1);
    assert.equal(event.defaultPrevented, true);
    assert.equal(event.stopped, true);
    h.confirm(true);
    const accepted = { ...event, defaultPrevented: false, stopped: false };
    h.listeners.get("click")!(accepted);
    assert.equal(h.confirmations, 2);
    assert.equal(accepted.defaultPrevented, false);
    assert.equal(accepted.stopped, false);
  } finally { h.dispose(); }
  assert.equal(h.listeners.size, 0);
});
