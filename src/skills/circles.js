export const SKILL_ORDER = ["beginner", "intermediate", "advanced"];

export const SKILL_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced"
};

export const SKILL_THRESHOLDS = {
  beginner: { whiteBelow: 9, idealMin: 12, idealMax: 16, orangeMax: 20 },
  intermediate: { whiteBelow: 7, idealMin: 11, idealMax: 24, orangeMax: 32 },
  advanced: { whiteBelow: 5, idealMin: 8, idealMax: 45, orangeMax: 50 }
};

export const SKILL_FILLS = {
  white: { id: "white", emoji: "⚪", hex: "#f4f6fa", label: "not enough" },
  blue: { id: "blue", emoji: "🔵", hex: "#2b7fff", label: "under-powered" },
  green: { id: "green", emoji: "🟢", hex: "#34a853", label: "good–ideal" },
  orange: { id: "orange", emoji: "🟠", hex: "#f0a202", label: "challenging" },
  red: { id: "red", emoji: "🔴", hex: "#e53935", label: "extreme" }
};

export const SKILL_KEY = {
  layout: "Beginner · Intermediate · Advanced",
  key: "⚪ not enough · 🔵 under-powered · 🟢 good–ideal · 🟠 challenging · 🔴 extreme"
};

export function normalizeSkill(value) {
  const skill = String(value || "").toLowerCase().trim();
  if (skill === "expert" || skill === "experienced") return "advanced";
  if (skill === "all" || skill === "") return "all";
  if (SKILL_ORDER.includes(skill)) return skill;
  return "all";
}

export function fillForSkill(skill, knots, { dirOk = true, gustFactor = 1 } = {}) {
  const level = normalizeSkill(skill);
  if (level === "all") {
    throw new Error("fillForSkill requires beginner, intermediate, or advanced");
  }
  const band = SKILL_THRESHOLDS[level];
  const kn = Number(knots) || 0;
  const gusty = gustFactor >= 1.55;

  if (!dirOk) {
    if (kn < band.whiteBelow) return "white";
    if (kn < band.idealMin) return "orange";
    if (kn > band.orangeMax) return "red";
    return "orange";
  }

  if (kn < band.whiteBelow) return "white";
  if (kn < band.idealMin) return "blue";
  if (kn <= band.idealMax) return gusty ? "orange" : "green";
  if (kn <= band.orangeMax) return "orange";
  return "red";
}

export function fillMeta(fill) {
  switch (fill) {
    case "white":
    case "blue":
    case "green":
    case "orange":
    case "red":
      return SKILL_FILLS[fill];
    default: {
      const _exhaustive = fill;
      throw new Error(`Unknown skill fill: ${_exhaustive}`);
    }
  }
}

export function circlesForWind(knots, { dirOk = true, gustFactor = 1 } = {}) {
  return SKILL_ORDER.map((skill) => {
    const fill = fillForSkill(skill, knots, { dirOk, gustFactor });
    const meta = fillMeta(fill);
    return {
      skill,
      label: SKILL_LABELS[skill],
      fill,
      emoji: meta.emoji,
      hex: meta.hex,
      meaning: meta.label
    };
  });
}

export function rideableForSkill(circle) {
  return circle.fill === "blue" || circle.fill === "green" || circle.fill === "orange";
}

export function verdictFromCircles(circles, { dirOk = true, knots = 0 } = {}) {
  const fills = circles.map((circle) => circle.fill);
  if (!dirOk && knots >= 8) {
    return { verdict: "WRONG DIR", cls: "nogo" };
  }
  if (fills.every((fill) => fill === "white")) {
    return { verdict: "NO-GO", cls: "nogo" };
  }
  if (fills.includes("red") && !fills.includes("green") && !fills.includes("blue")) {
    return { verdict: "NO-GO", cls: "nogo" };
  }
  if (fills.includes("green")) {
    const kn = Number(knots) || 0;
    if (kn >= 12 && kn <= 20) return { verdict: "GO", cls: "go" };
    return { verdict: "OK", cls: "maybe" };
  }
  if (fills.includes("blue") || fills.includes("orange")) {
    return { verdict: "MARGINAL", cls: "maybe" };
  }
  return { verdict: "NO-GO", cls: "nogo" };
}

export function passesSkillFilter(circles, skill) {
  const wanted = normalizeSkill(skill);
  if (wanted === "all") return true;
  const row = circles.find((circle) => circle.skill === wanted);
  return Boolean(row && rideableForSkill(row));
}

export function skillCaption() {
  return SKILL_KEY.layout;
}
