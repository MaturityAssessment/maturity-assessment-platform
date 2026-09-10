import { MaturityModelSummary } from "@/api/types";

export const VIEW_STORAGE_KEY = "maturity-models-catalog-view";

export type CatalogView = "cards" | "rows";
export type StatusFilter = "all" | "active" | "inactive";
export type SortOrder =
  | "created-desc"
  | "created-asc"
  | "name-asc"
  | "name-desc"
  | "domain"
  | "questions-desc"
  | "questions-asc"
  | "versions-desc";

export type MaturityModelGroup = {
  baseModelId: number;
  versions: MaturityModelSummary[];
  representative: MaturityModelSummary;
  activeVersion?: MaturityModelSummary;
  latestVersion: MaturityModelSummary;
  createdAt: string;
};

export function isCatalogView(value: string | null): value is CatalogView {
  return value === "cards" || value === "rows";
}

export function pluralLabel(
  count: number,
  singular: string,
  pluralWord: string
) {
  return count === 1 ? singular : pluralWord;
}

export function groupMaturityModels(
  models: MaturityModelSummary[]
): MaturityModelGroup[] {
  const grouped = new Map<number, MaturityModelSummary[]>();

  models.forEach((model) => {
    const baseModelId = model.baseModelId ?? model.id;
    const versions = grouped.get(baseModelId) ?? [];
    versions.push(model);
    grouped.set(baseModelId, versions);
  });

  return Array.from(grouped.entries()).map(([baseModelId, versions]) => {
    const sorted = [...versions].sort(
      (a, b) => (a.version ?? 0) - (b.version ?? 0)
    );
    const activeVersion = sorted.find((model) => model.isActive);
    const latestVersion = sorted[sorted.length - 1];

    return {
      baseModelId,
      versions: sorted,
      representative: activeVersion ?? latestVersion,
      activeVersion,
      latestVersion,
      createdAt: sorted[0].createdAt,
    };
  });
}

function compareText(a: string | undefined, b: string | undefined) {
  return (a ?? "").localeCompare(b ?? "", undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

export function filterAndSortGroups(
  groups: MaturityModelGroup[],
  searchQuery: string,
  selectedDomainId: number | null,
  statusFilter: StatusFilter,
  sortOrder: SortOrder
) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  return groups
    .filter((group) => {
      const model = group.representative;
      const matchesSearch =
        !normalizedQuery ||
        [model.name, model.description, model.domainName].some((value) =>
          value?.toLocaleLowerCase().includes(normalizedQuery)
        );
      const matchesDomain =
        selectedDomainId == null || model.domainId === selectedDomainId;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? Boolean(group.activeVersion)
          : !group.activeVersion);

      return matchesSearch && matchesDomain && matchesStatus;
    })
    .sort((a, b) => {
      const aModel = a.representative;
      const bModel = b.representative;
      const nameTieBreaker = compareText(aModel.name, bModel.name);

      switch (sortOrder) {
        case "name-desc":
          return compareText(bModel.name, aModel.name);
        case "domain":
          return (
            compareText(aModel.domainName, bModel.domainName) || nameTieBreaker
          );
        case "questions-desc":
          return bModel.totalQuestions - aModel.totalQuestions || nameTieBreaker;
        case "questions-asc":
          return aModel.totalQuestions - bModel.totalQuestions || nameTieBreaker;
        case "versions-desc":
          return b.versions.length - a.versions.length || nameTieBreaker;
        case "created-desc":
          return (
            compareCreatedAt(b.createdAt, a.createdAt) || nameTieBreaker
          );
        case "created-asc":
          return (
            compareCreatedAt(a.createdAt, b.createdAt) || nameTieBreaker
          );
        case "name-asc":
        default:
          return nameTieBreaker;
      }
    });
}

function compareCreatedAt(a: string, b: string) {
  return a.localeCompare(b);
}

export function getVersionSummary(group: MaturityModelGroup) {
  const activeVersion = group.activeVersion?.version;
  const latestVersion = group.latestVersion.version;

  if (!group.activeVersion) {
    return latestVersion != null
      ? `Latest v${latestVersion}`
      : "No active version";
  }

  if (
    group.latestVersion.id !== group.activeVersion.id &&
    latestVersion != null
  ) {
    return `Active v${activeVersion ?? "?"} · Latest v${latestVersion}`;
  }

  return activeVersion != null ? `Active v${activeVersion}` : "Active";
}
