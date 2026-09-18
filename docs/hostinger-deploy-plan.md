# Hostinger deploy plan — kite-bot.drim.works

**Status:** ready after PR #1 merge (`main` @ `ac24af7`, 2026-09-17 NZST)  
**VPS:** Hostinger KVM `1801176`  
**App path on VPS:** `/opt/auckland-kite-bot/`  
**Public URL:** https://kite-bot.drim.works  
**GitHub:** https://github.com/GaryB-DrimWorks/kite-bot  

This plan deploys the **web app first** (cameras Live|Forecast, notes, membership stubs). Keep WhatsApp on the Grok Bot / KAN Bot bridge for now — do **not** re-enable Baileys on the VPS until a dedicated number is ready.

---

## 0. Preconditions

- [ ] SSH access to KVM `1801176` as the usual deploy user
- [ ] Domain `kite-bot.drim.works` DNS → this VPS (already in use; site previously returned HTTP 500)
- [ ] Reverse proxy (nginx/Caddy/Hostinger panel) can point the vhost to `127.0.0.1:3000`
- [ ] Docker + Docker Compose installed on the VPS
- [ ] GitHub `main` includes the Live|Forecast dashboard (PR #1 squashed)

---

## 1. Goal for this deploy

| In scope | Out of scope (later) |
|----------|----------------------|
| Node app on `:3000` serving `/`, `/live`, `/forecast`, `/notes`, `/join`, portals, `/health`, `/api/*` | Live Clerk / Stripe keys |
| `WHATSAPP_DISABLED=1` (web-only) | VPS Baileys session |
| Persistent `DATA_PATH` volume for notes/session JSON | Full Postgres for membership (JSON stub is enough) |
| Fix reverse-proxy → app so the domain stops 500 | Camera still/chart equal-height polish |
| `PUBLIC_ORIGIN=https://kite-bot.drim.works` | Session-call teaser deep-links cutover |

---

## 2. Recommended layout on the VPS

Keep the existing folder name so volumes and muscle memory stay put:

```text
/opt/auckland-kite-bot/
  docker-compose.yml          # create/update (not in GitHub yet — see §3)
  .env                        # secrets — never commit
  app/                        # git checkout of kite-bot (or build context)
  data/
    app/                      # DATA_PATH (notes, kb_session stubs, plans)
    whatsapp/                 # unused while WHATSAPP_DISABLED=1
    postgres/                 # optional; only if you keep the old Postgres service
```

Two valid shapes:

**A — Preferred for this cutover (app-only Compose)**  
Build from GitHub `Dockerfile`, mount `./data/app` → `/app/data`, no Postgres, no Baileys.

**B — Keep old Compose**  
Retain `auckland-kite-postgres` if you want continuity, but the current app does **not** require Postgres for the web MVP (JSON under `DATA_PATH`). You can leave Postgres running unused, or remove it after backup.

---

## 3. Sample `docker-compose.yml` (app-only)

Create or replace `/opt/auckland-kite-bot/docker-compose.yml`:

```yaml
services:
  auckland-kite-bot:
    build:
      context: ./app
      dockerfile: Dockerfile
    container_name: auckland-kite-bot
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - ./data/app:/app/data
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
```

Bind to **localhost only** so the reverse proxy is the public front door (avoids exposing Node directly).

---

## 4. `.env` on the VPS

Start from repo `.env.example`, then set production values. Minimum:

```bash
PORT=3000
WHATSAPP_DISABLED=1
DATA_PATH=/app/data
PUBLIC_ORIGIN=https://kite-bot.drim.works
DEFAULT_LOCATION=Auckland
LATITUDE=-36.8509
LONGITUDE=174.7645
LOG_LEVEL=info
# Optional later:
# NIWA_TIDE_API_KEY=
# CLERK_PUBLISHABLE_KEY=
# CLERK_SECRET_KEY=
# STRIPE_SECRET_KEY=
# STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=
# STRIPE_PRICE_INDIVIDUAL=
# STRIPE_PRICE_GROUP=
```

Rules:

- Do **not** copy `.env` into git or chat.
- Leave Clerk/Stripe empty for now — visitor cookie + checkout stub stay usable.
- Keep `WHATSAPP_DISABLED=1` until Baileys is intentionally reintroduced.

---

## 5. Deploy steps (first time / refresh from `main`)

SSH in, then:

```bash
cd /opt/auckland-kite-bot

# 1) App tree
if [ ! -d app/.git ]; then
  git clone https://github.com/GaryB-DrimWorks/kite-bot.git app
else
  cd app && git fetch origin && git checkout main && git pull --ff-only origin main && cd ..
fi

# 2) Env (create once)
test -f .env || cp app/.env.example .env
# edit .env: PUBLIC_ORIGIN, WHATSAPP_DISABLED=1, DATA_PATH=/app/data

mkdir -p data/app

# 3) Build & run
docker compose build --no-cache
docker compose up -d

# 4) Smoke
curl -sS http://127.0.0.1:3000/health
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

Expect `/health` JSON OK and `/` → `200`.

---

## 6. Reverse proxy (fix the HTTP 500)

`kite-bot.drim.works` previously returned **500** — treat that as proxy/upstream misconfig until proven otherwise.

Checklist:

1. Vhost server_name = `kite-bot.drim.works` (+ www redirect if used)
2. Upstream = `http://127.0.0.1:3000` (not an old reports host or dead container)
3. Proxy headers: `Host`, `X-Forwarded-For`, `X-Forwarded-Proto $scheme`
4. TLS cert valid (Let's Encrypt / Hostinger SSL)
5. After compose up: `curl -sS -o /dev/null -w "%{http_code}\n" https://kite-bot.drim.works/health` → `200`

If still 500: check proxy error log, `docker compose logs --tail=100 auckland-kite-bot`, and confirm nothing else is bound to `:3000`.

Example nginx location:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 7. Post-deploy verification

| Check | Expect |
|-------|--------|
| `https://kite-bot.drim.works/health` | 200 JSON |
| `/` `/live` `/forecast` | Live\|Forecast UI loads |
| `/forecast?skill=beginner` | Deep link works |
| `/notes` | Form loads; POST persists under `data/app` |
| `/join` | Membership stub (no Stripe required) |
| `/dashboard` | Old ranked UI still reachable |
| Open-Meteo | Cards populate (or graceful empty if rate-limited) |
| WhatsApp group | Unchanged — still Grok Bot / KAN Bot bridge |

---

## 8. Rollback

```bash
cd /opt/auckland-kite-bot/app
git log -5 --oneline
git checkout <previous-good-sha>
cd ..
docker compose build
docker compose up -d
```

Keep `data/app` volume — notes/session cookies survive rebuilds.

If the new build is broken and the old image tag still exists:

```bash
docker compose down
# retarget compose image/tag or rebuild from previous SHA
docker compose up -d
```

---

## 9. Ongoing update cadence

```bash
cd /opt/auckland-kite-bot/app && git pull --ff-only origin main && cd ..
docker compose build
docker compose up -d
curl -sS https://kite-bot.drim.works/health
```

Optional later: GitHub Action → SSH deploy on `main` push (not required for first cutover).

---

## 10. Follow-ups (not blocking this deploy)

1. Commit a real `docker-compose.yml` (+ maybe `compose.web.yml`) into the GitHub repo so VPS and docs match.
2. Wire Clerk + Stripe when freemium goes live.
3. Session-call teasers → deep links after cameras feel solid (`docs/session-call-teaser-roadmap.md`).
4. Reconcile Hostinger Ideal/OK/Sketchy bands vs skill-circle fills (`docs/hostinger-mvp-prompt.md` vs `faq/skill-icons.md`).
5. Dedicated WhatsApp number / VPS Baileys only when Grok Bot bridge is no longer the production path.

---

## 11. Quick owner checklist

1. Merge done ✅ (PR #1 → `main`)
2. SSH → pull `main` into `/opt/auckland-kite-bot/app`
3. Set `.env` with `WHATSAPP_DISABLED=1` + `PUBLIC_ORIGIN`
4. `docker compose build && up -d`
5. Fix proxy until `https://kite-bot.drim.works/health` is 200
6. Click through Live / Forecast / Notes / Join once

When you are ready for the SSH cutover, say the word and we can walk it step-by-step (or hand Hostinger’s agent this file + `hostinger-mvp-prompt.md`).
