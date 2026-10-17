import type { MaturityModelEditorDocument, ModelEditorDimension, ModelEditorModule, ModelEditorPractice, ModelEditorQuestion } from "@/api/types";
import { compareDocuments, type ChangeEntry } from "./editorChanges.ts";
import { codePrefix, codeSuffix } from "./editorCodes.ts";

type Item = ModelEditorDimension | ModelEditorModule | ModelEditorPractice | ModelEditorQuestion;
function children(item: Item): Item[] {
  return "modules" in item ? item.modules : "practices" in item ? item.practices : "questions" in item ? item.questions : [];
}
function find(items: Item[], key: string): Item | undefined {
  for (const item of items) {
    if (item.clientKey === key) return item;
    const nested = find(children(item), key);
    if (nested) return nested;
  }
}
function list(document: MaturityModelEditorDocument, entry: ChangeEntry): Item[] {
  const parentKey = entry.location?.at(-1)?.key;
  if (!parentKey) return document.dimensions;
  const parent = find(document.dimensions, parentKey);
  if (!parent) throw new Error("Restore the parent item before reverting this change.");
  return children(parent);
}

const token = (key: string) => `@revert:${key}`;
/** Temporarily address references by item identity so code collisions during restoration are harmless. */
function encodeReferences(items: Item[]) {
  const resolve = (code: string | undefined, candidates: Item[]) => {
    const matches = candidates.filter(item => item.code.toLowerCase() === code?.toLowerCase());
    if (matches.length > 1) throw new Error("Resolve duplicate item codes before reverting this change.");
    return matches[0] ? token(matches[0].clientKey) : code;
  };
  for (const item of items) {
    if ("dependsOnQuestionCode" in item && item.dependsOnQuestionCode) item.dependsOnQuestionCode = resolve(item.dependsOnQuestionCode, items);
    if ("gatingRules" in item) item.gatingRules = item.gatingRules.map(rule => rule.selection === "specificChild" ? { ...rule, childCode: resolve(rule.childCode, children(item)) } : rule);
    encodeReferences(children(item));
  }
}
function finishReferences(items: Item[], deleted: Set<string>, depth = 0) {
  const prefix = (["D", "M", "P", "Q"] as const)[depth];
  items.forEach((item, index) => { item.code = `${codePrefix(prefix, index + 1)}${codeSuffix(item.code)}`; });
  const resolve = (code: string | undefined, candidates: Item[]) => {
    if (!code?.startsWith("@revert:")) return code;
    const key = code.slice("@revert:".length);
    const target = candidates.find(item => item.clientKey === key);
    if (target) return target.code;
    if (deleted.has(key)) return undefined;
    throw new Error("Restore the referenced item first, then revert this change.");
  };
  for (const item of items) {
    finishReferences(children(item), deleted, depth + 1);
    if ("dependsOnQuestionCode" in item && item.dependsOnQuestionCode) {
      item.dependsOnQuestionCode = resolve(item.dependsOnQuestionCode, items);
      if (!item.dependsOnQuestionCode) item.dependencyCondition = undefined;
    }
    if ("gatingRules" in item) item.gatingRules = item.gatingRules.flatMap(rule => {
      if (rule.selection !== "specificChild") return [rule];
      const childCode = resolve(rule.childCode, children(item));
      return childCode ? [{ ...rule, childCode }] : [];
    });
  }
}
function collectKeys(item: Item, keys: Set<string>) {
  keys.add(item.clientKey);
  children(item).forEach(child => collectKeys(child, keys));
}
function restoreOwnFields(current: Item, baseline: Item): Item {
  const result = structuredClone(baseline);
  // Preserve the edited descendants, including their order and identities.
  if ("modules" in result && "modules" in current) result.modules = current.modules;
  if ("practices" in result && "practices" in current) result.practices = current.practices;
  if ("questions" in result && "questions" in current) result.questions = current.questions;
  return result;
}

/** Revert one currently displayed entry; neither input is mutated. */
export function revertEditorChange(current: MaturityModelEditorDocument, baseline: MaturityModelEditorDocument, entryId: string): MaturityModelEditorDocument {
  const changes = compareDocuments(baseline, current);
  const entry = [...changes.overview, ...changes.scale, ...changes.structure, ...(changes.releaseNotes ? [changes.releaseNotes] : [])].find(candidate => candidate.id === entryId);
  if (!entry) return current;
  const next = structuredClone(current);
  if (entry.id === "overview") {
    const { name, description, autoEvaluated, domainId, aggregationRule } = baseline;
    return { ...next, name, description, autoEvaluated, domainId, aggregationRule };
  }
  if (entry.id === "notes") return { ...next, changelogMarkdown: baseline.changelogMarkdown };
  if (entry.id.startsWith("level:")) {
    const number = Number(entry.id.slice(6));
    const previous = baseline.levels.find(level => level.number === number);
    const index = next.levels.findIndex(level => level.number === number);
    if (previous && index >= 0) next.levels[index] = structuredClone(previous);
    else if (!previous && index >= 0) {
      next.levels.splice(index, 1);
      next.levels.forEach((level, position) => { level.number = position + 1; });
      next.dimensions.forEach(dimension => {
        dimension.mappingRules = dimension.mappingRules.filter(rule => rule.levelNumber !== number).map((rule, position) => ({ ...rule, levelNumber: position + 1, minimumScore: position === 0 ? 0 : rule.minimumScore }));
      });
    } else if (previous) {
      if (number !== next.levels.length + 1) throw new Error("Restore the preceding maturity level first.");
      next.levels.push(structuredClone(previous));
      next.dimensions.forEach(dimension => {
        const original = baseline.dimensions.find(item => item.clientKey === dimension.clientKey)?.mappingRules.find(rule => rule.levelNumber === number);
        const last = dimension.mappingRules.at(-1)?.minimumScore ?? 0;
        dimension.mappingRules.push(original ? structuredClone(original) : { levelNumber: number, minimumScore: last + (1 - last) / 2 });
      });
    }
    return next;
  }

  const source = structuredClone(baseline);
  encodeReferences(next.dimensions);
  encodeReferences(source.dimensions);
  const siblings = list(next, entry);
  const originalSiblings = list(source, entry);
  const deleted = new Set<string>();
  if (entry.status === "order") {
    const oldKeys = new Set(originalSiblings.map(item => item.clientKey));
    const present = new Map(siblings.map(item => [item.clientKey, item]));
    const ordered = originalSiblings.flatMap(item => present.has(item.clientKey) ? [present.get(item.clientKey)!] : []);
    let index = 0;
    // Newly added items keep their slots; only surviving original siblings are reordered.
    siblings.splice(0, siblings.length, ...siblings.map(item => oldKeys.has(item.clientKey) ? ordered[index++] : item));
  } else if (entry.item) {
    const index = siblings.findIndex(item => item.clientKey === entry.item!.key);
    const originalIndex = originalSiblings.findIndex(item => item.clientKey === entry.item!.key);
    if (entry.status === "added" && index >= 0) {
      collectKeys(siblings[index], deleted);
      siblings.splice(index, 1);
    } else if (entry.status === "removed" && originalIndex >= 0) {
      const following = originalSiblings.slice(originalIndex + 1).find(item => siblings.some(candidate => candidate.clientKey === item.clientKey));
      const position = following ? siblings.findIndex(item => item.clientKey === following.clientKey) : siblings.length;
      siblings.splice(position, 0, structuredClone(originalSiblings[originalIndex]));
    } else if (index >= 0 && originalIndex >= 0) {
      const previous = siblings[index];
      const restored = restoreOwnFields(previous, originalSiblings[originalIndex]);
      // Imports may assign fresh choice IDs. Preserve dependent answers when a unique label matches.
      if ("type" in previous && "type" in restored) {
        for (const sibling of siblings) {
          if (!("dependencyCondition" in sibling) || sibling.dependsOnQuestionCode !== token(previous.clientKey) || sibling.dependencyCondition?.type !== "multiple_choice") continue;
          sibling.dependencyCondition.optionIds = sibling.dependencyCondition.optionIds.map(id => {
            if (restored.choices?.some(choice => choice.id === id)) return id;
            const label = previous.choices?.find(choice => choice.id === id)?.label;
            const matches = restored.choices?.filter(choice => choice.label === label) ?? [];
            return matches.length === 1 && matches[0].id ? matches[0].id : id;
          });
        }
      }
      siblings[index] = restored;
    }
  }
  finishReferences(next.dimensions, deleted);
  return next;
}
