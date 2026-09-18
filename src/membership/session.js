import { randomUUID } from "node:crypto";
import { config } from "../config/index.js";
import { getRecord, listRecords } from "../database/client.js";
import { classifyVisitor, PORTALS, publicPlans, canAccessPortal, tierById } from "./tiers.js";

const COOKIE = "kb_session";
const MAX_AGE = 60 * 60 * 24 * 365;

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function readSession(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.v) return null;
    return parsed;
  } catch {
    return null;
  }
}

function encodeSession(session) {
  return encodeURIComponent(JSON.stringify(session));
}

export function requestOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

export async function attachMembership(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const now = Date.now();
  let session = readSession(cookies[COOKIE]);
  if (!session) {
    session = { v: randomUUID(), f: new Date(now).toISOString(), l: new Date(now).toISOString(), n: 1, m: "" };
  } else {
    const last = session.l ? new Date(session.l).getTime() : 0;
    if (now - last > 30 * 60 * 1000) {
      session.n = Number(session.n || 1) + 1;
    }
    session.l = new Date(now).toISOString();
  }

  const member = session.m ? await getRecord("members", session.m) : null;
  const tier = classifyVisitor({
    visits: session.n,
    firstSeen: session.f,
    member
  });

  req.membership = {
    visitorId: session.v,
    visits: session.n,
    firstSeen: session.f,
    lastSeen: session.l,
    member,
    tier,
    tierLabel: tierById(tier).label,
    roles: member?.roles || [],
    clerkConfigured: Boolean(config.clerkSecretKey || config.clerkPublishableKey),
    stripeConfigured: Boolean(config.stripeSecretKey)
  };

  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${encodeSession(session)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
  );
  next();
}

export function setMemberCookie(res, req, memberId) {
  const cookies = parseCookies(req.headers.cookie);
  const session = readSession(cookies[COOKIE]) || {
    v: req.membership?.visitorId || randomUUID(),
    f: new Date().toISOString(),
    l: new Date().toISOString(),
    n: req.membership?.visits || 1,
    m: ""
  };
  session.m = memberId;
  session.l = new Date().toISOString();
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${encodeSession(session)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
  );
}

export async function membershipPayload(req) {
  const plans = publicPlans(await listRecords("plans"));
  const me = req.membership;
  return {
    ...me,
    member: me.member
      ? {
          id: me.member.id,
          email: me.member.email,
          name: me.member.name,
          tier: me.member.tier,
          roles: me.member.roles || [],
          planId: me.member.planId || ""
        }
      : null,
    plans,
    portals: PORTALS.map((portal) => ({
      ...portal,
      allowed: canAccessPortal(me.tier, portal.id, me.roles)
    })),
    auth: {
      mode: me.clerkConfigured ? "clerk" : "session",
      clerk: me.clerkConfigured,
      stripe: me.stripeConfigured
    }
  };
}
