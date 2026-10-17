import type { MaturityModelEditorDocument, ModelEditorDimension, ModelEditorModule, ModelEditorPractice, ModelEditorQuestion } from "@/api/types";
import { codeSuffix } from "./editorCodes.ts";

export type ComparisonProvenance = "source" | "import" | "legacy";
export type ChangeField = { label: string; before: string; after: string; beforeEmpty: boolean; afterEmpty: boolean };
export type ChangeLocation = { key: string; code: string; name: string; kind: "Dimension" | "Module" | "Practice" | "Question" };
export type ChangeEntry = {
  id: string; title: string; path: string; status: "updated" | "added" | "removed" | "order";
  fields: ChangeField[]; children?: ChangeEntry[];
  location?: ChangeLocation[]; item?: ChangeLocation;
};
export type ChangesPreview = {
  isNew: boolean; overview: ChangeEntry[]; scale: ChangeEntry[]; structure: ChangeEntry[];
  releaseNotes: ChangeEntry | null; counts: Record<ChangeEntry["status"], number>;
  limitation?: string;
};
type Item = ModelEditorDimension | ModelEditorModule | ModelEditorPractice | ModelEditorQuestion;
const children = (item: Item): Item[] => "modules" in item ? item.modules : "practices" in item ? item.practices : "questions" in item ? item.questions : [];
const locationItem = (item: Item): ChangeLocation => ({
  key: item.clientKey, code: item.code,
  name: ("text" in item ? item.text : item.name) || "Untitled",
  kind: "modules" in item ? "Dimension" : "practices" in item ? "Module" : "questions" in item ? "Practice" : "Question",
});
const locationPath = (location: ChangeLocation[]) => location.map(item => `${item.code} — ${item.name}`).join(" / ");
const title = (item: Item) => `${item.code} — ${("text" in item ? item.text : item.name) || "Untitled"}`;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const human = (value: string) => value.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/^./, c => c.toUpperCase());
const labels: Record<string, string> = { text: "Question text", help: "Help text", autoEvaluated: "Automatic evaluation", domainId: "Domain", aggregationRule: "Aggregation", requiresEvidence: "Evidence required", dependsOnQuestionCode: "Depends on question", dependencyCondition: "Dependency condition", mappingRules: "Maturity mapping", gatingRules: "Gating rules", changelogMarkdown: "Release notes" };
function display(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map((v, i) => `${i + 1}. ${display(v)}`).join("\n") : "None";
  if (typeof value === "object") return Object.entries(value).map(([k, v]) => `${labels[k] ?? human(k)}: ${display(v)}`).join(" · ");
  return String(value);
}
type SemanticField = { value: unknown; text: string };
type Fields = Record<string, SemanticField>;
function fields(item: Item, siblings: Item[]): Fields {
  const result: Fields = {};
  const raw = item as unknown as Record<string, unknown>;
  const ignored = new Set(["clientKey", "codeLocked", "modules", "practices", "questions"]);
  const q = "type" in item ? item : null;
  const reference = (code: string | undefined, candidates: Item[]) => candidates.find(i => i.code.toLowerCase() === code?.toLowerCase());
  for (const [key, original] of Object.entries(raw)) {
    if (ignored.has(key)) continue;
    if (q && ((key.startsWith("scale") && q.type !== "likert") || (key.startsWith("range") && !["numeric", "percentage"].includes(q.type)) || (key === "booleanCorrectAnswer" && q.type !== "boolean") || (key === "choices" && !["multiple_choice", "multiple_selection"].includes(q.type)) || (key === "dependencyCondition" && !q.dependsOnQuestionCode))) continue;
    let value = typeof original === "string" ? original.trim() : original;
    if (value == null) value = "";
    let text: string | undefined;
    if (key === "code") value = codeSuffix(String(value));
    if (key === "choices" && q) value = (q.choices ?? []).map(c => ({ label: c.label, ...(q.type === "multiple_selection" ? { rawValue: c.rawValue } : { score: c.score }) }));
    if (key === "dependsOnQuestionCode") {
      const target = reference(q?.dependsOnQuestionCode, siblings);
      value = target?.clientKey ?? value;
      text = target ? title(target) : display(original);
    }
    if (key === "dependencyCondition" && q?.dependencyCondition?.type === "multiple_choice") {
      const parent = reference(q.dependsOnQuestionCode, siblings);
      const choices = parent && "choices" in parent ? parent.choices ?? [] : [];
      value = { type: "multiple_choice", options: q.dependencyCondition.optionIds.map(id => {
        const index = choices.findIndex(c => c.id === id);
        return index < 0 ? id : { position: index + 1, label: choices[index].label };
      }) };
    }
    if (key === "gatingRules" && "gatingRules" in item) {
      value = item.gatingRules.map(({ order: _order, childCode, ...rule }) => ({ ...rule, ...(rule.selection === "specificChild" ? { childCode: reference(childCode, children(item))?.clientKey ?? childCode } : {}) }));
      text = display(item.gatingRules.map(({ order: _order, childCode, ...rule }) => ({ ...rule, ...(rule.selection === "specificChild" ? { child: children(item).find(i => i.code === childCode) ? title(children(item).find(i => i.code === childCode)!) : childCode } : {}) })));
    }
    if (["aggregationRule", "type"].includes(key)) text = human(String(value));
    result[key] = { value, text: text ?? display(value) };
  }
  return result;
}
// Check semantic values, never display placeholders: false and zero are meaningful.
function isEmpty(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0);
}
function changed(before: Fields, after: Fields): ChangeField[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(k => !equal(before[k]?.value ?? "", after[k]?.value ?? "")).map(k => ({ label: labels[k] ?? human(k), before: before[k]?.text ?? "Not applicable", after: after[k]?.text ?? "Not applicable", beforeEmpty: isEmpty(before[k]?.value), afterEmpty: isEmpty(after[k]?.value) }));
}
function branch(item: Item, status: "added" | "removed", location: ChangeLocation[]): ChangeEntry {
  return { id: `${status}:${item.clientKey}`, title: title(item), path: locationPath(location), location, item: locationItem(item), status, fields: Object.entries(fields(item, [])).filter(([, field]) => !isEmpty(field.value)).map(([key, value]) => ({ label: labels[key] ?? human(key), before: status === "removed" ? value.text : "", after: status === "added" ? value.text : "", beforeEmpty: status === "added", afterEmpty: status === "removed" })), children: children(item).map(c => branch(c, status, [...location, locationItem(item)])) };
}
function compareItems(before: Item[], after: Item[], location: ChangeLocation[]): ChangeEntry[] {
  const path = locationPath(location);
  const entries: ChangeEntry[] = [];
  const old = new Map(before.map(i => [i.clientKey, i]));
  const next = new Map(after.map(i => [i.clientKey, i]));
  for (const item of after) {
    const previous = old.get(item.clientKey);
    if (!previous) { entries.push(branch(item, "added", location)); continue; }
    const changes = changed(fields(previous, before), fields(item, after));
    if (changes.length) entries.push({ id: item.clientKey, title: title(item), path, location, item: locationItem(item), status: "updated", fields: changes });
    entries.push(...compareItems(children(previous), children(item), [...location, locationItem(item)]));
  }
  for (const item of before) if (!next.has(item.clientKey)) entries.push(branch(item, "removed", location));
  const oldOrder = before.filter(i => next.has(i.clientKey));
  const newOrder = after.filter(i => old.has(i.clientKey));
  if (!equal(oldOrder.map(i => i.clientKey), newOrder.map(i => i.clientKey))) entries.push({ id: `order:${location.map(item => item.key).join("/")}`, title: "Order changed", path, location, status: "order", fields: [{ label: "Item order", before: oldOrder.map(title).join("\n"), after: newOrder.map(title).join("\n"), beforeEmpty: false, afterEmpty: false }] });
  return entries;
}
function plainFields(value: Record<string, unknown>): Fields {
  return Object.fromEntries(Object.entries(value).map(([key, v]) => { const normalized = typeof v === "string" ? v.trim() : v ?? ""; return [key, { value: normalized, text: key === "aggregationRule" ? human(String(normalized)) : display(normalized) }]; }));
}
export function compareDocuments(baseline: MaturityModelEditorDocument | null, current: MaturityModelEditorDocument, provenance: ComparisonProvenance = "source", domains: readonly { id: number; name: string }[] = []): ChangesPreview {
  const overview = (d: MaturityModelEditorDocument) => {
    const values = plainFields({ name: d.name, description: d.description, autoEvaluated: d.autoEvaluated, domainId: d.domainId, aggregationRule: d.aggregationRule });
    values.domainId.text = domains.find(domain => domain.id === d.domainId)?.name ?? (d.domainId == null ? "Not provided" : `Domain ${d.domainId}`);
    return values;
  };
  const group = (id: string, name: string, changes: ChangeField[]): ChangeEntry[] => changes.length ? [{ id, title: name, path: "", status: "updated", fields: changes }] : [];
  const overviewEntries = baseline ? group("overview", "Model settings", changed(overview(baseline), overview(current))) : [];
  const scale = baseline ? [...new Set([...baseline.levels, ...current.levels].map(l => l.number))].flatMap(number => {
    const a = baseline.levels.find(l => l.number === number); const b = current.levels.find(l => l.number === number);
    const differences = changed(plainFields(a ? { name: a.name, description: a.description } : {}), plainFields(b ? { name: b.name, description: b.description } : {}));
    if ((!a || !b) && !differences.length) differences.push({ label: "Name", before: a ? display(a.name) : "", after: b ? display(b.name) : "", beforeEmpty: isEmpty(a?.name), afterEmpty: isEmpty(b?.name) });
    return group(`level:${number}`, `Level ${number}`, differences).map(e => ({ ...e, status: !a ? "added" as const : !b ? "removed" as const : e.status }));
  }) : [];
  const structure = baseline ? compareItems(baseline.dimensions, current.dimensions, []) : current.dimensions.map(i => branch(i, "added", []));
  const notes = changed(plainFields({ changelogMarkdown: baseline?.changelogMarkdown ?? "" }), plainFields({ changelogMarkdown: current.changelogMarkdown }));
  const counts = { updated: 0, added: 0, removed: 0, order: 0 };
  [...overviewEntries, ...scale, ...structure].forEach(e => counts[e.status]++);
  return { isNew: !baseline, overview: overviewEntries, scale, structure, releaseNotes: group("notes", "Release notes", notes)[0] ?? null, counts, limitation: provenance === "source" ? undefined : provenance === "import" ? "Workbook items are matched by code within their parent. Changed codes or parents can appear as removals and additions." : "This older browser draft was matched by code. Renamed or reordered items may appear as removals and additions." };
}

/** Reconcile only unique exact codes under matched parents; never infer identity from wording. */
export function reconcileDocument(incoming: MaturityModelEditorDocument, current: MaturityModelEditorDocument | null, baseline: MaturityModelEditorDocument | null): MaturityModelEditorDocument {
  const result = structuredClone(incoming);
  const used = new Set<string>();
  function reconcile(items: Item[], first: Item[], second: Item[]) {
    for (const item of items) {
      const unique = (pool: Item[]) => { const matches = pool.filter(i => i.code === item.code); return matches.length === 1 && items.filter(i => i.code === item.code).length === 1 ? matches[0] : undefined; };
      const a = unique(first); const b = unique(second);
      const match = a && !used.has(a.clientKey) ? a : b && !used.has(b.clientKey) ? b : undefined;
      item.clientKey = match?.clientKey ?? crypto.randomUUID();
      used.add(item.clientKey);
      reconcile(children(item), a ? children(a) : [], b ? children(b) : []);
    }
  }
  reconcile(result.dimensions, current?.dimensions ?? [], baseline?.dimensions ?? []);
  return result;
}

export type ChangeTreeNode = {
  key: string;
  item?: ChangeLocation;
  entry?: ChangeEntry;
  children: ChangeTreeNode[];
};

/** Group by stable identity, so renamed parents and names containing slashes stay together. */
export function buildChangeTree(entries: ChangeEntry[]): ChangeTreeNode[] {
  const roots: ChangeTreeNode[] = [];
  for (const entry of entries) {
    let siblings = roots;
    for (const item of entry.location ?? []) {
      let node = siblings.find(candidate => candidate.key === item.key);
      if (!node) {
        node = { key: item.key, item, children: [] };
        siblings.push(node);
      }
      siblings = node.children;
    }
    const key = entry.item?.key ?? entry.id;
    const existing = siblings.find(node => node.key === key);
    if (existing) {
      existing.entry = entry;
      existing.item = entry.item;
    } else {
      siblings.push({ key, item: entry.item, entry, children: [] });
    }
  }
  return roots;
}
