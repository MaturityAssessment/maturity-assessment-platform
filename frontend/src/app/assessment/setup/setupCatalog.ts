import type {
  AssessmentResponse,
  Domain,
  MaturityModelSummary,
} from "@/api/types";
import type { MaturityModelGroup } from "../../maturity-models/catalog";

export type SetupSortOrder =
  | "domain-asc"
  | "model-asc"
  | "in-progress"
  | "questions-desc";

export type AssessmentSetupItem = {
  model: MaturityModelSummary;
  currentDraft: AssessmentResponse | null;
  legacyDrafts: AssessmentResponse[];
  progress: number | null;
  updatedLabel: string | null;
  latestDraftTime: number;
};

export function buildSetupCatalogItems(
  groups: MaturityModelGroup[],
  drafts: AssessmentResponse[],
  now = Date.now()
): AssessmentSetupItem[] {
  return groups.flatMap((group) => {
    const model = group.activeVersion;
    if (!model) return [];

    const lineageModelIds = new Set(group.versions.map((version) => version.id));
    const lineageDrafts = drafts
      .filter(
        (draft) =>
          draft.maturityModelId != null &&
          lineageModelIds.has(draft.maturityModelId)
      )
      .sort(compareDraftsByRecency);
    const currentDraft =
      lineageDrafts.find((draft) => draft.maturityModelId === model.id) ?? null;
    const legacyDrafts = lineageDrafts.filter(
      (draft) => draft.maturityModelId !== model.id
    );
    const versionById = new Map(
      group.versions.map((version) => [version.id, version])
    );
    const latestDraft = currentDraft ?? legacyDrafts[0] ?? null;

    return [
      {
        model,
        currentDraft,
        legacyDrafts,
        progress: currentDraft
          ? getDraftProgress(
              currentDraft,
              currentDraft.maturityModelId
                ? versionById.get(currentDraft.maturityModelId)
                : model
            )
          : null,
        updatedLabel: latestDraft
          ? formatRelativeDate(
              latestDraft.updatedAt || latestDraft.createdAt,
              now
            )
          : null,
        latestDraftTime: latestDraft ? getDraftTime(latestDraft) : 0,
      },
    ];
  });
}

export function filterAndSortSetupItems(
  items: AssessmentSetupItem[],
  searchQuery: string,
  selectedDomainId: number | null,
  sortOrder: SetupSortOrder
) {
  const query = searchQuery.trim().toLocaleLowerCase();

  return items
    .filter(({ model }) => {
      const matchesSearch =
        !query ||
        [model.name, model.domainName, model.description].some((value) =>
          value?.toLocaleLowerCase().includes(query)
        );
      const matchesDomain =
        selectedDomainId == null || model.domainId === selectedDomainId;
      return matchesSearch && matchesDomain;
    })
    .sort((a, b) => compareSetupItems(a, b, sortOrder));
}

export function getSetupDomainOptions(
  domains: Domain[],
  items: AssessmentSetupItem[]
) {
  const availableIds = new Set(
    items
      .map(({ model }) => model.domainId)
      .filter((id): id is number => id != null)
  );
  const domainById = new Map(
    domains
      .filter((domain) => availableIds.has(domain.id))
      .map((domain) => [domain.id, domain])
  );

  items.forEach(({ model }) => {
    if (
      model.domainId != null &&
      model.domainName &&
      !domainById.has(model.domainId)
    ) {
      domainById.set(model.domainId, {
        id: model.domainId,
        name: model.domainName,
      });
    }
  });

  return Array.from(domainById.values()).sort((a, b) =>
    compareText(a.name, b.name)
  );
}

function compareSetupItems(
  a: AssessmentSetupItem,
  b: AssessmentSetupItem,
  sortOrder: SetupSortOrder
) {
  const domainComparison = compareText(
    a.model.domainName,
    b.model.domainName
  );
  const modelComparison = compareText(a.model.name, b.model.name);
  const stableFallback =
    domainComparison || modelComparison || a.model.id - b.model.id;

  switch (sortOrder) {
    case "model-asc":
      return modelComparison || domainComparison || a.model.id - b.model.id;
    case "in-progress": {
      const stateComparison = getDraftRank(a) - getDraftRank(b);
      if (stateComparison !== 0) return stateComparison;
      if (a.latestDraftTime !== b.latestDraftTime) {
        return b.latestDraftTime - a.latestDraftTime;
      }
      return stableFallback;
    }
    case "questions-desc":
      return (
        b.model.totalQuestions - a.model.totalQuestions || stableFallback
      );
    case "domain-asc":
    default:
      return stableFallback;
  }
}

function getDraftRank(item: AssessmentSetupItem) {
  if (item.currentDraft) return 0;
  if (item.legacyDrafts.length > 0) return 1;
  return 2;
}

function compareText(a?: string, b?: string) {
  return (a ?? "").localeCompare(b ?? "", undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function compareDraftsByRecency(
  a: AssessmentResponse,
  b: AssessmentResponse
) {
  return getDraftTime(b) - getDraftTime(a);
}

function getDraftTime(draft: AssessmentResponse) {
  const time = new Date(draft.updatedAt || draft.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getDraftProgress(
  draft: AssessmentResponse,
  model?: MaturityModelSummary
) {
  if (!model?.totalQuestions) return 0;

  const responseFields = Object.values(
    draft.questionEvaluations ?? {}
  ).filter((evaluation) => evaluation.response !== null && evaluation.response !== undefined);
  return Math.min(
    100,
    Math.round((responseFields.length / model.totalQuestions) * 100)
  );
}

function formatRelativeDate(value: string, now: number) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";

  const elapsed = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) return "Just now";
  if (elapsed < hour) {
    const minutes = Math.floor(elapsed / minute);
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }
  if (elapsed < day) {
    const hours = Math.floor(elapsed / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (elapsed < 7 * day) {
    const days = Math.floor(elapsed / day);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      new Date(value).getFullYear() === new Date(now).getFullYear()
        ? undefined
        : "numeric",
  });
}
