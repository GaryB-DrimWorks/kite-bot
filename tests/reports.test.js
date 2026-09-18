import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyForecast, formatWindReport } from "../src/reports/generator.js";

const hourly = Array.from({ length: 72 }, (_, index) => {
  const date = new Date("2026-09-18T00:00:00+12:00");
  date.setHours(date.getHours() + index);
  return {
    time: date.toISOString(),
    windSpeed: 14 + (index % 5),
    windGusts: index === 40 ? 38 : 18,
    windDirection: index > 36 ? 230 : 40,
    precipChance: 20
  };
});

test("KAN-style forecast mentions now, weekend and a gale watch", () => {
  const daily = buildDailyForecast({
    locationName: "Auckland",
    regional: {
      generatedAt: "2026-09-17T21:00:00.000Z",
      spots: [
        {
          conditions: {
            windSpeedKn: 12,
            effectiveWindKn: 11.4,
            windGustsKn: 16,
            windDirection: 30,
            temperatureC: 14,
            pressureHpa: 1016,
            hourly
          }
        }
      ]
    },
    ranked: [{ name: "Takapuna Beach", score: 78 }],
    reliability: { score: 81, detail: "Models agree." }
  });

  assert.match(daily.text, /Auckland kite forecast/);
  assert.match(daily.text, /Takapuna Beach/);
  assert.match(daily.text, /Gale watch/);
  assert.match(daily.text, /Model agreement: 81\/100/);
  assert.ok(daily.events.length >= 1);
});

test("WhatsApp wind report includes effective wind", () => {
  const text = formatWindReport(
    "Auckland",
    {
      windSpeedKn: 18,
      windDirection: 45,
      effectiveWindKn: 17.2,
      windGustsKn: 24,
      temperatureC: 15,
      humidityPct: 72,
      pressureHpa: 1012,
      at: "2026-09-17T22:00"
    },
    { name: "Orewa Beach", score: 71, rating: "go" }
  );
  assert.match(text, /Effective: 17.2 kn/);
  assert.match(text, /Orewa Beach/);
});
