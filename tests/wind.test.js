import assert from "node:assert/strict";
import test from "node:test";
import {
  agreementScore,
  angularDifference,
  circularStdDev,
  directionToCardinal,
  effectiveWind,
  gustFactor,
  isDirectionInWindow,
  isOffshore
} from "../src/utils/wind.js";

test("cardinal directions wrap around north", () => {
  assert.equal(directionToCardinal(0), "N");
  assert.equal(directionToCardinal(350), "N");
  assert.equal(directionToCardinal(90), "E");
  assert.equal(directionToCardinal(225), "SW");
});

test("effective wind adds tidal current as apparent wind over water", () => {
  const still = effectiveWind(20, 90, 0, 0);
  assert.equal(Math.round(still.speed), 20);
  const withCurrent = effectiveWind(20, 90, 2, 90);
  assert.ok(withCurrent.speed < still.speed);
});

test("gust factor and direction variability", () => {
  assert.equal(gustFactor(30, 20), 1.5);
  assert.equal(gustFactor(10, 0), null);
  assert.ok(circularStdDev([10, 12, 8, 11]) < 10);
  assert.ok(circularStdDev([0, 90, 180, 270]) > 50);
});

test("offshore detection and wind windows", () => {
  assert.equal(isOffshore(250, 70), true);
  assert.equal(isOffshore(70, 70), false);
  assert.equal(isDirectionInWindow(50, 70, 90), true);
  assert.equal(angularDifference(10, 350), 20);
});

test("model agreement is high when ECMWF and GFS match", () => {
  const a = [12, 14, 16, 18];
  const b = [12.5, 14.2, 15.5, 18.1];
  assert.ok(agreementScore(a, b) >= 80);
  assert.ok(agreementScore(a, [30, 2, 40, 1]) < 50);
});
