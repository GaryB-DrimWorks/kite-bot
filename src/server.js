import path from "path";
import { fileURLToPath } from "url";
import pino from "pino";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { config } from "./config/index.js";
import { createApp } from "./http/app.js";
import { buildOverview } from "./app/overview.js";
import { formatWindReport } from "./reports/generator.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isMain = path.resolve(process.argv[1] || "") === __filename;

const app = createApp();
let socket;
let connected = false;

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
        "!help - show this message",
        "Web: https://kite-bot.drim.works/forecast"
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
      app.locals.whatsappConnected = true;
      logger.info("WhatsApp connected");
    }

    if (connection === "close") {
      connected = false;
      app.locals.whatsappConnected = false;
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

if (isMain) {
  app.locals.ready.then(() => {
    app.listen(config.port, "0.0.0.0", () => {
      logger.info(`HTTP service listening on port ${config.port}`);
    });

    if (!config.whatsappDisabled) {
      connectWhatsApp().catch((error) => {
        logger.error({ error }, "WhatsApp startup failed; web app will keep running");
      });
    } else {
      logger.info("WhatsApp disabled (WHATSAPP_DISABLED=1); web app only");
    }
  });
}

export { app, connected };
