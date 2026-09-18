import { directionToCardinal } from "../utils/wind.js";

function dayName(iso, timeZone = "Pacific/Auckland") {
  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone
  }).format(new Date(iso));
}

function hourLabel(iso) {
  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "short",
    hour: "numeric",
    timeZone: "Pacific/Auckland"
  }).format(new Date(iso));
}

function band(hours) {
  if (!hours.length) return "little wind in the model";
  const speeds = hours.map((hour) => hour.windSpeed).filter((value) => value !== null);
  const dirs = hours.map((hour) => hour.windDirection).filter((value) => value !== null);
  const min = Math.round(Math.min(...speeds));
  const max = Math.round(Math.max(...speeds));
  const midDir = dirs[Math.floor(dirs.length / 2)] || 0;
  return `${directionToCardinal(midDir)} ${min}–${max} kn`;
}

function galeHours(hourly) {
  return hourly.filter((hour) => (hour.windGusts || hour.windSpeed || 0) >= 34);
}

export function buildDailyForecast({ locationName, regional, ranked, reliability }) {
  const nowSpot = regional.spots[0];
  const conditions = nowSpot.conditions;
  const hourly = conditions.hourly || [];
  const today = hourly.slice(0, 24);
  const weekend = hourly.filter((hour) => {
    const day = new Date(hour.time).getDay();
    return day === 0 || day === 6;
  });
  const gales = galeHours(hourly.slice(0, 72));
  const best = ranked.filter((row) => row.score >= 55).slice(0, 3);
  const lines = [];

  lines.push(`${locationName} kite forecast — ${dayName(regional.generatedAt)}`);
  lines.push(
    `Now: ${directionToCardinal(conditions.windDirection)} ${Math.round(conditions.windSpeedKn)} kn (effective ${conditions.effectiveWindKn} kn), gusts ${Math.round(conditions.windGustsKn)} kn, ${Math.round(conditions.temperatureC)}°C, ${Math.round(conditions.pressureHpa)} hPa.`
  );
  lines.push(`Today: ${band(today)}.`);
  if (best.length) {
    lines.push(
      `Best-looking spots for the current profile: ${best
        .map((row) => `${row.name} (${row.score})`)
        .join(", ")}.`
    );
  } else {
    lines.push("No strong go-spots on the current profile — this may be a rest or foil-only day.");
  }
  if (weekend.length) {
    lines.push(`Weekend: ${band(weekend)}.`);
  }
  if (gales.length) {
    lines.push(
      `Gale watch: ${directionToCardinal(gales[0].windDirection)} gusts to ${Math.round(gales[0].windGusts || gales[0].windSpeed)} kn from ${hourLabel(gales[0].time)}.`
    );
  } else {
    lines.push("Gale watch: nothing above 34 kn in the next three days.");
  }
  if (reliability?.score !== null && reliability?.score !== undefined) {
    lines.push(`Model agreement: ${reliability.score}/100. ${reliability.detail}`);
  }
  lines.push("Not a substitute for a beach check. West-coast wave spots need a look at the actual dump.");

  return {
    title: `${locationName} daily kite forecast`,
    generatedAt: regional.generatedAt,
    text: lines.join("\n"),
    events: gales.slice(0, 8).map((hour) => ({
      type: "gale",
      time: hour.time,
      windSpeedKn: hour.windSpeed,
      windGustsKn: hour.windGusts,
      windDirection: hour.windDirection
    })),
    weekend: weekend.slice(0, 24)
  };
}

export function formatWindReport(locationName, conditions, topSpot) {
  return [
    `Wind report for ${locationName}`,
    `Speed: ${Math.round(conditions.windSpeedKn)} kn (${directionToCardinal(conditions.windDirection)})`,
    `Effective: ${conditions.effectiveWindKn} kn`,
    `Gusts: ${Math.round(conditions.windGustsKn)} kn`,
    `Temp: ${Math.round(conditions.temperatureC)}°C  Humidity: ${Math.round(conditions.humidityPct)}%  Pressure: ${Math.round(conditions.pressureHpa)} hPa`,
    topSpot ? `Best match: ${topSpot.name} (${topSpot.score}/100, ${topSpot.rating})` : null,
    `Updated: ${conditions.at}`
  ]
    .filter(Boolean)
    .join("\n");
}
