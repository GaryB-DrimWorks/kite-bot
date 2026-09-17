import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import pino from "pino";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { config } from "./config/index.js";
import {
  addRecord,
  getSettings,
  listForecastLog,
  maskSettings,
  saveSettings
} from "./database/client.js";
import { buildLegacyReport, buildOverview } from "./app/overview.js";
import { seedKnowledge } from "./knowledge/seed.js";
import { formatWindReport } from "./reports/generator.js";
import { getWeather } from "./weather/openMeteo.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const app = express();
app.use(express.json({ limit: "120kb" }));
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/report") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});
app.use(express.static(publicDir));

let socket;
let connected = false;

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    whatsappConnected: connected,
    whatsappDisabled: config.whatsappDisabled,
    location: config.defaultLocation.name,
    timestamp: new Date().toISOString()
  });
});

app.get("/report", async (_req, res) => {
  try {
    const weather = await getWeather();
    const overview = await buildLegacyReport();
    res.json({
      location: config.defaultLocation.name,
      generatedAt: new Date().toISOString(),
      weather,
      daily: overview.daily,
      reliability: overview.reliability,
      topSpot: overview.topSpot
    });
  } catch (error) {
    logger.error({ error }, "Legacy report failed");
    res.status(503).json({ error: "Weather data unavailable" });
  }
});

app.get("/api/overview", async (req, res) => {
  try {
    const overview = await buildOverview(req.query);
    res.json(overview);
  } catch (error) {
    logger.error({ error }, "Overview failed");
    res.status(503).json({ error: "Could not build the kite overview" });
  }
});

app.get("/api/perspectives", async (_req, res) => {
  const overview = await buildOverview({});
  res.json(overview.perspectives);
});

app.get("/api/spots", async (_req, res) => {
  const overview = await buildOverview({});
  res.json({ spots: overview.spots });
});

app.get("/api/forecast/daily", async (req, res) => {
  const overview = await buildOverview(req.query);
  res.json(overview.daily);
});

app.get("/api/events", async (req, res) => {
  const overview = await buildOverview(req.query);
  res.json({ events: overview.daily.events, weekend: overview.daily.weekend });
});

app.get("/api/condition-reports", async (req, res) => {
  const overview = await buildOverview(req.query);
  res.json({ reports: overview.reports });
});

app.post("/api/condition-reports", async (req, res) => {
  const body = req.body || {};
  if (!body.summary || typeof body.summary !== "string") {
    res.status(400).json({ error: "summary is required" });
    return;
  }
  const record = await addRecord("condition-reports", {
    spotId: body.spotId || "",
    summary: body.summary.trim().slice(0, 500),
    windKn: Number(body.windKn) || null,
    groupId: body.groupId || "",
    groupOnly: Boolean(body.groupOnly),
    author: (body.author || "anon").toString().slice(0, 40)
  });
  res.status(201).json(record);
});

app.get("/api/lost-gear", async (req, res) => {
  const overview = await buildOverview(req.query);
  res.json({ items: overview.lostGear, advice: overview.lostGearAdvice });
});

app.post("/api/lost-gear", async (req, res) => {
  const body = req.body || {};
  if (!body.item || typeof body.item !== "string") {
    res.status(400).json({ error: "item is required" });
    return;
  }
  const record = await addRecord("lost-gear", {
    item: body.item.trim().slice(0, 120),
    spotId: body.spotId || "",
    notes: (body.notes || "").toString().slice(0, 500),
    groupId: body.groupId || "",
    groupOnly: Boolean(body.groupOnly),
    status: "missing"
  });
  res.status(201).json(record);
});

app.get("/api/knowledge", async (req, res) => {
  const overview = await buildOverview(req.query);
  res.json({ items: overview.knowledge });
});

app.post("/api/knowledge", async (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.body) {
    res.status(400).json({ error: "title and body are required" });
    return;
  }
  const record = await addRecord("knowledge", {
    title: body.title.trim().slice(0, 120),
    body: body.body.trim().slice(0, 4000),
    topic: (body.topic || "spot").toString().slice(0, 40),
    spotId: body.spotId || "",
    groupId: body.groupId || "",
    groupOnly: Boolean(body.groupOnly)
  });
  res.status(201).json(record);
});

app.post("/api/spots", async (req, res) => {
  const body = req.body || {};
  if (!body.name || body.lat === undefined || body.lon === undefined) {
    res.status(400).json({ error: "name, lat and lon are required" });
    return;
  }
  const record = await addRecord("custom-spots", {
    id: (body.id || body.name).toString().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    name: body.name.trim().slice(0, 80),
    lat: Number(body.lat),
    lon: Number(body.lon),
    coast: body.coast || "east",
    shoreFacing: Number(body.shoreFacing ?? 90),
    preferredCenter: Number(body.preferredCenter ?? 90),
    preferredWidth: Number(body.preferredWidth ?? 90),
    bestTide: body.bestTide || "all",
    tideCritical: Boolean(body.tideCritical),
    travelFromCbdMin: Number(body.travelFromCbdMin ?? 40),
    parkingCost: body.parkingCost || "free",
    skillMin: body.skillMin || "intermediate",
    popularity: Number(body.popularity ?? 30),
    remote: Boolean(body.remote),
    hazards: Array.isArray(body.hazards) ? body.hazards.slice(0, 8) : ["Custom spot — verify locally"],
    launchLand: body.launchLand || "Add launch notes.",
    parking: body.parking || "Add parking notes.",
    localTips: body.localTips || "",
    custom: true
  });
  res.status(201).json(record);
});

app.get("/api/settings", async (_req, res) => {
  const settings = await getSettings();
  res.json(maskSettings(settings));
});

app.post("/api/settings", async (req, res) => {
  const body = req.body || {};
  const patch = {};
  if (typeof body.niwaTideApiKey === "string") patch.niwaTideApiKey = body.niwaTideApiKey.trim();
  if (typeof body.stormglassApiKey === "string") {
    patch.stormglassApiKey = body.stormglassApiKey.trim();
  }
  const masked = await saveSettings(patch);
  res.json(masked);
});

app.post("/api/sponsors", async (req, res) => {
  const body = req.body || {};
  if (!body.name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const record = await addRecord("sponsors", {
    name: body.name.trim().slice(0, 80),
    discount: (body.discount || "").toString().slice(0, 80),
    groupId: body.groupId || ""
  });
  res.status(201).json(record);
});

app.get("/api/rnd", async (_req, res) => {
  const log = await listForecastLog();
  res.json({ forecastLog: log.slice(0, 50) });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

function getText(message) {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    ""
  ).trim();
}

async function replyToMessage(jid, message, text) {
  await socket.sendMessage(jid, { text }, { quoted: message });
}

async function processMessage(message) {
  const jid = message.key.remoteJid;
  const text = getText(message.message);

  if (!jid || !text || message.key.fromMe) return;

  const lower = text.toLowerCase();

  if (lower === "!help" || lower === "!commands") {
    await replyToMessage(
      jid,
      message,
      [
        "Available commands:",
        "!wind - current wind and best match",
        "!forecast - KAN-style daily forecast",
        "!spots - ranked spots for a self-sufficient beginner",
        "!help - show this message"
      ].join("\n")
    );
    return;
  }

  if (lower === "!wind" || lower === "wind?") {
    try {
      const overview = await buildOverview({ profile: "beginner-self" });
      const top = overview.ranked[0];
      await replyToMessage(
        jid,
        message,
        formatWindReport(overview.location.name, top.conditions, top)
      );
    } catch {
      await replyToMessage(jid, message, "I could not retrieve the wind report right now.");
    }
    return;
  }

  if (lower === "!forecast" || lower === "forecast?") {
    try {
      const overview = await buildOverview({});
      await replyToMessage(jid, message, overview.daily.text);
    } catch {
      await replyToMessage(jid, message, "I could not retrieve the forecast right now.");
    }
    return;
  }

  if (lower === "!spots") {
    try {
      const overview = await buildOverview({ profile: "beginner-self" });
      const lines = overview.ranked.slice(0, 5).map((row) => {
        return `${row.name}: ${row.score}/100 (${row.rating})`;
      });
      await replyToMessage(jid, message, ["Spot match right now", ...lines].join("\n"));
    } catch {
      await replyToMessage(jid, message, "I could not rank spots right now.");
    }
    return;
  }

  const addRequest =
    /\b(add|invite|include)\b.{0,60}\b(person|member|someone|him|her|them)\b/i.test(text) ||
    /\bcan someone add\b/i.test(text);

  if (addRequest && config.notifyJid && jid.endsWith("@g.us")) {
    await socket.sendMessage(config.notifyJid, {
      text: `Add-person request detected in group ${jid}:\n\n${text}`
    });
  }
}

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(config.authPath);

  socket = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["Auckland Kite Bot", "Chrome", "1.0.0"],
    markOnlineOnConnect: false
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info("Scan this QR code with WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      connected = true;
      logger.info("WhatsApp connected");
    }

    if (connection === "close") {
      connected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        logger.warn("WhatsApp disconnected; reconnecting");
        setTimeout(connectWhatsApp, 5000);
      } else {
        logger.error(
          "WhatsApp session logged out; remove the saved session and pair again"
        );
      }
    }
  });

  socket.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      try {
        await processMessage(message);
      } catch (error) {
        logger.error({ error }, "Message processing failed");
      }
    }
  });
}

seedKnowledge().catch((error) => {
  logger.warn({ error }, "Knowledge seed skipped");
});

app.listen(config.port, "0.0.0.0", () => {
  logger.info(`HTTP service listening on port ${config.port}`);
});

if (!config.whatsappDisabled) {
  connectWhatsApp().catch((error) => {
    logger.error({ error }, "WhatsApp startup failed; web app will keep running");
  });
}

export { app };
