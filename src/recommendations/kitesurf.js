import { getDiscipline, getProfile } from "../config/profiles.js";
import { clamp, isDirectionInWindow, isOffshore } from "../utils/wind.js";
import { tideFitsSpot } from "../tides/provider.js";
import { safetyAdvice } from "../safety/advice.js";

function windRange(profile, discipline) {
  return {
    min: profile.minWindKnots ?? discipline.minWindKnots,
    max: profile.maxWindKnots ?? discipline.maxWindKnots
  };
}

function windScore(knots, min, max) {
  if (knots >= min && knots <= max) {
    const mid = (min + max) / 2;
    const span = Math.max(1, max - min);
    return 40 - Math.abs(knots - mid) * (10 / span);
  }
  const delta = knots < min ? min - knots : knots - max;
  return Math.max(0, 18 - delta * 3);
}

function travelPenalty(spot, profile, availableHours) {
  if (profile.travelMaxMin && spot.travelFromCbdMin > profile.travelMaxMin) {
    return 18;
  }
  if (availableHours) {
    const travelHours = (spot.travelFromCbdMin * 2) / 60;
    if (travelHours + 0.75 > availableHours) return 25;
  }
  return 0;
}

export function scoreSpot({
  spot,
  conditions,
  profileId,
  disciplineId,
  availableHours,
  windMin,
  windMax,
  tide
}) {
  const profile = getProfile(profileId);
  const discipline = getDiscipline(disciplineId);
  const range = windRange(profile, discipline);
  const min = windMin ?? range.min;
  const max = windMax ?? range.max;
  const wind = conditions.effectiveWindKn ?? conditions.windSpeedKn;
  const tideFit = tideFitsSpot(tide, spot);
  const reasons = [];
  let score = 12;

  if (isOffshore(conditions.windDirection, spot.shoreFacing)) {
    return {
      spotId: spot.id,
      score: 0,
      rating: "no-go",
      reasons: ["Offshore wind"],
      tideFit,
      safety: safetyAdvice({ spot, conditions, profile, tideFit })
    };
  }

  if (isDirectionInWindow(conditions.windDirection, spot.preferredCenter, spot.preferredWidth)) {
    score += 32;
    reasons.push("Wind in the preferred window");
  } else if (
    isDirectionInWindow(conditions.windDirection, spot.preferredCenter, spot.preferredWidth + 40)
  ) {
    score += 14;
    reasons.push("Wind is workable but not ideal");
  } else {
    score += 2;
    reasons.push("Wind is off the usual window");
  }

  const rangePoints = windScore(wind, min, max);
  score += rangePoints;
  reasons.push(`${Math.round(wind)} kn effective vs ${min}–${max} kn target`);

  if (profile.preferFlat && (conditions.waveHeightM || 0) <= 0.8) {
    score += 8;
    reasons.push("Flat enough for the chosen focus");
  }
  if (profile.preferCoast && spot.coast === profile.preferCoast) {
    score += 10;
  }
  if (profile.preferPopular) score += Math.round(spot.popularity / 20);
  if (profile.preferFree && spot.parkingCost === "free") score += 6;
  if (profile.preferFree && spot.parkingCost === "paid") score -= 4;
  if (profile.avoidRemote && spot.remote) score -= 12;
  if (profile.maxGustFactor && conditions.gustFactor > profile.maxGustFactor) {
    score -= 14;
    reasons.push("Gustier than this profile likes");
  }

  score -= travelPenalty(spot, profile, availableHours);

  if (spot.tideCritical && !tideFit.ok) {
    score -= 16;
    reasons.push(tideFit.detail);
  } else if (tideFit.ok && spot.tideCritical && tide.official) {
    score += 8;
  }

  score = clamp(Math.round(score), 0, 100);
  const rating = score >= 70 ? "go" : score >= 45 ? "maybe" : "stay-home";

  return {
    spotId: spot.id,
    name: spot.name,
    score,
    rating,
    reasons,
    travelFromCbdMin: spot.travelFromCbdMin,
    popularity: spot.popularity,
    coast: spot.coast,
    tideFit,
    safety: safetyAdvice({ spot, conditions, profile, tideFit }),
    conditions: {
      windSpeedKn: conditions.windSpeedKn,
      effectiveWindKn: conditions.effectiveWindKn,
      windDirection: conditions.windDirection,
      gustFactor: conditions.gustFactor,
      directionVariabilityDeg: conditions.directionVariabilityDeg,
      temperatureC: conditions.temperatureC,
      humidityPct: conditions.humidityPct,
      pressureHpa: conditions.pressureHpa,
      waveHeightM: conditions.waveHeightM,
      windWaveHeightM: conditions.windWaveHeightM,
      swellHeightM: conditions.swellHeightM,
      currentSpeedKn: conditions.currentSpeedKn
    }
  };
}

export function rankSpots(args) {
  return args.spotConditions
    .map((row) =>
      scoreSpot({
        spot: row.spot,
        conditions: row.conditions,
        profileId: args.profileId,
        disciplineId: args.disciplineId,
        availableHours: args.availableHours,
        windMin: args.windMin,
        windMax: args.windMax,
        tide: row.tide
      })
    )
    .sort((a, b) => b.score - a.score);
}

export function hourlyWindows(spot, conditions, profileId, disciplineId) {
  const profile = getProfile(profileId);
  const discipline = getDiscipline(disciplineId);
  const range = windRange(profile, discipline);
  return (conditions.hourly || [])
    .filter((hour) => hour.windSpeed !== null)
    .map((hour) => {
      const okDir = isDirectionInWindow(
        hour.windDirection,
        spot.preferredCenter,
        spot.preferredWidth
      );
      const okWind = hour.windSpeed >= range.min && hour.windSpeed <= range.max;
      return {
        time: hour.time,
        windSpeedKn: hour.windSpeed,
        windDirection: hour.windDirection,
        precipChance: hour.precipChance,
        good: okDir && okWind
      };
    });
}
