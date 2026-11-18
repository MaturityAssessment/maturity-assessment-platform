import type { ScoreLimit } from "@/api/types";
import { TrashIcon } from "@heroicons/react/24/outline";
import { scoreLimitIssues, scoreLimitLinked, type LimitOwner } from "../model/scoreLimits.ts";

const score = (value: number) => Number.isFinite(value) ? Number(value.toPrecision(15)) : "";
const normalized = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const controlClass = "h-9 w-full rounded-md border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const sliderClass = "pointer-events-none absolute inset-0 m-0 h-9 w-full appearance-none bg-transparent focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-blue-600 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:cursor-ew-resize [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:bg-blue-600";

export default function ScoreLimitFields({ owner, onChange }: { owner: LimitOwner; onChange: (limits: ScoreLimit[]) => void }) {
  const limits = owner.scoreLimits ?? [];
  const candidates = [
    ...(owner.childStateGatingRules ?? []).map((rule, i) => ({ label: rule.name || `Child-state rule ${i + 1}`, childStateRule: rule, conditionalRule: undefined })),
    ...(owner.conditionalGatingRules ?? []).map((rule, i) => ({ label: rule.name || `Conditional rule ${i + 1}`, childStateRule: undefined, conditionalRule: rule })),
  ].filter(option => (option.childStateRule ?? option.conditionalRule)?.effect === "flagForReview");
  type Gate = (typeof candidates)[number];
  const linkedTo = (limit: ScoreLimit, option: Gate) => scoreLimitLinked(limit, {
    childStateGatingRules: option.childStateRule ? [option.childStateRule] : [],
    conditionalGatingRules: option.conditionalRule ? [option.conditionalRule] : [],
  });
  const options = candidates.filter((option, index) => !candidates.slice(0, index).some(previous => linkedTo({
    kind: "ceiling", value: 0.5, childStateRule: option.childStateRule, conditionalRule: option.conditionalRule,
  }, previous)));
  const used = (option: Gate, except = -1) => limits.some((limit, index) => index !== except && linkedTo(limit, option));
  const available = options.find(option => !used(option));
  const update = (index: number, limit: ScoreLimit) => onChange(limits.map((current, i) => i === index ? limit : current));
  const issues = scoreLimitIssues(owner);
  const columns = "@2xl:grid-cols-[minmax(0,1fr)_10rem_minmax(0,2fr)_1.5rem]";

  return <section aria-label="Score limits" className="@container space-y-4 border-t border-gray-100 pt-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-950">Score limits{limits.length > 0 && <span className="font-normal text-gray-500"> · {limits.length}</span>}</h3>
        <p className="mt-1 text-xs leading-5 text-gray-600">Set a floor, a ceiling or both when a Flag for Review gate matches.</p>
      </div>
      <button type="button" disabled={!available || limits.length >= 100}
        className="shrink-0 rounded py-0.5 text-xs font-medium text-blue-700 hover:text-blue-900 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => { if (available && limits.length < 100) onChange([...limits, { kind: "ceiling", value: 0.5, childStateRule: structuredClone(available.childStateRule), conditionalRule: structuredClone(available.conditionalRule) }]); }}>
        <span aria-hidden="true">+ </span>Add score limit
      </button>
    </div>

    {limits.length > 0 ? <div>
      <div aria-hidden="true" className={`hidden gap-x-4 border-b border-gray-200 pb-2 text-xs text-gray-600 @2xl:grid ${columns}`}>
        <span>Gate</span><span>Limit</span><span>Range · 0–1</span><span />
      </div>
      <div className="divide-y divide-gray-200 border-b border-gray-200">
        {limits.map((limit, i) => {
          const selected = options.findIndex(option => linkedTo(limit, option));
          const duplicate = selected >= 0 && used(options[selected], i);
          const gate = limit.childStateRule ?? limit.conditionalRule;
          const hasFloor = limit.kind === "floor" || limit.kind === "both";
          const hasCeiling = limit.kind === "ceiling" || limit.kind === "both";
          const lower = hasFloor ? limit.value : 0;
          const upper = limit.kind === "both" ? limit.upperValue : hasCeiling ? limit.value : 1;
          const valid = normalized(lower) && normalized(upper) && lower <= upper;
          const safeLower = normalized(lower) ? lower : 0;
          const safeUpper = normalized(upper) ? upper : 1;
          const description = !valid ? "Enter values from 0 to 1, with the floor at or below the ceiling."
            : limit.kind === "both" ? `Score is raised to ${score(lower)} if below and capped at ${score(upper)} if above.`
            : hasFloor ? `Score is raised to ${score(lower)} if below.` : `Score is capped at ${score(upper)} if above.`;
          const changeKind = (kind: ScoreLimit["kind"]) => {
            if (kind === limit.kind) return;
            if (kind === "both") update(i, { ...limit, kind, value: hasFloor ? limit.value : 0, upperValue: hasCeiling ? limit.value : 1 });
            else {
              const { upperValue, ...single } = limit;
              update(i, { ...single, kind, value: kind === "ceiling" && limit.kind === "both" ? upperValue ?? NaN : limit.value });
            }
          };
          const changeBound = (bound: "floor" | "ceiling", value: number) => update(i, limit.kind === "both" && bound === "ceiling" ? { ...limit, upperValue: value } : { ...limit, value });
          const slide = (bound: "floor" | "ceiling", value: number) => changeBound(bound, Math.max(0, Math.min(1,
            bound === "floor" ? Math.min(Number((Math.round(value / 0.005) * 0.005).toFixed(3)), safeUpper) : Math.max(Number((Math.round(value / 0.005) * 0.005).toFixed(3)), safeLower))));
          const numeric = (bound: "floor" | "ceiling", value: number | null | undefined) => <label className="relative block w-[4.5rem] shrink-0">
            <span className="sr-only">{bound === "floor" ? "Floor" : "Ceiling"} value</span>
            <input type="number" aria-label={`Score limit ${i + 1} ${bound} value`} min={0} max={1} step={0.005}
              aria-invalid={!normalized(value) || !valid || undefined}
              value={typeof value === "number" ? score(value) : ""}
              onChange={event => changeBound(bound, event.target.value === "" ? NaN : Number(event.target.value))}
              className={`${controlClass} py-1.5 pl-1 pr-2 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${!normalized(value) || !valid ? "border-red-400" : ""}`} />
          </label>;
          const slider = (bound: "floor" | "ceiling", value: number) => <input type="range" min={0} max={1} step={0.005}
            aria-label={`Score limit ${i + 1} ${bound} range`} aria-valuetext={`${score(value)} ${bound}`}
            aria-valuemin={bound === "ceiling" ? Number(score(safeLower)) : 0}
            aria-valuemax={bound === "floor" ? Number(score(safeUpper)) : 1}
            value={score(value)} onChange={event => slide(bound, Number(event.target.value))}
            className={`${sliderClass} ${bound === "floor" && value === 1 ? "z-20" : bound === "ceiling" ? "z-10" : "z-0"}`} />;

          return <div key={i} role="group" aria-label={`Score limit ${i + 1}`}
            className={`grid grid-cols-[minmax(0,1fr)_1.5rem] items-start gap-x-4 gap-y-3 py-3.5 @2xl:grid ${columns} ${selected < 0 || duplicate ? "bg-amber-50/50" : ""}`}>
            <div className="min-w-0">
              <span className="mb-1 block text-xs text-gray-600 @2xl:hidden">Gate</span>
              <select aria-label={`Score limit ${i + 1} rule`} aria-invalid={selected < 0 || duplicate || undefined}
                title={gate?.description || undefined} className={`${controlClass} pl-3 pr-7 ${selected < 0 || duplicate ? "border-amber-400" : ""}`} value={selected < 0 ? "" : selected}
                onChange={event => {
                  if (event.target.value === "") return;
                  const option = options[Number(event.target.value)];
                  if (option && !used(option, i)) update(i, { ...limit, childStateRule: structuredClone(option.childStateRule), conditionalRule: structuredClone(option.conditionalRule) });
                }}>
                <option value="" disabled>Select a gate to relink</option>
                {options.map((option, index) => <option key={index} value={index} disabled={used(option, i)}>{option.label}{used(option, i) ? " (already has a limit)" : ""}</option>)}
              </select>
              {(selected < 0 || duplicate) && <p className="mt-1 text-xs text-amber-800">{selected < 0 ? `${gate?.name || "Linked gate"} changed or was removed` : "Choose another gate or remove this limit"}</p>}
            </div>
            <div className="col-start-1 @2xl:col-start-auto">
              <span className="mb-1 block text-xs text-gray-600 @2xl:hidden">Limit</span>
              <div role="group" aria-label={`Score limit ${i + 1} type`} className="inline-flex h-9 w-full max-w-[10rem] items-center rounded-md border border-gray-300 bg-white p-0.5">
                {(["floor", "ceiling", "both"] as const).map(kind => <button key={kind} type="button" aria-label={`Score limit ${i + 1} ${kind}`} aria-pressed={limit.kind === kind}
                  onClick={() => changeKind(kind)} className={`h-full flex-1 rounded px-2 text-xs focus-visible:outline-blue-600 ${limit.kind === kind ? "bg-blue-50 font-medium text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>
                  {kind === "floor" ? "Floor" : kind === "ceiling" ? "Ceiling" : "Both"}
                </button>)}
              </div>
            </div>
            <div className="col-span-2 min-w-0 @2xl:col-span-1">
              <span className="mb-1 block text-xs text-gray-600 @2xl:hidden">Range · 0–1</span>
              <div className="flex items-center gap-3">
                {hasFloor && numeric("floor", lower)}
                <div className="relative h-9 min-w-12 flex-1 cursor-pointer" role="group" aria-label={`Score limit ${i + 1} allowed range`}
                  onPointerDown={event => {
                    if (event.target !== event.currentTarget) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    const value = Math.max(0, Math.min(1, (event.clientX - rect.left - 7) / Math.max(1, rect.width - 14)));
                    slide(hasFloor && (!hasCeiling || Math.abs(value - safeLower) < Math.abs(value - safeUpper)) ? "floor" : "ceiling", value);
                  }}>
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-[7px] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-slate-200">
                    {valid && <span className="absolute inset-y-0 rounded-full bg-blue-600" style={{ left: `${safeLower * 100}%`, right: `${(1 - safeUpper) * 100}%` }} />}
                  </div>
                  {hasFloor && slider("floor", safeLower)}
                  {hasCeiling && slider("ceiling", safeUpper)}
                </div>
                {hasCeiling && numeric("ceiling", upper)}
              </div>
              <p className={`mt-1 text-xs leading-5 ${valid ? "text-gray-600" : "text-red-700"}`}>{description}</p>
            </div>
            <button type="button" className="col-start-2 row-start-1 flex h-9 items-center justify-center rounded text-gray-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-blue-600 @2xl:col-start-auto @2xl:row-start-auto" aria-label={`Remove score limit ${i + 1}`} onClick={() => onChange(limits.filter((_, index) => index !== i))}>
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>;
        })}
      </div>
    </div> : <p className="rounded-md border border-dashed border-gray-200 px-4 py-5 text-xs leading-5 text-gray-500">
      {options.length ? "No score limits. Add a limit to set a floor, a ceiling or both for a review gate." : "Create a Flag for Review gate in the Gating rules tab, then add a limit here."}
    </p>}

    {issues.map(message => <p key={message} role="alert" className="text-xs text-red-700">{message}</p>)}
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 text-xs leading-5 text-gray-600">
      {!!limits.length && !available && options.length > 0 && <p>All gates have a limit. Add more gates in the Gating rules tab.</p>}
      <details className="group basis-auto open:basis-full">
        <summary className="w-fit cursor-pointer text-blue-700 hover:text-blue-900">How limits apply</summary>
        <p className="mt-2 max-w-2xl text-gray-500">The blue segment shows the allowed scores when a gate matches. A floor raises scores below its value; a ceiling caps scores above it. Both applies the two bounds together. When multiple gates match, the highest floor and lowest ceiling apply. If the ceiling is below the floor, the score is withheld. Limits only apply to an existing score. Editing a linked gate requires selecting it again to confirm the limit.</p>
      </details>
    </div>
  </section>;
}
