import { featuredCameras, matchesSpotQuery, matchesWindDir, CAMERA_LINKS } from "../config/cameras.js";
import { DEFAULT_LOCATION, getSpot } from "../config/spots.js";
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

const FILL_SCORE = { green: 5, blue: 3, orange: 2, white: 0, red: -2 };

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

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function onScore(circles, verdict) {
  if (!circles?.length) return -10;
  const fillPts = circles.reduce((sum, circle) => sum + (FILL_SCORE[circle.fill] ?? 0), 0);
  const verdictBonus =
    verdict?.cls === "go" ? 8 : verdict?.cls === "maybe" ? 2 : verdict?.verdict === "WRONG DIR" ? -12 : -4;
  return fillPts + verdictBonus;
}

function spotMeta(camera) {
  const spot = getSpot(camera.spotId) || null;
  const origin = DEFAULT_LOCATION;
  const travelKm =
    camera.lat != null && camera.lon != null
      ? Math.round(haversineKm(origin.lat, origin.lon, camera.lat, camera.lon) * 10) / 10
      : null;
  return {
    travelFromCbdMin: spot?.travelFromCbdMin ?? null,
    travelKm,
    popularity: spot?.popularity ?? 0,
    localTips: spot?.localTips || "",
    hazards: spot?.hazards || [],
    launchLand: spot?.launchLand || "",
    parking: spot?.parking || "",
    bestTide: spot?.bestTide || "",
    tip: typeof camera.notes === "string" ? camera.notes : ""
  };
}

function notesSummary(notes) {
  if (!notes?.length) return "";
  return notes
    .slice(0, 2)
    .map((note) => note.title)
    .join(" · ");
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
    if (filter !== "all" && windDir && !matchesWindDir(camera, windDir)) continue;

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

    const spotNotes = notes.filter(
      (note) =>
        note.kind === "spot" && (note.spotId === camera.spotId || note.spotId === camera.id)
    );
    const meta = spotMeta(camera);
    const { notes: _cameraTip, ...cameraRest } = camera;

    cards.push({
      ...cameraRest,
      tip: meta.tip,
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
      onScore: onScore(circles, verdict),
      travelFromCbdMin: meta.travelFromCbdMin,
      travelKm: meta.travelKm,
      popularity: meta.popularity,
      localTips: meta.localTips,
      hazards: meta.hazards,
      launchLand: meta.launchLand,
      parking: meta.parking,
      bestTide: meta.bestTide,
      notes: spotNotes.slice(0, 8),
      notesSummary: notesSummary(spotNotes) || meta.tip || meta.localTips || "No notes yet"
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
