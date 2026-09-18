# Auckland Kite Bot — Recreation Assistant #1

Web app, agent, and WhatsApp bot for Auckland kitesurfing. Production target: [https://kite-bot.drim.works](https://kite-bot.drim.works).

## Run locally (web only)

```bash
npm ci
WHATSAPP_DISABLED=1 npm start
```

Open [http://localhost:3000](http://localhost:3000) — Live | Forecast cameras with skill circles.

```bash
npm test
```

## Useful URLs

| Path | What |
|------|------|
| `/` `/forecast` `/live` | Camera Live \| Forecast (KAN report cards + Windsurf stills/charts) |
| `/forecast?skill=beginner&spot=takapuna` | Shareable forecast deep link |
| `/live?dir=SW` | Shareable live deep link |
| `/dashboard` | Ranked spots / safety / knowledge |
| `/notes` | General + spot notes/advice forms |
| `/join` | Membership tiers + checkout stub |
| `/portals/instructor` | Instructor portal stub |
| `/portals/provider` | Weather provider / CYOS portal stub |
| `/portals/sponsor` | Sponsor portal stub |
| `/health` | Liveness JSON |
| `/api/live-forecast` | Cameras + skill circles + notes |
| `/api/notes` | `GET` `POST` `PATCH` — filter `spot`, `skill`, `newToSpot` |
| `/api/me` | Visitor cookie + tier + portals |
| `/api/overview` | Existing ranked-spot meta layer |

## Environment variables

Copy `.env.example`. **Do not commit secrets.**

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_DISABLED` | `1` / `true` to skip Baileys (web-only) |
| `PORT` | HTTP port (default `3000`) |
| `DATA_PATH` | JSON store directory (default `data`) |
| `PUBLIC_ORIGIN` | Canonical origin for OG/share URLs |
| `LATITUDE` / `LONGITUDE` / `DEFAULT_LOCATION` | Regional wind reference |
| `NIWA_TIDE_API_KEY` | Official tides (also saveable in Manager BYOK) |
| `STORMGLASS_API_KEY` | Stored for later marine use |
| `WEATHER_CACHE_MS` | Open-Meteo cache TTL |
| `WHATSAPP_SESSION_PATH` | Baileys auth folder |
| `NOTIFY_JID` | Private notify target for add-member requests |
| `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Production identity (optional; session cookie is the local stub) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Paid Checkout (optional; `/join` uses a local stub) |
| `STRIPE_PRICE_INDIVIDUAL` / `STRIPE_PRICE_GROUP` | Stripe Price IDs for configurable plans |
| `LOG_LEVEL` | pino level |

When Clerk/Stripe keys are missing, the app stays usable: visitor cookies, free-member signup, and a checkout stub that activates the selected plan locally.

## Membership

Tiers: **Visitor → Returning Visitor → Free Member → Paid Individual → Paid Group**.

Returning visitors are detected from the `kb_session` cookie. Paid group plans are configurable via `data/plans.json` (same shape as `src/membership/tiers.js`).

## WhatsApp

Without `WHATSAPP_DISABLED`, `npm start` pairs Baileys and handles `!wind`, `!forecast`, `!spots`. Session calls should shrink to teasers that deep-link the web app — see `docs/session-call-teaser-roadmap.md`.

## Docs

- `docs/hostinger-deploy-plan.md` — Hostinger / [kite-bot.drim.works](https://kite-bot.drim.works) deploy (`deploy/hostinger/`, `scripts/hostinger-cutover.sh`)
- `docs/platform-portability.md` — one backend per app; OSS self-host / platform choice
- `docs/recreation-assistant-roadmap.md` — upcoming product slice
- `docs/recreation-assistant-vision.md` — portfolio / CYOS / freemium
- `docs/skill-icons.md` — ⚪🔵🟢🟠🔴 circles (no B/I/A letters)
- `docs/web-app-features.md` — original support-bot feature list
