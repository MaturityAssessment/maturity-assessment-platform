import test from "node:test";
import assert from "node:assert/strict";
import {
  isCampaignExpired,
  parseParticipantEmails,
  toCampaignEndIso,
} from "../../../../src/app/campaigns/campaignForm.ts";

test("parses, normalizes, and deduplicates participant emails", () => {
  const parsed = parseParticipantEmails(
    " Alice@Example.com\nbob@example.com, alice@example.com;invalid"
  );

  assert.deepEqual(parsed.emails, [
    "alice@example.com",
    "bob@example.com",
  ]);
  assert.deepEqual(parsed.duplicateEmails, ["alice@example.com"]);
  assert.deepEqual(parsed.invalidEmails, ["invalid"]);
});

test("converts a local campaign deadline into an ISO instant", () => {
  const value = toCampaignEndIso("2026-08-01T12:30");
  assert.ok(value);
  assert.equal(Number.isNaN(Date.parse(value)), false);
  assert.equal(toCampaignEndIso(""), null);
  assert.equal(toCampaignEndIso("not-a-date"), null);
});

test("detects campaign expiration against an injected clock", () => {
  const now = Date.parse("2026-08-01T12:00:00Z");
  assert.equal(isCampaignExpired("2026-08-01T11:59:59Z", now), true);
  assert.equal(isCampaignExpired("2026-08-01T12:00:01Z", now), false);
});
