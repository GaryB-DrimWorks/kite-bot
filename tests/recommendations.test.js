import assert from "node:assert/strict";
import test from "node:test";
import { getSpot } from "../src/config/spots.js";
import { scoreSpot } from "../src/recommendations/kitesurf.js";

const takapuna = getSpot("takapuna");
const muriwai = getSpot("muriwai");
const tide = {
  official: false,
  stage: "incoming",
  heightM: 1.8,
  warning: "estimate"
};

function conditions(overrides) {
  return {
    windSpeedKn: 16,
    windGustsKn: 20,
    windDirection: 60,
    gustFactor: 1.25,
    directionVariabilityDeg: 8,
    effectiveWindKn: 16,
    effectiveWindDir: 60,
    temperatureC: 16,
    humidityPct: 70,
    pressureHpa: 1014,
    waveHeightM: 0.6,
    windWaveHeightM: 0.4,
    swellHeightM: 0.3,
    currentSpeedKn: 0.2,
    ...overrides
  };
}

test("NE wind scores Takapuna and rejects Muriwai as offshore", () => {
  const east = scoreSpot({
    spot: takapuna,
    conditions: conditions(),
    profileId: "beginner-self",
    disciplineId: "kite",
    tide
  });
  const west = scoreSpot({
    spot: muriwai,
    conditions: conditions(),
    profileId: "beginner-self",
    disciplineId: "kite",
    tide
  });
  assert.ok(east.score >= 55);
  assert.equal(east.rating, "go");
  assert.equal(west.score, 0);
  assert.equal(west.rating, "no-go");
});

test("limited time penalises a long drive", () => {
  const omaha = getSpot("omaha");
  const local = scoreSpot({
    spot: takapuna,
    conditions: conditions(),
    profileId: "limited-time",
    disciplineId: "kite",
    availableHours: 2,
    tide
  });
  const far = scoreSpot({
    spot: omaha,
    conditions: conditions(),
    profileId: "limited-time",
    disciplineId: "kite",
    availableHours: 2,
    tide
  });
  assert.ok(local.score > far.score);
});

test("gusty wind is harder on a solo beginner profile", () => {
  const calm = scoreSpot({
    spot: takapuna,
    conditions: conditions({ gustFactor: 1.1, windGustsKn: 18 }),
    profileId: "solo",
    disciplineId: "kite",
    tide
  });
  const gusty = scoreSpot({
    spot: takapuna,
    conditions: conditions({ gustFactor: 1.8, windGustsKn: 29 }),
    profileId: "solo",
    disciplineId: "kite",
    tide
  });
  assert.ok(calm.score > gusty.score);
});
