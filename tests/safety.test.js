import assert from "node:assert/strict";
import test from "node:test";
import { getProfile } from "../src/config/profiles.js";
import { getSpot } from "../src/config/spots.js";
import { lostGearAdvice, safetyAdvice } from "../src/safety/advice.js";

test("offshore wind produces a do-not-launch warning", () => {
  const advice = safetyAdvice({
    spot: getSpot("takapuna"),
    profile: getProfile("beginner-self"),
    conditions: {
      effectiveWindKn: 18,
      windSpeedKn: 18,
      windDirection: 250,
      gustFactor: 1.2,
      waveHeightM: 0.5,
      currentSpeedKn: 0.2
    },
    tideFit: { ok: true, detail: "fine" }
  });
  assert.equal(advice.level, "caution");
  assert.ok(advice.warnings.some((line) => /offshore/i.test(line)));
});

test("lost gear advice changes for harbour vs open coast", () => {
  const harbour = lostGearAdvice(getSpot("point-chev"));
  const coast = lostGearAdvice(getSpot("muriwai"));
  assert.ok(harbour.steps.some((step) => /tide/i.test(step)));
  assert.ok(coast.steps.some((step) => /downwind/i.test(step)));
});
