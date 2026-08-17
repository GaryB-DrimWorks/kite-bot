import express from "express";
import pino from "pino";
import qrcode from "qrcode-terminal";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 3000);
const AUTH_PATH = process.env.WHATSAPP_SESSION_PATH || "/app/data/whatsapp";
const NOTIFY_JID = process.env.NOTIFY_JID || "";
const DEFAULT_LOCATION = process.env.DEFAULT_LOCATION || "Auckland";
const LATITUDE = Number(process.env.LATITUDE || -36.8509);
const LONGITUDE = Number(process.env.LONGITUDE || 174.7645);

let socket;
let connected = false;

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    whatsappConnected: connected,
    location: DEFAULT_LOCATION,
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* app.get("/", (_req, res) => {
  res.type("text").send(
    "Auckland Kite Bot is running. View the current report at https://akb-reports.drim.works/report"
  );
});*/

app.get("/report", async (_req, res) => {
  try {
    const weather = await getWeather();
    res.json({
      location: DEFAULT_LOCATION,
      generatedAt: new Date().toISOString(),
      weather
    });
  } catch {
    res.status(503).json({ error: "Weather data unavailable" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`HTTP service listening on port ${PORT}`);
});

async function getWeather() {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude: String(LATITUDE),
    longitude: String(LONGITUDE),
    current:
      "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code",
    hourly:
      "wind_speed_10m,wind_direction_10m,precipitation_probability",
    forecast_days: "2",
    timezone: "Pacific/Auckland"
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }

  return response.json();
}

function getText(message) {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    ""
  ).trim();
}

function formatWind(weather) {
  const current = weather.current;

  return [
    `Wind report for ${DEFAULT_LOCATION}`,
    `Speed: ${current.wind_speed_10m} km/h`,
    `Direction: ${current.wind_direction_10m}°`,
    `Temperature: ${current.temperature_2m}°C`,
    `Updated: ${current.time}`
  ].join("\n");
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
        "!wind - current wind conditions",
        "!forecast - short forecast",
        "!help - show this message"
      ].join("\n")
    );
    return;
  }

  if (lower === "!wind" || lower === "wind?") {
    try {
      const weather = await getWeather();
      await replyToMessage(jid, message, formatWind(weather));
    } catch {
      await replyToMessage(
        jid,
        message,
        "I could not retrieve the wind report right now."
      );
    }
    return;
  }

  if (lower === "!forecast" || lower === "forecast?") {
    try {
      const weather = await getWeather();
      const hourly = weather.hourly;

      const forecast = hourly.time.slice(0, 6).map((time, index) => {
        return `${time}: ${hourly.wind_speed_10m[index]} km/h, ${hourly.wind_direction_10m[index]}°`;
      });

      await replyToMessage(
        jid,
        message,
        [`Short forecast for ${DEFAULT_LOCATION}`, ...forecast].join("\n")
      );
    } catch {
      await replyToMessage(
        jid,
        message,
        "I could not retrieve the forecast right now."
      );
    }
  }

  const addRequest =
    /\b(add|invite|include)\b.{0,60}\b(person|member|someone|him|her|them)\b/i.test(
      text
    ) ||
    /\bcan someone add\b/i.test(text);

  if (addRequest && NOTIFY_JID && jid.endsWith("@g.us")) {
    await socket.sendMessage(NOTIFY_JID, {
      text: `Add-person request detected in group ${jid}:\n\n${text}`
    });
  }
}

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);

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

      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        logger.warn("WhatsApp disconnected; reconnecting");
        setTimeout(connectWhatsApp, 5000);
      } else {
        logger.error("WhatsApp session logged out; remove the saved session and pair again");
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

connectWhatsApp().catch((error) => {
  logger.error({ error }, "WhatsApp startup failed");
  process.exit(1);
});
