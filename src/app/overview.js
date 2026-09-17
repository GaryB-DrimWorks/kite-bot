import { getDiscipline, getProfile, MODES, PROFILES, DISCIPLINES, SKILL_LEVELS } from "../config/profiles.js";
import { builtInAndCustomSpots, getSpot } from "../config/spots.js";
import { listRecords } from "../database/client.js";
import { hourlyWindows, rankSpots } from "../recommendations/kitesurf.js";
import { buildDailyForecast } from "../reports/generator.js";
import { lostGearAdvice } from "../safety/advice.js";
import { getTide } from "../tides/provider.js";
import { getRegionalWeather } from "../weather/openMeteo.js";
import { directionToCardinal } from "../utils/wind.js";

function pickConditionsAt(row, at) {
  if (!at) return row.conditions;
  const hourly = row.conditions.hourly || [];
  const target = new Date(at).getTime();
  const hour = hourly.reduce((best, candidate) => {
    if (!best) return candidate;
    const bestDelta = Math.abs(new Date(best.time).getTime() - target);
    const nextDelta = Math.abs(new Date(candidate.time).getTime() - target);
    return nextDelta < bestDelta ? candidate : best;
  }, null);
  if (!hour) return row.conditions;
  return {
    ...row.conditions,
    at: hour.time,
    windSpeedKn: hour.windSpeed,
    windGustsKn: hour.windGusts,
    windDirection: hour.windDirection,
    gustFactor: hour.windGusts && hour.windSpeed ? hour.windGusts / hour.windSpeed : row.conditions.gustFactor,
    effectiveWindKn: hour.windSpeed,
    effectiveWindDir: hour.windDirection,
    temperatureC: hour.temperature,
    humidityPct: hour.humidity,
    pressureHpa: hour.pressure
  };
}

export async function buildOverview(query) {
  const profileId = query.profile || "beginner-self";
  const disciplineId = query.discipline || "kite";
  const availableHours = query.hours ? Number(query.hours) : undefined;
  const windMin = query.windMin ? Number(query.windMin) : undefined;
  const windMax = query.windMax ? Number(query.windMax) : undefined;
  const at = query.time || null;
  const groupId = query.group || "";
  const focusSpotId = query.spot || "";

  const customSpots = await listRecords("custom-spots");
  const spots = builtInAndCustomSpots(customSpots);
  const regional = await getRegionalWeather(spots);

  const spotRows = await Promise.all(
    regional.spots.map(async (row) => {
      const conditions = pickConditionsAt(row, at);
      const tide = await getTide(row.spot.lat, row.spot.lon, at ? new Date(at) : new Date());
      return { ...row, conditions, tide };
    })
  );

  const ranked = rankSpots({
    spotConditions: spotRows,
    profileId,
    disciplineId,
    availableHours,
    windMin,
    windMax
  });

  const daily = buildDailyForecast({
    locationName: regional.location.name,
    regional,
    ranked,
    reliability: regional.reliability
  });

  const focus =
    ranked.find((row) => row.spotId === focusSpotId) || ranked[0] || null;
  const focusRow = spotRows.find((row) => row.spot.id === focus?.spotId);
  const windows = focusRow
    ? hourlyWindows(focusRow.spot, focusRow.conditions, profileId, disciplineId)
    : [];

  const reports = (await listRecords("condition-reports")).filter((row) => {
    if (row.groupOnly) return groupId && row.groupId === groupId;
    return true;
  });
  const knowledge = (await listRecords("knowledge")).filter((row) => {
    if (row.groupOnly) return groupId && row.groupId === groupId;
    return true;
  });
  const lostGear = (await listRecords("lost-gear")).filter((row) => {
    if (row.groupOnly) return groupId && row.groupId === groupId;
    return true;
  });
  const sponsors = await listRecords("sponsors");

  return {
    generatedAt: regional.generatedAt,
    location: regional.location,
    profile: getProfile(profileId),
    discipline: getDiscipline(disciplineId),
    reliability: regional.reliability,
    daily,
    ranked,
    focus,
    windows: windows.filter((hour) => hour.good).slice(0, 12),
    tide: focusRow?.tide || null,
    safety: focus?.safety || null,
    lostGearAdvice: lostGearAdvice(focusRow?.spot || getSpot(focusSpotId)),
    reports: reports.slice(0, 20),
    knowledge: knowledge.slice(0, 40),
    lostGear: lostGear.slice(0, 20),
    sponsors: sponsors.slice(0, 20),
    perspectives: {
      profiles: PROFILES,
      disciplines: DISCIPLINES,
      skills: SKILL_LEVELS,
      modes: MODES
    },
    spots: spots.map((spot) => ({
      id: spot.id,
      name: spot.name,
      coast: spot.coast,
      travelFromCbdMin: spot.travelFromCbdMin,
      popularity: spot.popularity,
      skillMin: spot.skillMin,
      parkingCost: spot.parkingCost,
      preferredCenter: spot.preferredCenter,
      preferredWidth: spot.preferredWidth,
      preferredCardinal: directionToCardinal(spot.preferredCenter),
      custom: Boolean(spot.custom)
    }))
  };
}

export async function buildLegacyReport() {
  const overview = await buildOverview({});
  const top = overview.ranked[0];
  return {
    location: overview.location.name,
    generatedAt: overview.generatedAt,
    reliability: overview.reliability,
    daily: overview.daily.text,
    topSpot: top,
    weather: {
      current: {
        time: top?.conditions ? overview.generatedAt : overview.generatedAt,
        wind_speed_10m: top?.conditions.windSpeedKn,
        wind_direction_10m: top?.conditions.windDirection,
        temperature_2m: top?.conditions.temperatureC
      }
    }
  };
}
