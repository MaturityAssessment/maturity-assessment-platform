import {
  CalendarDays,
  CircleDot,
  FileQuestion,
  Layers3,
  Scale,
  ScrollText,
  UserRound,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MaturityModel } from "@/api/types";
import { countModelStructure } from "./ModelStructureExplorer";

function OverviewStat({
  value,
  label,
  icon: Icon,
}: {
  value: number | string;
  label: string;
  icon: typeof Layers3;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-50 ring-1 ring-inset ring-slate-200">
        <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-slate-600">
        {label}
      </span>
      <strong className="max-w-[55%] text-right text-sm font-bold tabular-nums text-slate-950">
        {value}
      </strong>
    </div>
  );
}

export default function ModelVersionOverview({
  model,
  creatorName,
  createdAt,
}: {
  model: MaturityModel;
  creatorName?: string | null;
  createdAt?: string | null;
}) {
  const counts = countModelStructure(model);
  const changelog = model.changelogMarkdown?.trim() ?? "";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
      <section
        aria-labelledby="version-changelog-heading"
        className="min-h-[34rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100">
            <ScrollText className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="version-changelog-heading"
              className="text-base font-bold text-slate-950"
            >
              Changelog
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-400">
              CHANGELOG.md · Version {model.version ?? "?"}
            </p>
          </div>
        </header>

        {changelog ? (
          <article className="model-changelog px-5 py-7 sm:px-7 sm:py-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {changelog}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="flex min-h-[27rem] items-center justify-center px-6 py-16 text-center">
            <div className="max-w-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <ScrollText className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No changelog for this version
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                Release notes can be added in Markdown when the next model
                version is created.
              </p>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-5">
        <section
          aria-labelledby="version-stats-heading"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <header className="border-b border-slate-200 px-5 py-4">
            <h2
              id="version-stats-heading"
              className="text-sm font-bold text-slate-950"
            >
              Overview
            </h2>
          </header>
          <div className="divide-y divide-slate-100">
            <OverviewStat
              value={creatorName?.trim() || "Unavailable"}
              label="Creator name"
              icon={UserRound}
            />
            <OverviewStat
              value={createdAt || "Unavailable"}
              label="Creation date"
              icon={CalendarDays}
            />
            <OverviewStat
              value={counts.dimensions}
              label="Dimensions"
              icon={Layers3}
            />
            <OverviewStat
              value={counts.modules}
              label="Modules"
              icon={Layers3}
            />
            <OverviewStat
              value={counts.practices}
              label="Practices"
              icon={CircleDot}
            />
            <OverviewStat
              value={counts.questions}
              label="Questions"
              icon={FileQuestion}
            />
          </div>
        </section>

        <section
          aria-labelledby="maturity-scale-heading"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <header className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              <h2
                id="maturity-scale-heading"
                className="text-sm font-bold text-slate-950"
              >
                Maturity scale
              </h2>
            </div>
          </header>
          {model.levels?.length ? (
            <ol className="divide-y divide-slate-100 px-5">
              {model.levels.map((level) => (
                <li key={level.number} className="flex gap-3 py-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                    {level.number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">
                      {level.name}
                    </p>
                    {level.description?.trim() && (
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                        {level.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-5 py-6 text-sm text-slate-500">
              No maturity scale is defined for this version.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
