# Hostinger deploy plan — kite-bot.drim.works

**Status:** GitHub ready (`main` @ `0bcef38`, PR #2, 2026-09-18). SSH cutover is **not done** — Cursor Cloud has no deploy key for this VPS.  
**VPS:** Hostinger KVM `1801176` (`srv1801176.hstgr.cloud` / `2.25.77.2`)  
**App path on VPS:** `/opt/auckland-kite-bot/`  
**Public URL:** https://kite-bot.drim.works  
**GitHub:** https://github.com/GaryB-DrimWorks/kite-bot  

This plan deploys the **web app first** (cameras Live|Forecast, notes, membership stubs). Keep WhatsApp on the Grok Bot / KAN Bot bridge for now — do **not** re-enable Baileys on the VPS until a dedicated number is ready.

### Live recon (2026-09-18, from Cursor Cloud)

| Check | Result |
|-------|--------|
| `dig kite-bot.drim.works` | **NXDOMAIN** (no A/CNAME). Apex `drim.works` → `2.25.77.2` |
| SSH `:22` | Open; `publickey,password`. This agent: **permission denied** (no key) |
| `:3000` from the internet | Closed (compose should bind localhost only) |
| nginx | `1.24.0` Ubuntu. HTTP `Host: kite-bot.drim.works` → **404** (no vhost) |
| Default HTTPS | `ai-dictionary.drim.works` (“Catch the AI Wave”). Leave that vhost as `default_server` |

The historical **HTTP 500** on the hostname is stale. Public failure mode today is **DNS missing** plus **no kite-bot vhost**. Do not point a new vhost at the AI Dictionary root.

On the VPS, run `sudo bash /opt/auckland-kite-bot/app/scripts/hostinger-cutover.sh` (add `--nginx` to drop in the vhost). Or paste this file into Hostinger’s agent.

---

## 0. Preconditions

- [ ] SSH access to KVM `1801176` as the usual deploy user (`root@2.25.77.2` or `root@srv1801176.hstgr.cloud`)
- [ ] Hostinger DNS **A** record `kite-bot` → `2.25.77.2` (currently NXDOMAIN; NS is Hostinger `dns-parking.com`)
- [ ] Reverse proxy (nginx) vhost `kite-bot.drim.works` → `127.0.0.1:3000` (not the default AI Dictionary site)
- [ ] Docker + Docker Compose installed on the VPS
- [x] GitHub `main` includes the Live\|Forecast dashboard (PR #1) and app-only compose (PR #2)

---

## 1. Goal for this deploy

| In scope | Out of scope (later) |
|----------|----------------------|
| Node app on `:3000` serving `/`, `/live`, `/forecast`, `/notes`, `/join`, portals, `/health`, `/api/*` | Live Clerk / Stripe keys |
| `WHATSAPP_DISABLED=1` (web-only) | VPS Baileys session |
| Persistent `DATA_PATH` volume for notes/session JSON | Full Postgres for membership (JSON stub is enough) |
| DNS + nginx vhost so the domain answers 200 (not NXDOMAIN / 404 / 500) | Camera still/chart equal-height polish |
| `PUBLIC_ORIGIN=https://kite-bot.drim.works` | Session-call teaser deep-links cutover |

---

## 2. Recommended layout on the VPS

Keep the existing folder name so volumes and muscle memory stay put:

```text
/opt/auckland-kite-bot/
  docker-compose.yml          # copy from app/deploy/hostinger/docker-compose.yml
  .env                        # secrets — never commit
  app/                        # git checkout of kite-bot (build context)
  data/
    app/                      # DATA_PATH (notes, kb_session stubs, plans)
    whatsapp/                 # unused while WHATSAPP_DISABLED=1
    postgres/                 # optional; only if you keep the old Postgres service
```

Two valid shapes:

**A — Preferred for this cutover (app-only Compose)**  
Parent compose (`deploy/hostinger/docker-compose.yml`) builds `./app`, mounts `./data/app` → `/app/data`, no Postgres, no Baileys.

The GitHub repo also has a root `docker-compose.yml` with `build.context: .` for local / clone-as-root use. Do **not** copy that file to the parent folder — context would miss `Dockerfile`.

**B — Keep old Compose**  
Retain `auckland-kite-postgres` if you want continuity, but the current app does **not** require Postgres for the web MVP (JSON under `DATA_PATH`). You can leave Postgres running unused, or remove it after backup.

---

## 3. Sample `docker-compose.yml` (app-only)

Create or replace `/opt/auckland-kite-bot/docker-compose.yml` from `deploy/hostinger/docker-compose.yml`:

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

SSH in, then either run the helper:

```bash
sudo bash /opt/auckland-kite-bot/app/scripts/hostinger-cutover.sh
# first time, clone first:
#   sudo mkdir -p /opt/auckland-kite-bot && sudo git clone https://github.com/GaryB-DrimWorks/kite-bot.git /opt/auckland-kite-bot/app
#   sudo bash /opt/auckland-kite-bot/app/scripts/hostinger-cutover.sh --nginx
```

Or the equivalent by hand:

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
cp app/deploy/hostinger/docker-compose.yml docker-compose.yml

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

## 6. DNS + reverse proxy (fix NXDOMAIN / 404 / old 500)

`kite-bot.drim.works` is **NXDOMAIN** as of 2026-09-18. Earlier reports of HTTP **500** were proxy/upstream misconfig; today there is no vhost at all (HTTP Host header → nginx 404). The default TLS cert is `ai-dictionary.drim.works` only.

Checklist:

1. Hostinger hPanel → DNS for `drim.works`: **A** `kite-bot` → `2.25.77.2` (TTL 300). Wait until `dig +short kite-bot.drim.works` returns that IP.
2. Vhost `server_name` = `kite-bot.drim.works` (do **not** set `default_server`)
3. Upstream = `http://127.0.0.1:3000` (not the AI Dictionary root or a dead container)
4. Proxy headers: `Host`, `X-Forwarded-For`, `X-Forwarded-Proto $scheme`
5. TLS cert for this hostname (`certbot --nginx -d kite-bot.drim.works`)
6. After compose + DNS + cert: `curl -sS -o /dev/null -w "%{http_code}\n" https://kite-bot.drim.works/health` → `200`

If still failing: `dig`, proxy error log, `docker compose logs --tail=100 auckland-kite-bot`, and `ss -lntp | grep 3000` (should be `127.0.0.1:3000` only).

Drop-in file: `deploy/hostinger/nginx-kite-bot.drim.works.conf`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name kite-bot.drim.works;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo cp /opt/auckland-kite-bot/app/deploy/hostinger/nginx-kite-bot.drim.works.conf \
  /etc/nginx/sites-available/kite-bot.drim.works
sudo ln -sfn /etc/nginx/sites-available/kite-bot.drim.works /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d kite-bot.drim.works
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
| `https://ai-dictionary.drim.works` | Still 200 (unchanged default site) |

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
cp app/deploy/hostinger/docker-compose.yml docker-compose.yml
docker compose build
docker compose up -d
curl -sS https://kite-bot.drim.works/health
```

Optional later: GitHub Action → SSH deploy on `main` push (not required for first cutover). Needs a deploy key in GitHub Secrets plus the same key on the VPS — this Cursor Cloud environment does not have that key today.

---

## 10. Follow-ups (not blocking this deploy)

1. ~~Commit a real `docker-compose.yml` into GitHub~~ done (PR #2). Parent-layout copy lives in `deploy/hostinger/`.
2. Wire Clerk + Stripe when freemium goes live.
3. Session-call teasers → deep links after cameras feel solid (`docs/session-call-teaser-roadmap.md`).
4. Reconcile Hostinger Ideal/OK/Sketchy bands vs skill-circle fills (`docs/hostinger-mvp-prompt.md` vs `docs/skill-icons.md`).
5. Dedicated WhatsApp number / VPS Baileys only when Grok Bot bridge is no longer the production path.
6. Add a VPS deploy key to Cursor Cloud / GitHub Actions if you want agents to finish SSH cutovers.

---

## 11. Quick owner checklist

1. Merge done ✅ (PR #1 dashboard, PR #2 compose → `main` @ `0bcef38`)
2. Hostinger DNS: A `kite-bot` → `2.25.77.2` until `dig` resolves
3. SSH → `scripts/hostinger-cutover.sh` (or pull `main` into `/opt/auckland-kite-bot/app` by hand)
4. Set `.env` with `WHATSAPP_DISABLED=1` + `PUBLIC_ORIGIN`
5. `docker compose build && up -d` — smoke `http://127.0.0.1:3000/health`
6. Enable nginx vhost + certbot (do not steal `ai-dictionary` default)
7. Click through Live / Forecast / Notes / Join once

To finish from Cursor Cloud, add an SSH public key for `root@srv1801176.hstgr.cloud` (or a deploy user) to this environment and say **proceed** again. Until then, run §5 on the VPS or hand Hostinger’s agent this file + `hostinger-mvp-prompt.md`.
