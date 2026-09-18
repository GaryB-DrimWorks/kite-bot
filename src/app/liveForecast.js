import { featuredCameras, matchesSpotQuery, matchesWindDir, CAMERA_LINKS } from "../config/cameras.js";
import { listNotes } from "../notes/store.js";
import {
  SKILL_KEY,
  circlesForWind,
  normalizeSkill,
  passesSkillFilter,
  verdictFromCircles
} from "../skills/circles.js";
import { sector8 } from "../utils/wind.js";
import { getRegionalWeather } from "../weather/openMeteo.js";

function wxSpotsFromCameras(cameras) {
  const seen = new Set();
  const spots = [];
  for (const camera of cameras) {
    if (camera.lat == null || camera.lon == null) continue;
    const key = `${camera.lat.toFixed(3)},${camera.lon.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    spots.push({
      id: `wx-${key}`,
      name: camera.name,
      lat: camera.lat,
      lon: camera.lon
    });
  }
  return spots;
}

function wxKey(camera) {
  if (camera.lat == null || camera.lon == null) return "";
  return `wx-${camera.lat.toFixed(3)},${camera.lon.toFixed(3)}`;
}

function nextHoursSummary(hourly) {
  if (!hourly?.length) return null;
  const now = Date.now();
  const upcoming = hourly.filter((hour) => new Date(hour.time).getTime() >= now).slice(0, 6);
  const window = upcoming.length ? upcoming : hourly.slice(0, 6);
  const speeds = window.map((hour) => hour.windSpeed).filter((value) => value != null);
  const dirs = [...new Set(window.map((hour) => sector8(hour.windDirection)).filter(Boolean))];
  if (!speeds.length) return null;
  return {
    knMin: Math.round(Math.min(...speeds)),
    knMax: Math.round(Math.max(...speeds)),
    dirs: dirs.join("–") || "—",
    label: "Next ~6h"
  };
}

export async function buildLiveForecast(query = {}) {
  const cameras = featuredCameras();
  const skill = normalizeSkill(query.skill);
  const dir = String(query.dir || "").toUpperCase();
  const spot = String(query.spot || "");
  const filter = query.filter || (dir ? "auto" : "all");
  const notes = await listNotes({ skill, newToSpot: query.newToSpot });
  const generalNotes = notes.filter((note) => note.kind === "general");

  let regional = null;
  try {
    regional = await getRegionalWeather(wxSpotsFromCameras(cameras));
  } catch {
    regional = null;
  }

  const byWx = new Map();
  if (regional) {
    for (const row of regional.spots) {
      byWx.set(row.spot.id, row.conditions);
    }
  }

  const autoDir =
    dir ||
    (regional?.spots?.[0]?.conditions
      ? sector8(regional.spots[0].conditions.windDirection)
      : "");

  const cards = [];
  for (const camera of cameras) {
    if (spot && !matchesSpotQuery(camera, spot)) continue;
    const windDir = filter === "all" ? "" : autoDir;
    if (windDir && !matchesWindDir(camera, windDir) && filter !== "all") continue;

    const conditions = byWx.get(wxKey(camera)) || null;
    const kn = conditions?.effectiveWindKn ?? conditions?.windSpeedKn ?? null;
    const liveDir = conditions ? sector8(conditions.windDirection) : windDir;
    const dirOk = !camera.windDirs?.length || !liveDir || camera.windDirs.includes(liveDir);
    const circles =
      kn == null
        ? null
        : circlesForWind(kn, { dirOk, gustFactor: conditions?.gustFactor || 1 });
    const verdict = circles
      ? verdictFromCircles(circles, { dirOk, knots: kn })
      : { verdict: "FORECAST UNAVAILABLE", cls: "maybe" };

    if (circles && !passesSkillFilter(circles, skill)) continue;

    const cameraNotes = notes.filter(
      (note) =>
        note.kind === "spot" && (note.spotId === camera.spotId || note.spotId === camera.id)
    );

    cards.push({
      ...camera,
      conditions: conditions
        ? {
            windSpeedKn: conditions.windSpeedKn,
            windGustsKn: conditions.windGustsKn,
            effectiveWindKn: conditions.effectiveWindKn,
            windDirection: conditions.windDirection,
            windDir: liveDir,
            gustFactor: conditions.gustFactor,
            temperatureC: conditions.temperatureC
          }
        : null,
      forecast: conditions ? nextHoursSummary(conditions.hourly) : null,
      circles,
      verdict,
      notes: cameraNotes.slice(0, 4)
    });
  }

  return {
    generatedAt: regional?.generatedAt || new Date().toISOString(),
    reliability: regional?.reliability || null,
    skill,
    dir: autoDir,
    filter,
    spot,
    key: SKILL_KEY,
    links: CAMERA_LINKS,
    generalNotes: generalNotes.slice(0, 8),
    cameras: cards
  };
}
