import type { GatingRule } from "@/api/types";
import { TEXT_LIMITS } from "../../../../config/textLimits.ts";

export type ElementCodeType = "D" | "M" | "P" | "Q";

export function codePrefix(type: ElementCodeType, ordinal: number) {
  return `${type}${String(ordinal).padStart(2, "0")}_`;
}

export function codeSuffix(code: string) {
  return code.replace(/^[DMPQ]\d+_/i, "");
}

export function codeWithPrefix(prefix: string, suffix: string) {
  return `${prefix}${suffix}`.slice(0, TEXT_LIMITS.code);
}

export function renumberSiblingCodes<
  T extends { code: string; dependsOnQuestionCode?: string; prerequisiteModuleCodes?: string[]; coRequisiteModuleCodes?: string[]; mutexModuleCodes?: string[] }
>(items: T[], type: ElementCodeType, gatingRules: GatingRule[] = []) {
  const nextCodes = items.map((item, index) =>
    codeWithPrefix(codePrefix(type, index + 1), codeSuffix(item.code))
  );
  // Compute every rename first so swapping prefixes cannot redirect references.
  const renames = new Map(
    items.map((item, index) => [item.code.toLowerCase(), nextCodes[index]])
  );
  const reference = (code: string | undefined) =>
    code === undefined ? undefined : renames.get(code.toLowerCase()) ?? code;
  return {
    items: items.map((item, index) => ({
      ...item,
      code: nextCodes[index],
      ...(item.prerequisiteModuleCodes && { prerequisiteModuleCodes: item.prerequisiteModuleCodes.map((code) => reference(code)!) }),
      ...(item.coRequisiteModuleCodes && { coRequisiteModuleCodes: item.coRequisiteModuleCodes.map((code) => reference(code)!) }),
      ...(item.mutexModuleCodes && { mutexModuleCodes: item.mutexModuleCodes.map((code) => reference(code)!) }),
      ...(item.dependsOnQuestionCode && {
        dependsOnQuestionCode: reference(item.dependsOnQuestionCode),
      }),
    })),
    gatingRules: gatingRules.map((rule) =>
      rule.selection === "specificChild"
        ? { ...rule, childCode: reference(rule.childCode) }
        : rule
    ),
  };
}
