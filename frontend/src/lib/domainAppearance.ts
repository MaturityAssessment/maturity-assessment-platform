export const DOMAIN_ICON_KEYS = [
  "layers", "shield", "code", "database", "users", "settings", "compass", "chart", "cloud", "briefcase",
] as const;

export const DOMAIN_COLOR_KEYS = ["blue", "emerald", "violet", "amber", "rose", "slate"] as const;

export type DomainIconKey = (typeof DOMAIN_ICON_KEYS)[number];
export type DomainColorKey = (typeof DOMAIN_COLOR_KEYS)[number];

const rules: Array<[RegExp, DomainIconKey]> = [
  [/security|cyber|risk/i, "shield"],
  [/software|development|devops|\bcode\b/i, "code"],
  [/data|analytics|information/i, "database"],
  [/people|culture|workforce/i, "users"],
  [/operations?|process|service/i, "settings"],
  [/strategy|transformation/i, "compass"],
];

export function suggestDomainIcon(name: string): DomainIconKey {
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? "layers";
}

export function deterministicDomainColor(name: string): DomainColorKey {
  let hash = 0;
  for (const character of name.trim().toLocaleLowerCase()) {
    hash = (hash * 31 + character.codePointAt(0)!) | 0;
  }
  const index =
    ((hash % DOMAIN_COLOR_KEYS.length) + DOMAIN_COLOR_KEYS.length) %
    DOMAIN_COLOR_KEYS.length;
  return DOMAIN_COLOR_KEYS[index];
}

export function resolveDomainIcon(key: string | null | undefined, name = ""): DomainIconKey {
  return DOMAIN_ICON_KEYS.includes(key as DomainIconKey) ? key as DomainIconKey : suggestDomainIcon(name);
}

export function resolveDomainColor(key: string | null | undefined, name = ""): DomainColorKey {
  return DOMAIN_COLOR_KEYS.includes(key as DomainColorKey) ? key as DomainColorKey : deterministicDomainColor(name);
}
