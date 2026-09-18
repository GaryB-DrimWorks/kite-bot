import assert from "node:assert/strict";
import test from "node:test";
import { buildLiveForecast } from "../src/app/liveForecast.js";
import { getSpot } from "../src/config/spots.js";

test("Point Chev outgoing tide hazard points east", () => {
  const spot = getSpot("point-chev");
  assert.ok(spot);
  assert.ok(spot.hazards.some((h) => /east/i.test(h)));
  assert.ok(!spot.hazards.some((h) => /west/i.test(h)));
});

test("live forecast auto filter keeps only matching windDirs and exposes sort fields", async () => {
  const payload = await buildLiveForecast({ filter: "all", skill: "all", dir: "NE" });
  assert.ok(Array.isArray(payload.cameras));
  assert.ok(payload.cameras.length > 0);
  const sample = payload.cameras[0];
  assert.equal(typeof sample.tip, "string");
  assert.ok(Array.isArray(sample.notes));
  assert.equal(typeof sample.onScore, "number");
  assert.ok("travelKm" in sample);
  assert.ok("popularity" in sample);
  assert.ok("notesSummary" in sample);

  const auto = await buildLiveForecast({ filter: "auto", skill: "all", dir: "SW" });
  assert.equal(auto.filter, "auto");
  assert.equal(auto.dir, "SW");
  for (const camera of auto.cameras) {
    assert.ok(
      !camera.windDirs?.length || camera.windDirs.includes("SW"),
      `${camera.id} should match SW or have empty windDirs`
    );
  }
});
