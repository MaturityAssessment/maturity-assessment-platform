import type { MaturityModelSummary } from "@/api/types";

export function selectModelIdentity(versions: MaturityModelSummary[]) {
  const latestVersion = [...versions].sort(
    (left, right) => (right.version ?? 0) - (left.version ?? 0)
  )[0];
  return versions.find((version) => version.isActive) ?? latestVersion;
}
