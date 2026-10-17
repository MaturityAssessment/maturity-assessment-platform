import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dependencyMatches } from "../../../src/lib/questionDependencies.ts";

const fixtures = JSON.parse(readFileSync(new URL("../../../../tests/fixtures/question-dependencies.json", import.meta.url), "utf8"));

for (const fixture of fixtures.cases) {
  test(fixture.name, () => {
    const value = fixture.choiceIndex === undefined ? fixture.value : `choice:${fixture.choiceIndex}`;
    assert.equal(dependencyMatches(fixtures.parents[fixture.parent], fixture.condition, value), fixture.expected);
  });
}
