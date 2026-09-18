# Platform portability (decision)

**Captured:** 2026-09-18  
**Status:** accepted  
**Owner:** Gary Bartlett  

## Context

Discussion while cutting over kite-bot to Hostinger covered whether the web app should instead run on Vercel and/or Convex, and how that relates to an open-source repo others can self-host.

## Decision

1. **Prefer one backend platform per app** unless a concrete constraint forces a split (e.g. durable multi-user DB/realtime, scale-out/preview deploys a single VPS cannot provide, or WhatsApp must run as a separate always-on worker).
2. **Hostinger/VPS is the production target for this app today** — Express + optional Baileys + `DATA_PATH` JSON fits an always-on process. Do not re-platform to Vercel/Convex for convenience alone.
3. **Open-source default is platform choice for users** — keep the core app platform-agnostic (Node, env config, Docker/`npm start`). Ship thin deploy recipes; do not bake a mandatory cloud vendor into mainline.
4. **Optional adapters are fine later** (Postgres, Convex, serverless) behind the same notes/membership interfaces — not as a requirement for the default path.

## Rationale

- Happy to run *different apps* on different backends; avoid splitting *one* app across backends without necessity.
- Vercel/Convex would require rewriting Express, replacing filesystem JSON persistence, and moving Baileys off-process — a re-platform, not a hosting toggle.
- Self-hosters should not be locked to Hostinger, Vercel, or Convex.

## Consequences

- Continue Hostinger (or equivalent VPS/Docker) as the primary deploy path for kite-bot.drim.works.
- Treat `Dockerfile` / Compose / env docs as the portable self-host story.
- If freemium/membership needs a real DB later, add a storage adapter; do not make Convex/Vercel the only supported runtime.

## Related

- `docs/hostinger-deploy-plan.md` — current production cutover
- `docs/recreation-assistant-vision.md` — product portfolio direction
