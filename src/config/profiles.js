export const DISCIPLINES = [
  { id: "kite", label: "Kitesurf", minWindKnots: 12, maxWindKnots: 30, preferFlat: false },
  { id: "wing", label: "Wing", minWindKnots: 10, maxWindKnots: 28, preferFlat: false },
  { id: "foil", label: "Foil", minWindKnots: 8, maxWindKnots: 20, preferFlat: true },
  { id: "windsurf", label: "Windsurf", minWindKnots: 12, maxWindKnots: 35, preferFlat: false },
  { id: "surf", label: "Surf", minWindKnots: 0, maxWindKnots: 18, preferWaves: true },
  { id: "sup", label: "SUP", minWindKnots: 0, maxWindKnots: 12, preferFlat: true },
  { id: "paddle", label: "Paddle", minWindKnots: 0, maxWindKnots: 10, preferFlat: true },
  { id: "swim", label: "Swim", minWindKnots: 0, maxWindKnots: 15, preferFlat: true },
  { id: "snorkel", label: "Snorkel", minWindKnots: 0, maxWindKnots: 12, preferFlat: true },
  { id: "dive", label: "Dive", minWindKnots: 0, maxWindKnots: 18, preferFlat: true },
  { id: "sail", label: "Sail", minWindKnots: 8, maxWindKnots: 30, preferFlat: false },
  { id: "fish", label: "Rec fishing", minWindKnots: 0, maxWindKnots: 20, preferFlat: true },
  { id: "ski", label: "Ski / tow", minWindKnots: 0, maxWindKnots: 16, preferFlat: true },
  { id: "land-yacht", label: "Land yacht", minWindKnots: 10, maxWindKnots: 30, preferFlat: true },
  { id: "cycle", label: "Cycle", minWindKnots: 0, maxWindKnots: 25, preferFlat: true },
  { id: "lifesaving", label: "Life-saving", minWindKnots: 0, maxWindKnots: 40, preferFlat: false }
];

export const PROFILES = [
  {
    id: "beginner-self",
    label: "Self-sufficient beginner",
    skill: "beginner",
    minWindKnots: 12,
    maxWindKnots: 20,
    preferFlat: true,
    preferPopular: true,
    travelMaxMin: 45,
    maxGustFactor: 1.4
  },
  {
    id: "visiting",
    label: "New to the area",
    skill: "intermediate",
    preferPopular: true,
    preferAdvice: true,
    travelMaxMin: 70
  },
  {
    id: "limited-time",
    label: "Limited time",
    skill: "intermediate",
    travelMaxMin: 30,
    sessionHours: 2
  },
  {
    id: "limited-money",
    label: "Limited money",
    skill: "intermediate",
    preferFree: true,
    travelMaxMin: 40
  },
  {
    id: "lightwind",
    label: "Lightwind focus",
    skill: "intermediate",
    minWindKnots: 8,
    maxWindKnots: 16,
    preferFlat: true
  },
  {
    id: "waves",
    label: "Waves / west coast",
    skill: "advanced",
    preferCoast: "west",
    minWindKnots: 15,
    maxWindKnots: 35
  },
  {
    id: "tricks",
    label: "Tricks & jumps",
    skill: "advanced",
    preferFlat: true,
    minWindKnots: 16,
    maxWindKnots: 28
  },
  {
    id: "transitions",
    label: "Working on transitions",
    skill: "intermediate",
    preferFlat: true,
    minWindKnots: 14,
    maxWindKnots: 22
  },
  {
    id: "solo",
    label: "Kiting alone",
    skill: "intermediate",
    solo: true,
    avoidRemote: true,
    maxGustFactor: 1.35
  },
  {
    id: "group",
    label: "With others",
    skill: "intermediate",
    preferPopular: true
  }
];

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"];

export const MODES = [
  { id: "ride", label: "Ride" },
  { id: "safety", label: "Safety" },
  { id: "coach", label: "Coach" },
  { id: "virtual", label: "Virtual" },
  { id: "repairs", label: "Repairs" },
  { id: "rnd", label: "R&D" },
  { id: "manager", label: "Manager" }
];

export function getProfile(id) {
  return PROFILES.find((profile) => profile.id === id) || PROFILES[0];
}

export function getDiscipline(id) {
  return DISCIPLINES.find((discipline) => discipline.id === id) || DISCIPLINES[0];
}
