import assert from "node:assert/strict";
import test from "node:test";
import {
  deterministicDomainColor,
  resolveDomainColor,
  resolveDomainIcon,
  suggestDomainIcon,
} from "../../../src/lib/domainAppearance.ts";

test("suggests curated icons from domain keywords", () => {
  assert.equal(suggestDomainIcon("Cyber security and risk"), "shield");
  assert.equal(suggestDomainIcon("Software DevOps"), "code");
  assert.equal(suggestDomainIcon("People and culture"), "users");
  assert.equal(suggestDomainIcon("Something new"), "layers");
});

test("assigns stable colors and safely resolves old values", () => {
  assert.equal(deterministicDomainColor("Data"), deterministicDomainColor("Data"));
  assert.equal(resolveDomainIcon("removed-icon", "Data analytics"), "database");
  assert.equal(resolveDomainColor("removed-color", "Data analytics"), deterministicDomainColor("Data analytics"));
});
