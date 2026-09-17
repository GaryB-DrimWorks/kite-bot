import { config } from "../config/index.js";
import { getSettings } from "../database/client.js";

const M2_SECONDS = 12.4206 * 3600;
const S2_SECONDS = 12 * 3600;
const M2_AMP = 0.92;
const S2_AMP = 0.21;
const MEAN_LEVEL = 1.65;

function harmonicHeight(date) {
  const t = date.getTime() / 1000;
  return (
    MEAN_LEVEL +
    M2_AMP * Math.sin((2 * Math.PI * t) / M2_SECONDS) +
    S2_AMP * Math.sin((2 * Math.PI * t) / S2_SECONDS)
  );
}

function stageFromHeights(now, later) {
  const rising = later > now;
  if (now >= 2.4) return rising ? "high" : "high-dropping";
  if (now <= 0.9) return rising ? "low-rising" : "low";
  return rising ? "incoming" : "outgoing";
}

function matchesBestTide(stage, bestTide) {
  if (!bestTide || bestTide === "all") return true;
  if (bestTide === "mid-high") {
    return ["incoming", "high", "high-dropping", "mid"].includes(stage);
  }
  if (bestTide === "low-mid") {
    return ["low", "low-rising", "incoming", "outgoing"].includes(stage);
  }
  if (bestTide === "incoming-high") {
    return ["incoming", "high"].includes(stage);
  }
  if (bestTide === "mid") {
    return ["incoming", "outgoing"].includes(stage);
  }
  return true;
}

async function fetchNiwaTide(lat, lon, apiKey) {
  const url = new URL("https://api.niwa.co.nz/tides/data");
  url.search = new URLSearchParams({
    lat: String(lat),
    long: String(lon),
    numberOfDays: "2",
    datum: "LAT"
  });

  const response = await fetch(url, {
    headers: { "x-apikey": apiKey }
  });

  if (!response.ok) {
    throw new Error(`NIWA tide request failed: ${response.status}`);
  }

  return response.json();
}

export async function getTide(lat, lon, at = new Date()) {
  const settings = await getSettings();
  const apiKey = settings.niwaTideApiKey || config.niwaTideApiKey;

  if (apiKey) {
    try {
      const payload = await fetchNiwaTide(lat, lon, apiKey);
      const values = payload?.values || payload?.values?.values || [];
      const nearest = values[0];
      if (nearest) {
        return {
          source: "niwa",
          official: true,
          heightM: Number(nearest.value ?? nearest.height),
          stage: nearest.stage || "unknown",
          at: nearest.time || at.toISOString()
        };
      }
    } catch {
      // Fall through to the labelled estimate.
    }
  }

  const now = harmonicHeight(at);
  const later = harmonicHeight(new Date(at.getTime() + 30 * 60 * 1000));
  const stage = stageFromHeights(now, later);

  return {
    source: "harmonic-estimate",
    official: false,
    heightM: Number(now.toFixed(2)),
    stage,
    at: at.toISOString(),
    warning:
      "Estimated tide only. Confirm LINZ/NIWA before launching at tide-critical harbour spots."
  };
}

export function tideFitsSpot(tide, spot) {
  if (!spot.tideCritical) {
    return { ok: true, confidence: "high", detail: "Tide is not critical here." };
  }
  if (!tide.official) {
    return {
      ok: false,
      confidence: "unknown",
      detail: "Tide-critical spot — check an official tide chart before you go."
    };
  }
  const ok = matchesBestTide(tide.stage, spot.bestTide);
  return {
    ok,
    confidence: "official",
    detail: ok
      ? `Official tide stage (${tide.stage}) fits ${spot.bestTide}.`
      : `Official tide stage (${tide.stage}) is a poor fit for ${spot.bestTide}.`
  };
}

export { matchesBestTide, harmonicHeight };
