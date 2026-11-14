export function hasGatingThresholdIssues(item: {
  minimumCoverage?: number;
  minimumIncludedCount?: number;
}) {
  return [item.minimumCoverage ?? 0, item.minimumIncludedCount ?? 0].some(
    (value) => !Number.isFinite(value) || value < 0 || value > 100
  );
}
