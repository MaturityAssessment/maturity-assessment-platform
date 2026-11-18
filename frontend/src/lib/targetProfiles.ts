import type { AssessmentProfiling, MaturityModelEditorDocument, ProfilingQuestion, TargetProfileConfiguration, TargetProfileStatus } from "../api/types.ts";

export const targetStatusLabel = (status: TargetProfileStatus) => ({ MET: "Met", NOT_MET: "Not met", NOT_EVALUATED: "Not evaluated" })[status];
export function targetReasonLabel(reason: string | null | undefined): string {
  return ({ NO_PROFILE: "No target profile applies to this assessment.", PROFILING_INCOMPLETE: "Profiling was not completed.", PROFILE_UNAVAILABLE: "The selected profile is unavailable.", NO_REQUIREMENTS: "This profile has no requirements to compare.", SCORES_UNAVAILABLE: "Some required scores are unavailable or need review.", SCORE_UNAVAILABLE: "Score unavailable", REVIEW_REQUIRED: "Score needs review", PENDING_EVALUATION: "Comparison is available after evaluation." } as Record<string, string>)[reason ?? ""] ?? "";
}

/** Only answers on the active path survive an upstream change. No scored answers are touched. */
export function profilingPath(config: TargetProfileConfiguration, answers: Record<string, string>) {
  const questions: ProfilingQuestion[] = [];
  const retained: Record<string, string> = {};
  let id = config.rootQuestionId;
  const seen = new Set<string>();
  while (!seen.has(id)) {
    seen.add(id);
    const question = config.questions.find(item => item.id === id);
    if (!question) break;
    questions.push(question);
    const option = question.options.find(item => item.id === answers[id]);
    if (!option) break;
    retained[id] = option.id;
    if (option.destination.type === "question") { id = option.destination.id ?? ""; continue; }
    const profile = option.destination.type === "profile" ? config.profiles.find(item => item.id === option.destination.id) : null;
    const complete = option.destination.type === "none" || Boolean(profile);
    return { questions, selection: { complete, answers: retained, profileId: profile?.id ?? null, profileName: profile?.name ?? null } satisfies AssessmentProfiling };
  }
  return { questions, selection: { complete: false, answers: retained, profileId: null, profileName: null } satisfies AssessmentProfiling };
}

export function targetProfileIssues(document: MaturityModelEditorDocument): Array<{ severity: "error" | "warning"; message: string }> {
  const config = document.targetProfiles;
  if (!config) return [];
  const issues: Array<{ severity: "error" | "warning"; message: string }> = [];
  const error = (message: string) => issues.push({ severity: "error", message });
  const text = (value: string | null | undefined, max: number) => Boolean(value?.trim()) && value!.length <= max;
  const identity = (value: string) => /^[A-Za-z0-9_-]{1,80}$/.test(value);
  if (config.version !== 1) error("Unsupported profiling configuration version.");
  if (!config.profiles.length || config.profiles.length > 128) error("Define between 1 and 128 profiles, or remove profiling.");
  if (!config.questions.length || config.questions.length > 128) error("Define between 1 and 128 profiling questions.");
  const questionIds = new Set<string>(), profileIds = new Set<string>();
  for (const profile of config.profiles) {
    if (!identity(profile.id) || profileIds.has(profile.id)) error("Profile IDs must be unique stable identities.");
    profileIds.add(profile.id);
    if (!text(profile.name, 200)) error("Every profile needs a name of at most 200 characters.");
    if ((profile.description?.length ?? 0) > 4000) error("Profile descriptions must be at most 4,000 characters.");
    if (profile.expectedLevel != null && !document.levels.some(level => level.number === profile.expectedLevel)) error((profile.name || "Profile") + ": select an existing expected maturity level.");
    if (!profile.requirements.length && profile.expectedLevel == null) issues.push({ severity: "warning", message: (profile.name || "Profile") + " has no targets; its outcome will be not evaluated." });
    if (profile.requirements.length > 2048) error("A profile may have at most 2,048 requirements.");
    const targets = new Set<string>();
    for (const requirement of profile.requirements) {
      const dimension = document.dimensions.find(item => item.code.toLowerCase() === requirement.dimensionCode.toLowerCase());
      const moduleItem = dimension?.modules.find(item => item.code.toLowerCase() === requirement.moduleCode?.toLowerCase());
      if (!dimension || (requirement.elementType === "module" && (!moduleItem || moduleItem.visible === false)) || (requirement.elementType === "dimension" && requirement.moduleCode != null)) error((profile.name || "Profile") + ": repair a target that references a missing dimension or a hidden/missing module.");
      if (!Number.isFinite(requirement.minimumScore) || requirement.minimumScore < 0 || requirement.minimumScore > 1) error("Minimum target scores must be between 0% and 100%.");
      const key = [requirement.elementType, requirement.dimensionCode, requirement.moduleCode ?? ""].join("/").toLowerCase();
      if (targets.has(key)) error("A profile cannot target the same element twice.");
      targets.add(key);
    }
  }
  for (const question of config.questions) {
    if (!identity(question.id) || questionIds.has(question.id)) error("Profiling question IDs must be unique stable identities.");
    questionIds.add(question.id);
    if (!text(question.text, 1000)) error("Every profiling question needs text of at most 1,000 characters.");
    if (question.options.length < 2 || question.options.length > 32) error("Each profiling question needs between 2 and 32 options.");
    const options = new Set<string>();
    for (const option of question.options) {
      if (!identity(option.id) || options.has(option.id)) error("Option IDs must be unique within their question.");
      options.add(option.id);
      if (!text(option.label, 200)) error("Every option needs a label of at most 200 characters.");
    }
  }
  if (!questionIds.has(config.rootQuestionId)) error("Select the first profiling question.");
  const incoming = new Set<string>();
  for (const question of config.questions) for (const option of question.options) {
    const destination = option.destination;
    if (destination.type === "question") {
      if (!questionIds.has(destination.id ?? "")) error("An option references a missing question.");
      if (incoming.has(destination.id ?? "")) error("Each follow-up question must have one parent option.");
      incoming.add(destination.id ?? "");
    } else if (destination.type === "profile") {
      if (!profileIds.has(destination.id ?? "")) error("An option references a missing profile.");
    } else if (destination.type !== "none" || destination.id != null) error("An option has an invalid destination.");
  }
  if (incoming.has(config.rootQuestionId)) error("The first question cannot have a parent.");
  const visited = new Set<string>();
  const walk = (id: string, stack: Set<string>) => {
    if (stack.has(id)) { error("Profiling questions cannot form a cycle."); return; }
    if (visited.has(id)) return;
    visited.add(id);
    const next = new Set([...stack, id]);
    config.questions.find(item => item.id === id)?.options.forEach(option => {
      if (option.destination.type === "question" && questionIds.has(option.destination.id ?? "")) walk(option.destination.id!, next);
    });
  };
  if (questionIds.has(config.rootQuestionId)) walk(config.rootQuestionId, new Set());
  if (visited.size !== questionIds.size) error("Connect all profiling questions to the first question; disconnected questions and cycles cannot be saved.");
  for (const profile of config.profiles) {
    if (!config.questions.some(question => question.options.some(option => option.destination.type === "profile" && option.destination.id === profile.id))) {
      issues.push({ severity: "warning", message: (profile.name || "Profile") + " is not linked to an answer in the profiling tree." });
    }
  }
  return issues;
}

/** Follow item identities through code changes and swaps. Keep deletions visibly broken. */
export function repairTargetReferences(before: MaturityModelEditorDocument, after: MaturityModelEditorDocument): MaturityModelEditorDocument {
  if (!after.targetProfiles || JSON.stringify(before.targetProfiles) !== JSON.stringify(after.targetProfiles)) return after;
  const profiles = after.targetProfiles.profiles.map(profile => ({ ...profile, requirements: profile.requirements.map(target => {
    const original = before.dimensions.find(item => item.code.toLowerCase() === target.dimensionCode.toLowerCase());
    if (!original) return target;
    const dimension = after.dimensions.find(item => item.clientKey === original.clientKey);
    const originalModule = original.modules.find(item => item.code.toLowerCase() === target.moduleCode?.toLowerCase());
    const moduleItem = originalModule && dimension?.modules.find(item => item.clientKey === originalModule.clientKey);
    return { ...target, dimensionCode: dimension?.code ?? "missing_" + original.clientKey, moduleCode: originalModule ? moduleItem?.code ?? "missing_" + originalModule.clientKey : target.moduleCode };
  }) }));
  return { ...after, targetProfiles: { ...after.targetProfiles, profiles } };
}

export function targetProfilesForComparison(document: MaturityModelEditorDocument) {
  if (!document.targetProfiles) return null;
  return { ...document.targetProfiles, profiles: document.targetProfiles.profiles.map(profile => ({ ...profile, requirements: profile.requirements.map(target => {
    const dimension = document.dimensions.find(item => item.code.toLowerCase() === target.dimensionCode.toLowerCase());
    return { ...target, dimensionCode: dimension?.clientKey ?? target.dimensionCode, moduleCode: dimension?.modules.find(item => item.code.toLowerCase() === target.moduleCode?.toLowerCase())?.clientKey ?? target.moduleCode };
  }) })) };
}

export function describeTargetProfiles(document: MaturityModelEditorDocument): string {
  const config = document.targetProfiles;
  if (!config) return "No target profiles";
  return [
    ...config.profiles.map(profile => [
      profile.name || "Unnamed profile", profile.description,
      ...profile.requirements.map(target => {
        const dimension = document.dimensions.find(item => item.code.toLowerCase() === target.dimensionCode.toLowerCase());
        const moduleItem = dimension?.modules.find(item => item.code.toLowerCase() === target.moduleCode?.toLowerCase());
        return (dimension?.name || target.dimensionCode) + (target.elementType === "module" ? " / " + (moduleItem?.name || target.moduleCode) : "") + ": minimum " + Math.round(target.minimumScore * 1000) / 10 + "%";
      }),
      profile.expectedLevel == null ? null : "Expected level: " + (document.levels.find(level => level.number === profile.expectedLevel)?.name || "Removed level"),
    ].filter(Boolean).join(" · ")),
    ...config.questions.map(question => (question.id === config.rootQuestionId ? "Start: " : "") + (question.text || "Untitled question") + " — " + question.options.map(option => option.label + " → " + (option.destination.type === "none" ? "No profile" : option.destination.type === "profile" ? config.profiles.find(profile => profile.id === option.destination.id)?.name || "Missing profile" : config.questions.find(item => item.id === option.destination.id)?.text || "Missing question")).join("; ")),
  ].join("\n");
}
