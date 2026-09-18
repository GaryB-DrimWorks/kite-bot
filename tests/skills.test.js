import assert from "node:assert/strict";
import test from "node:test";
import {
  circlesForWind,
  fillForSkill,
  normalizeSkill,
  passesSkillFilter,
  SKILL_KEY,
  verdictFromCircles
} from "../src/skills/circles.js";

test("skill aliases map expert to advanced", () => {
  assert.equal(normalizeSkill("expert"), "advanced");
  assert.equal(normalizeSkill("experienced"), "advanced");
  assert.equal(normalizeSkill("Beginner"), "beginner");
});

test("white floors match the WhatsApp skill circles", () => {
  assert.equal(fillForSkill("beginner", 8, { dirOk: true }), "white");
  assert.equal(fillForSkill("intermediate", 6, { dirOk: true }), "white");
  assert.equal(fillForSkill("advanced", 4, { dirOk: true }), "white");
});

test("ideal bands are green and underpowered is blue", () => {
  assert.equal(fillForSkill("beginner", 14, { dirOk: true }), "green");
  assert.equal(fillForSkill("beginner", 10, { dirOk: true }), "blue");
  assert.equal(fillForSkill("intermediate", 18, { dirOk: true }), "green");
  assert.equal(fillForSkill("advanced", 30, { dirOk: true }), "green");
});

test("circles are fills only — no B/I/A letters", () => {
  const circles = circlesForWind(14, { dirOk: true });
  assert.equal(circles.length, 3);
  assert.deepEqual(
    circles.map((circle) => circle.label),
    ["Beginner", "Intermediate", "Advanced"]
  );
  for (const circle of circles) {
    assert.equal(circle.emoji.length > 0, true);
    assert.match(circle.fill, /^(white|blue|green|orange|red)$/);
    assert.equal(/[BIA]/.test(circle.emoji), false);
  }
  assert.match(SKILL_KEY.layout, /Beginner · Intermediate · Advanced/);
  assert.equal(/legend/i.test(SKILL_KEY.key), false);
});

test("skill filter hides no-go beginner spots", () => {
  const light = circlesForWind(6, { dirOk: true });
  assert.equal(passesSkillFilter(light, "beginner"), false);
  assert.equal(passesSkillFilter(light, "all"), true);
  const good = circlesForWind(14, { dirOk: true });
  assert.equal(passesSkillFilter(good, "beginner"), true);
  const wrong = circlesForWind(16, { dirOk: false });
  const verdict = verdictFromCircles(wrong, { dirOk: false, knots: 16 });
  assert.equal(verdict.cls, "nogo");
});
