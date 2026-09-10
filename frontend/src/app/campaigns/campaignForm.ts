export interface ParsedParticipantEmails {
  emails: string[];
  invalidEmails: string[];
  duplicateEmails: string[];
}

const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseParticipantEmails(value: string): ParsedParticipantEmails {
  const entries = value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim().toLocaleLowerCase())
    .filter(Boolean);
  const emails: string[] = [];
  const invalidEmails: string[] = [];
  const duplicateEmails: string[] = [];
  const seen = new Set<string>();

  entries.forEach((email) => {
    if (!SIMPLE_EMAIL_PATTERN.test(email)) {
      invalidEmails.push(email);
      return;
    }
    if (seen.has(email)) {
      duplicateEmails.push(email);
      return;
    }
    seen.add(email);
    emails.push(email);
  });

  return { emails, invalidEmails, duplicateEmails };
}

export function toCampaignEndIso(localDateTime: string): string | null {
  if (!localDateTime) return null;
  const date = new Date(localDateTime);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toLocalDateTimeInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function isCampaignExpired(endsAt: string, now = Date.now()): boolean {
  const value = Date.parse(endsAt);
  return Number.isFinite(value) && value <= now;
}
