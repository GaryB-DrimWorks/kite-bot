import assert from "node:assert/strict";
import test from "node:test";
import { harmonicHeight, matchesBestTide, tideFitsSpot } from "../src/tides/provider.js";

const harbourSpot = {
  name: "Point Chevalier / Meola",
  tideCritical: true,
  bestTide: "incoming-high"
};

test("harmonic tide produces a plausible Auckland range", () => {
  const heights = Array.from({ length: 24 }, (_, hour) => {
    return harmonicHeight(new Date(Date.UTC(2026, 8, 17, hour)));
  });
  assert.ok(Math.min(...heights) < 1.2);
  assert.ok(Math.max(...heights) > 2);
});

test("tide-critical spots stay amber without official data", () => {
  const fit = tideFitsSpot(
    { official: false, stage: "incoming", heightM: 2.1 },
    harbourSpot
  );
  assert.equal(fit.ok, false);
  assert.equal(fit.confidence, "unknown");
});

test("official incoming tide fits Meola", () => {
  assert.equal(matchesBestTide("incoming", "incoming-high"), true);
  assert.equal(matchesBestTide("outgoing", "incoming-high"), false);
  const fit = tideFitsSpot(
    { official: true, stage: "incoming", heightM: 2.2 },
    harbourSpot
  );
  assert.equal(fit.ok, true);
});
