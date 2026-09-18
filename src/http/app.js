import path from "path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "url";
import express from "express";
import { config } from "../config/index.js";
import { CAMERA_LINKS, featuredCameras } from "../config/cameras.js";
import { buildOverview, buildLegacyReport } from "../app/overview.js";
import { buildLiveForecast } from "../app/liveForecast.js";
import {
  addRecord,
  getSettings,
  listForecastLog,
  listRecords,
  maskSettings,
  saveSettings,
  updateRecord
} from "../database/client.js";
import { seedKnowledge } from "../knowledge/seed.js";
import { getWeather } from "../weather/openMeteo.js";
import { logger } from "../utils/logger.js";
import { createNote, getNote, listNotes, patchNote, seedNotes } from "../notes/store.js";
import { PORTALS, canAccessPortal, publicPlans } from "../membership/tiers.js";
import { attachMembership, membershipPayload, requestOrigin, setMemberCookie } from "../membership/session.js";
import { createCheckout, planById, stripeStatus } from "../membership/stripe.js";
import { shareMeta, shareMetaTags } from "./share.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "..", "public");

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "120kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/report") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(asyncRoute(attachMembership));

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      whatsappConnected: Boolean(app.locals.whatsappConnected),
      whatsappDisabled: config.whatsappDisabled,
      location: config.defaultLocation.name,
      membership: req.membership?.tier,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/report", asyncRoute(async (_req, res) => {
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
  }));

  app.get("/api/overview", asyncRoute(async (req, res) => {
    try {
      res.json(await buildOverview(req.query));
    } catch (error) {
      logger.error({ error }, "Overview failed");
      res.status(503).json({ error: "Could not build the kite overview" });
    }
  }));

  app.get("/api/perspectives", asyncRoute(async (_req, res) => {
    const overview = await buildOverview({});
    res.json(overview.perspectives);
  }));

  app.get("/api/spots", asyncRoute(async (_req, res) => {
    const overview = await buildOverview({});
    res.json({ spots: overview.spots });
  }));

  app.get("/api/forecast/daily", asyncRoute(async (req, res) => {
    const overview = await buildOverview(req.query);
    res.json(overview.daily);
  }));

  app.get("/api/events", asyncRoute(async (req, res) => {
    const overview = await buildOverview(req.query);
    res.json({ events: overview.daily.events, weekend: overview.daily.weekend });
  }));

  app.get("/api/condition-reports", asyncRoute(async (req, res) => {
    const overview = await buildOverview(req.query);
    res.json({ reports: overview.reports });
  }));

  app.post("/api/condition-reports", asyncRoute(async (req, res) => {
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
  }));

  app.get("/api/lost-gear", asyncRoute(async (req, res) => {
    const overview = await buildOverview(req.query);
    res.json({ items: overview.lostGear, advice: overview.lostGearAdvice });
  }));

  app.post("/api/lost-gear", asyncRoute(async (req, res) => {
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
  }));

  app.get("/api/knowledge", asyncRoute(async (req, res) => {
    const overview = await buildOverview(req.query);
    res.json({ items: overview.knowledge });
  }));

  app.post("/api/knowledge", asyncRoute(async (req, res) => {
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
  }));

  app.post("/api/spots", asyncRoute(async (req, res) => {
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
  }));

  app.get("/api/settings", asyncRoute(async (_req, res) => {
    const settings = await getSettings();
    res.json(maskSettings(settings));
  }));

  app.post("/api/settings", asyncRoute(async (req, res) => {
    const body = req.body || {};
    const patch = {};
    if (typeof body.niwaTideApiKey === "string") patch.niwaTideApiKey = body.niwaTideApiKey.trim();
    if (typeof body.stormglassApiKey === "string") {
      patch.stormglassApiKey = body.stormglassApiKey.trim();
    }
    const masked = await saveSettings(patch);
    res.json(masked);
  }));

  app.post("/api/sponsors", asyncRoute(async (req, res) => {
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
  }));

  app.get("/api/rnd", asyncRoute(async (_req, res) => {
    const log = await listForecastLog();
    res.json({ forecastLog: log.slice(0, 50) });
  }));

  app.get("/api/cameras", (_req, res) => {
    res.json({ cameras: featuredCameras(), links: CAMERA_LINKS });
  });

  app.get("/api/live-forecast", asyncRoute(async (req, res) => {
    const payload = await buildLiveForecast(req.query);
    res.json(payload);
  }));

  app.get("/api/notes", asyncRoute(async (req, res) => {
    const notes = await listNotes({
      spotId: req.query.spot || req.query.spotId || "",
      skill: req.query.skill || "",
      newToSpot: req.query.newToSpot || req.query["new-to-spot"] || "",
      groupId: req.query.group || ""
    });
    res.json({ notes });
  }));

  app.get("/api/notes/:id", asyncRoute(async (req, res) => {
    const note = await getNote(req.params.id);
    if (!note) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(note);
  }));

  app.post("/api/notes", asyncRoute(async (req, res) => {
    const result = await createNote(req.body || {});
    if (result.error) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json(result.record);
  }));

  app.patch("/api/notes/:id", asyncRoute(async (req, res) => {
    const result = await patchNote(req.params.id, req.body || {});
    if (result.error) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.record);
  }));

  app.get("/api/me", asyncRoute(async (req, res) => {
    res.json(await membershipPayload(req));
  }));

  app.get("/api/membership/plans", asyncRoute(async (_req, res) => {
    res.json({ plans: publicPlans(await listRecords("plans")), stripe: stripeStatus() });
  }));

  app.post("/api/membership/signup", asyncRoute(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 120);
    const name = String(req.body?.name || "").trim().slice(0, 80);
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const members = await listRecords("members");
    let record = members.find((row) => row.email === email);
    if (!record) {
      record = await addRecord("members", {
        email,
        name,
        tier: "free-member",
        roles: [],
        planId: "free",
        visitorId: req.membership.visitorId
      });
    } else if (name && name !== record.name) {
      record = await updateRecord("members", record.id, { name });
    }
    setMemberCookie(res, req, record.id);
    res.status(201).json({
      member: {
        id: record.id,
        email: record.email,
        name: record.name,
        tier: record.tier,
        planId: record.planId
      }
    });
  }));

  app.post("/api/membership/checkout", asyncRoute(async (req, res) => {
    const planId = String(req.body?.planId || "");
    const plan = planById(planId, await listRecords("plans"));
    if (!plan) {
      res.status(400).json({ error: "unknown plan" });
      return;
    }
    if (plan.priceCents === 0) {
      res.status(400).json({ error: "use /api/membership/signup for the free plan" });
      return;
    }
    if (!req.membership.member) {
      res.status(401).json({ error: "sign up as a free member before checkout" });
      return;
    }
    const origin = requestOrigin(req);
    const session = await createCheckout({
      plan,
      origin,
      member: req.membership.member
    });
    res.json({ plan, ...session });
  }));

  app.post("/api/membership/activate", asyncRoute(async (req, res) => {
    const member = req.membership.member;
    if (!member) {
      res.status(401).json({ error: "sign up first" });
      return;
    }
    const planId = String(req.body?.planId || member.planId || "individual-month");
    const plan = planById(planId, await listRecords("plans"));
    if (!plan) {
      res.status(400).json({ error: "unknown plan" });
      return;
    }
    const record = await updateRecord("members", member.id, {
      tier: plan.tier,
      planId: plan.id,
      billed: plan.priceCents > 0 ? "stub" : "free"
    });
    setMemberCookie(res, req, record.id);
    res.json({
      member: {
        id: record.id,
        email: record.email,
        name: record.name,
        tier: record.tier,
        planId: record.planId
      },
      stub: true
    });
  }));

  app.get("/api/portals", asyncRoute(async (req, res) => {
    const me = await membershipPayload(req);
    res.json({ portals: me.portals, tier: me.tier });
  }));

  async function sendIndex(req, res) {
    const html = await readFile(path.join(publicDir, "index.html"), "utf8");
    const meta = shareMeta(req, requestOrigin(req));
    const tags = shareMetaTags(meta);
    const page = html
      .replace("<!-- SHARE_META -->", tags)
      .replaceAll("{{SHARE_TITLE}}", meta.title)
      .replaceAll("{{SHARE_DESCRIPTION}}", meta.description);
    res.type("html").send(page);
  }

  app.get(["/", "/live", "/forecast"], asyncRoute(sendIndex));
  app.get("/dashboard", (_req, res) => {
    res.sendFile(path.join(publicDir, "dashboard.html"));
  });
  app.get("/notes", (_req, res) => {
    res.sendFile(path.join(publicDir, "notes.html"));
  });
  app.get(["/join", "/membership"], (_req, res) => {
    res.sendFile(path.join(publicDir, "join.html"));
  });

  for (const portal of PORTALS) {
    app.get(portal.path, asyncRoute(async (req, res) => {
      const allowed = canAccessPortal(
        req.membership.tier,
        portal.id,
        req.membership.roles
      );
      res.sendFile(path.join(publicDir, "portals", `${portal.id}.html`), {
        headers: { "X-Portal-Allowed": allowed ? "1" : "0" }
      });
    }));
  }

  app.use(express.static(publicDir));

  app.use((error, _req, res, _next) => {
    logger.error({ error }, "Request failed");
    res.status(500).json({ error: "Server error" });
  });

  app.locals.ready = Promise.all([
    seedKnowledge().catch((error) => {
      logger.warn({ error }, "Knowledge seed skipped");
    }),
    seedNotes().catch((error) => {
      logger.warn({ error }, "Notes seed skipped");
    })
  ]);

  return app;
}
