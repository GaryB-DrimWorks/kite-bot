import { DISCIPLINES, MODES, PROFILES, SKILL_LEVELS } from "./profiles.js";
import { DEFAULT_LOCATION, SPOTS } from "./spots.js";

export const config = {
  port: Number(process.env.PORT || 3000),
  authPath: process.env.WHATSAPP_SESSION_PATH || "/app/data/whatsapp",
  notifyJid: process.env.NOTIFY_JID || "",
  dataPath: process.env.DATA_PATH || "data",
  whatsappDisabled:
    process.env.WHATSAPP_DISABLED === "1" ||
    process.env.WHATSAPP_DISABLED === "true",
  niwaTideApiKey: process.env.NIWA_TIDE_API_KEY || "",
  stormglassApiKey: process.env.STORMGLASS_API_KEY || "",
  defaultLocation: DEFAULT_LOCATION,
  cacheMs: Number(process.env.WEATHER_CACHE_MS || 5 * 60 * 1000)
};

export { DISCIPLINES, MODES, PROFILES, SKILL_LEVELS, SPOTS, DEFAULT_LOCATION };
