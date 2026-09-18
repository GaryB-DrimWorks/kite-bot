#!/usr/bin/env bash
# Run on Hostinger KVM 1801176 as the deploy user (usually root).
# Nested VPS layout: /opt/auckland-kite-bot/{docker-compose.yml,.env,app/,data/app/}
set -euo pipefail

ROOT="${HOSTINGER_ROOT:-/opt/auckland-kite-bot}"
REPO_URL="${HOSTINGER_REPO:-https://github.com/GaryB-DrimWorks/kite-bot.git}"
ENABLE_NGINX=0

usage() {
  cat <<'EOF'
Usage: scripts/hostinger-cutover.sh [--nginx]

  Pulls main into /opt/auckland-kite-bot/app, installs the parent
  docker-compose.yml, creates .env once, builds, and starts the app
  on 127.0.0.1:3000.

  --nginx   also install/enable the kite-bot nginx vhost (does not
            run certbot; do that after DNS exists).
EOF
}

for arg in "$@"; do
  case "$arg" in
    --nginx) ENABLE_NGINX=1 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on the VPS" >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is required on the VPS" >&2
  exit 1
fi

mkdir -p "$ROOT"
cd "$ROOT"

if [ ! -d app/.git ]; then
  git clone "$REPO_URL" app
else
  git -C app fetch origin
  git -C app checkout main
  git -C app pull --ff-only origin main
fi

install -m 0644 app/deploy/hostinger/docker-compose.yml "$ROOT/docker-compose.yml"
mkdir -p data/app

if [ ! -f .env ]; then
  cp app/.env.example .env
  sed -i \
    -e 's|^PORT=.*|PORT=3000|' \
    -e 's|^WHATSAPP_DISABLED=.*|WHATSAPP_DISABLED=1|' \
    -e 's|^DATA_PATH=.*|DATA_PATH=/app/data|' \
    -e 's|^PUBLIC_ORIGIN=.*|PUBLIC_ORIGIN=https://kite-bot.drim.works|' \
    .env
  echo "Created $ROOT/.env — review it before going public."
fi

docker compose build --no-cache
docker compose up -d

echo "--- local smoke ---"
curl -sS --max-time 15 http://127.0.0.1:3000/health || true
echo
curl -sS -o /dev/null -w "GET / -> %{http_code}\n" --max-time 15 http://127.0.0.1:3000/ || true

if [ "$ENABLE_NGINX" -eq 1 ]; then
  if [ ! -d /etc/nginx/sites-available ]; then
    echo "nginx sites-available not found; skip --nginx" >&2
  else
    install -m 0644 app/deploy/hostinger/nginx-kite-bot.drim.works.conf \
      /etc/nginx/sites-available/kite-bot.drim.works
    ln -sfn /etc/nginx/sites-available/kite-bot.drim.works \
      /etc/nginx/sites-enabled/kite-bot.drim.works
    nginx -t
    systemctl reload nginx
    echo "nginx vhost enabled. After DNS exists: certbot --nginx -d kite-bot.drim.works"
  fi
fi

cat <<'EOF'

Next (cannot be done from this script):
  1. Hostinger DNS: A record kite-bot -> 2.25.77.2
  2. TLS: certbot --nginx -d kite-bot.drim.works
  3. curl -sS https://kite-bot.drim.works/health
EOF
