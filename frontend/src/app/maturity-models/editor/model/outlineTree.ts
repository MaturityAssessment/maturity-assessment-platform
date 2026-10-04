import type { MaturityModelEditorDocument } from "@/api/types";
import type { Selection } from "./editorTypes";

export type OutlineNode = {
  id: string;
  selection: Selection;
  parentId: string | null;
  parentKey: string | null;
  label: string;
  code: string;
  childLabel: "module" | "practice" | "question";
  childCount: number;
  children: OutlineNode[];
};

export function outlineId(selection: Selection) {
  return `${selection.type}:${selection.key}`;
}

export function buildOutlineTree(document: MaturityModelEditorDocument): OutlineNode[] {
  return document.dimensions.map((dimension) => {
    const selection: Selection = { type: "dimension", key: dimension.clientKey };
    const id = outlineId(selection);
    return {
      id, selection, parentId: null, parentKey: null,
      label: dimension.name || "Untitled dimension",
      code: dimension.code, childLabel: "module", childCount: dimension.modules.length,
      children: dimension.modules.map((module) => {
        const moduleSelection: Selection = { type: "module", key: module.clientKey };
        const moduleId = outlineId(moduleSelection);
        return {
          id: moduleId, selection: moduleSelection, parentId: id, parentKey: dimension.clientKey,
          label: module.name || "Untitled module",
          code: module.code, childLabel: "practice", childCount: module.practices.length,
          children: module.practices.map((practice) => {
            const practiceSelection: Selection = { type: "practice", key: practice.clientKey };
            return {
              id: outlineId(practiceSelection), selection: practiceSelection,
              parentId: moduleId, parentKey: module.clientKey,
              label: practice.name || "Untitled practice", code: practice.code,
              childLabel: "question", childCount: practice.questions.length, children: [],
            };
          }),
        };
      }),
    };
  });
}

export function flattenOutline(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.flatMap((node) => [node, ...flattenOutline(node.children)]);
}

export function matchesOutline(node: OutlineNode, query: string) {
  const term = query.trim().toLocaleLowerCase();
  return node.label.toLocaleLowerCase().includes(term) || node.code.toLocaleLowerCase().includes(term);
}

// Retain ancestors for context without including unrelated siblings.
export function filterOutline(nodes: OutlineNode[], query: string): OutlineNode[] {
  if (!query.trim()) return nodes;
  return nodes.flatMap((node) => {
    const children = filterOutline(node.children, query);
    return matchesOutline(node, query) || children.length ? [{ ...node, children }] : [];
  });
}

// Convert a before/after insertion into the destination key used by editor mutations.
export function outlineReorderTarget(
  nodes: OutlineNode[], activeId: string, overId: string, after: boolean
): OutlineNode | null {
  const active = nodes.find((node) => node.id === activeId);
  const over = nodes.find((node) => node.id === overId);
  if (!active || !over || active.id === over.id || active.parentId !== over.parentId || active.selection.type !== over.selection.type) return null;
  const siblings = nodes.filter((node) => node.parentId === active.parentId && node.selection.type === active.selection.type);
  const oldIndex = siblings.findIndex((node) => node.id === activeId);
  const overIndex = siblings.findIndex((node) => node.id === overId);
  const newIndex = overIndex + (after ? 1 : 0) - (oldIndex < overIndex ? 1 : 0);
  return newIndex === oldIndex ? null : siblings[newIndex] ?? null;
}
