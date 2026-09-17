import { config } from "../config/index.js";
import { SPOTS } from "../config/spots.js";
import { appendForecastLog } from "../database/client.js";
import { logger } from "../utils/logger.js";
import {
  agreementScore,
  circularStdDev,
  effectiveWind,
  gustFactor,
  msToKnots
} from "../utils/wind.js";

const weatherCache = new Map();

function cacheKey(parts) {
  return JSON.stringify(parts);
}

async function cached(key, loader) {
  const hit = weatherCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await loader();
  weatherCache.set(key, { value, expires: Date.now() + config.cacheMs });
  return value;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status} ${url}`);
  }
  return response.json();
}

function asArray(payload) {
  return Array.isArray(payload) ? payload : [payload];
}

function hourlySlice(hourly, start, count) {
  if (!hourly?.time) return [];
  return hourly.time.slice(start, start + count).map((time, index) => {
    const i = start + index;
    return {
      time,
      windSpeed: hourly.wind_speed_10m?.[i] ?? null,
      windGusts: hourly.wind_gusts_10m?.[i] ?? null,
      windDirection: hourly.wind_direction_10m?.[i] ?? null,
      precipChance: hourly.precipitation_probability?.[i] ?? null,
      temperature: hourly.temperature_2m?.[i] ?? null,
      pressure: hourly.pressure_msl?.[i] ?? null,
      humidity: hourly.relative_humidity_2m?.[i] ?? null,
      weatherCode: hourly.weather_code?.[i] ?? null
    };
  });
}

function marineAt(marine, index) {
  if (!marine?.hourly) {
    return {
      waveHeight: null,
      waveDirection: null,
      wavePeriod: null,
      windWaveHeight: null,
      swellHeight: null,
      currentSpeedKn: 0,
      currentDirection: 0
    };
  }
  const currentMs = marine.hourly.ocean_current_velocity?.[index] ?? 0;
  return {
    waveHeight: marine.hourly.wave_height?.[index] ?? null,
    waveDirection: marine.hourly.wave_direction?.[index] ?? null,
    wavePeriod: marine.hourly.wave_period?.[index] ?? null,
    windWaveHeight: marine.hourly.wind_wave_height?.[index] ?? null,
    swellHeight: marine.hourly.swell_wave_height?.[index] ?? null,
    currentSpeedKn: msToKnots(currentMs || 0),
    currentDirection: marine.hourly.ocean_current_direction?.[index] ?? 0
  };
}

function nearestHourIndex(hourly, isoTime) {
  if (!hourly?.time?.length) return 0;
  const target = new Date(isoTime).getTime();
  let best = 0;
  let bestDelta = Infinity;
  hourly.time.forEach((time, index) => {
    const delta = Math.abs(new Date(time).getTime() - target);
    if (delta < bestDelta) {
      best = index;
      bestDelta = delta;
    }
  });
  return best;
}

export function summarizeConditions(forecast, marine, at = new Date()) {
  const index = nearestHourIndex(forecast.hourly, at.toISOString());
  const current = forecast.current || {};
  const hour = hourlySlice(forecast.hourly, index, 1)[0] || {};
  const sea = marineAt(marine, index);
  const windSpeed = current.wind_speed_10m ?? hour.windSpeed ?? 0;
  const windGusts = current.wind_gusts_10m ?? hour.windGusts ?? windSpeed;
  const windDirection = current.wind_direction_10m ?? hour.windDirection ?? 0;
  const apparent = effectiveWind(
    windSpeed,
    windDirection,
    sea.currentSpeedKn,
    sea.currentDirection
  );
  const recentDirs = (forecast.hourly?.wind_direction_10m || [])
    .slice(Math.max(0, index - 5), index + 1)
    .filter((value) => value !== null && value !== undefined);

  return {
    at: current.time || hour.time || at.toISOString(),
    temperatureC: current.temperature_2m ?? hour.temperature,
    humidityPct: current.relative_humidity_2m ?? hour.humidity,
    pressureHpa: current.pressure_msl ?? hour.pressure,
    weatherCode: current.weather_code ?? hour.weatherCode,
    windSpeedKn: windSpeed,
    windGustsKn: windGusts,
    windDirection,
    gustFactor: gustFactor(windGusts, windSpeed),
    directionVariabilityDeg: Number(circularStdDev(recentDirs).toFixed(1)),
    effectiveWindKn: Number(apparent.speed.toFixed(1)),
    effectiveWindDir: Number(apparent.direction.toFixed(0)),
    currentSpeedKn: Number(sea.currentSpeedKn.toFixed(2)),
    currentDirection: sea.currentDirection,
    waveHeightM: sea.waveHeight,
    waveDirection: sea.waveDirection,
    wavePeriodS: sea.wavePeriod,
    windWaveHeightM: sea.windWaveHeight,
    swellHeightM: sea.swellHeight,
    hourly: hourlySlice(forecast.hourly, 0, forecast.hourly?.time?.length || 0)
  };
}

function forecastUrl(spots, model) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  const params = {
    latitude: spots.map((spot) => spot.lat).join(","),
    longitude: spots.map((spot) => spot.lon).join(","),
    current:
      "temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,cloud_cover",
    hourly:
      "wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation_probability,temperature_2m,pressure_msl,relative_humidity_2m,weather_code,cloud_cover",
    forecast_days: "7",
    timezone: "Pacific/Auckland",
    wind_speed_unit: "kn"
  };
  if (model) params.models = model;
  url.search = new URLSearchParams(params);
  return url;
}

function marineUrl(spots) {
  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.search = new URLSearchParams({
    latitude: spots.map((spot) => spot.lat).join(","),
    longitude: spots.map((spot) => spot.lon).join(","),
    hourly:
      "wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,ocean_current_velocity,ocean_current_direction",
    forecast_days: "7",
    timezone: "Pacific/Auckland"
  });
  return url;
}

export async function getRegionalWeather(spots = SPOTS) {
  const key = cacheKey(["regional", spots.map((spot) => spot.id)]);
  return cached(key, async () => {
    const [forecastPayload, marinePayload, ecmwfPayload, gfsPayload] =
      await Promise.all([
        fetchJson(forecastUrl(spots)),
        fetchJson(marineUrl(spots)).catch((error) => {
          logger.warn({ error }, "Marine weather unavailable");
          return null;
        }),
        fetchJson(forecastUrl([config.defaultLocation], "ecmwf_ifs025")).catch(
          () => null
        ),
        fetchJson(forecastUrl([config.defaultLocation], "gfs_seamless")).catch(
          () => null
        )
      ]);

    const forecasts = asArray(forecastPayload);
    const marines = marinePayload ? asArray(marinePayload) : [];
    const bySpot = spots.map((spot, index) => {
      const forecast = forecasts[index] || forecasts[0];
      const marine = marines[index] || marines[0] || null;
      return {
        spot,
        forecast,
        marine,
        conditions: summarizeConditions(forecast, marine)
      };
    });

    const ecmwf = ecmwfPayload ? asArray(ecmwfPayload)[0] : null;
    const gfs = gfsPayload ? asArray(gfsPayload)[0] : null;
    const reliability = computeReliability(ecmwf, gfs);
    await appendForecastLog({
      at: new Date().toISOString(),
      reliability,
      windSpeedKn: bySpot[0]?.conditions.windSpeedKn ?? null,
      effectiveWindKn: bySpot[0]?.conditions.effectiveWindKn ?? null,
      gustFactor: bySpot[0]?.conditions.gustFactor ?? null
    }).catch((error) => {
      logger.warn({ error }, "Could not append forecast log");
    });

    return {
      generatedAt: new Date().toISOString(),
      location: config.defaultLocation,
      reliability,
      spots: bySpot
    };
  });
}

export function computeReliability(ecmwf, gfs) {
  const a = ecmwf?.hourly?.wind_speed_10m?.slice(0, 24);
  const b = gfs?.hourly?.wind_speed_10m?.slice(0, 24);
  if (!a?.length || !b?.length) {
    return {
      score: null,
      detail: "Not enough model data to score reliability yet."
    };
  }
  const length = Math.min(a.length, b.length);
  const score = agreementScore(a.slice(0, length), b.slice(0, length));
  return {
    score,
    detail:
      score >= 75
        ? "ECMWF and GFS are in good agreement for the next 24 hours."
        : score >= 50
          ? "Models disagree somewhat — treat the forecast as a range, not a point."
          : "Models disagree a lot. Wait for a later run or check a second source."
  };
}

export async function getWeather() {
  const regional = await getRegionalWeather([
    { id: "auckland", ...config.defaultLocation }
  ]);
  return regional.spots[0].forecast;
}

export async function getAucklandOverview(spots = SPOTS) {
  return getRegionalWeather(spots);
}
