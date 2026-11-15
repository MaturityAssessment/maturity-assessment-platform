export function hasGatingThresholdIssues(item: {
  childStateGatingRules?: import("@/api/types").ChildStateGatingRule[];
  minimumCoverage?: number;
  minimumIncludedCount?: number;
}) {
  return (item.childStateGatingRules ?? []).some(rule => !rule || !["any", "every", "no"].includes(rule.quantifier) || !["computed", "withheld"].includes(rule.state) || !["withheld", "flagForReview"].includes(rule.effect)) || [item.minimumCoverage ?? 0, item.minimumIncludedCount ?? 0].some(
    (value) => !Number.isFinite(value) || value < 0 || value > 100
  );
}
