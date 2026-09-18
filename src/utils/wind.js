export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function kmhToKnots(kmh) {
  return kmh * 0.539957;
}

export function msToKnots(ms) {
  return ms * 1.94384;
}

export function sector8(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round((((Number(deg) % 360) + 360) % 360) / 45) % 8;
  return dirs[index];
}

export function toEightPoint(cardinal) {
  const value = String(cardinal || "").toUpperCase();
  if (["N", "NE", "E", "SE", "S", "SW", "W", "NW"].includes(value)) return value;
  const map = {
    NNE: "NE",
    ENE: "E",
    ESE: "E",
    SSE: "SE",
    SSW: "SW",
    WSW: "W",
    WNW: "W",
    NNW: "N"
  };
  return map[value] || value;
}

export function directionToCardinal(deg) {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW"
  ];
  const index = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return dirs[index];
}

export function angularDifference(a, b) {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

export function isDirectionInWindow(dir, center, width) {
  return angularDifference(dir, center) <= width / 2;
}

export function windToVector(speed, directionFrom) {
  const rad = (directionFrom * Math.PI) / 180;
  return {
    u: -speed * Math.sin(rad),
    v: -speed * Math.cos(rad)
  };
}

export function vectorToWind(u, v) {
  const speed = Math.hypot(u, v);
  const directionFrom = (Math.atan2(-u, -v) * 180) / Math.PI;
  return {
    speed,
    direction: (directionFrom + 360) % 360
  };
}

export function effectiveWind(windSpeed, windDir, currentSpeed = 0, currentDir = 0) {
  const wind = windToVector(windSpeed, windDir);
  const current = windToVector(currentSpeed, currentDir);
  return vectorToWind(wind.u - current.u, wind.v - current.v);
}

export function gustFactor(gusts, speed) {
  if (!speed || speed <= 0) return null;
  return gusts / speed;
}

export function circularStdDev(degrees) {
  if (!degrees.length) return 0;

  let sin = 0;
  let cos = 0;
  for (const degree of degrees) {
    const rad = (degree * Math.PI) / 180;
    sin += Math.sin(rad);
    cos += Math.cos(rad);
  }

  const radius = Math.hypot(sin / degrees.length, cos / degrees.length);
  if (radius >= 0.999) return 0;
  if (radius === 0) return 180;
  return Math.sqrt(-2 * Math.log(radius)) * (180 / Math.PI);
}

export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function rmse(actual, predicted) {
  if (!actual.length || actual.length !== predicted.length) return null;
  const squared = actual.map((value, index) => (value - predicted[index]) ** 2);
  return Math.sqrt(mean(squared));
}

export function agreementScore(seriesA, seriesB) {
  const error = rmse(seriesA, seriesB);
  if (error === null) return null;
  return clamp(Math.round(100 - error * 8), 0, 100);
}

export function isOffshore(windFrom, shoreFacing) {
  return angularDifference(windFrom, (shoreFacing + 180) % 360) <= 50;
}
