function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const THEME_APP_KEY = "kan-theme-app";
const THEME_PAGE_KEY = "kan-theme-page";

function pageThemeKey() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  return `${THEME_PAGE_KEY}:${path}`;
}

function readThemePrefs() {
  let app = { mode: "dark", scheme: "ocean", scope: "app" };
  try {
    app = { ...app, ...JSON.parse(localStorage.getItem(THEME_APP_KEY) || "{}") };
  } catch {
    /* ignore */
  }
  let page = null;
  try {
    page = JSON.parse(localStorage.getItem(pageThemeKey()) || "null");
  } catch {
    page = null;
  }
  if (app.scope === "page" && page) {
    return { mode: page.mode || app.mode, scheme: page.scheme || app.scheme, scope: "page" };
  }
  return app;
}

function applyThemePrefs(prefs) {
  const root = document.documentElement;
  root.dataset.theme = prefs.mode === "light" ? "light" : "dark";
  root.dataset.scheme = ["ocean", "sand", "forest", "slate"].includes(prefs.scheme)
    ? prefs.scheme
    : "ocean";
  root.dataset.themeScope = prefs.scope === "page" ? "page" : "app";
}

function saveThemePrefs(prefs) {
  try {
    if (prefs.scope === "page") {
      localStorage.setItem(
        pageThemeKey(),
        JSON.stringify({ mode: prefs.mode, scheme: prefs.scheme })
      );
      const app = readThemePrefs();
      localStorage.setItem(
        THEME_APP_KEY,
        JSON.stringify({ mode: app.mode, scheme: app.scheme, scope: "page" })
      );
    } else {
      localStorage.setItem(
        THEME_APP_KEY,
        JSON.stringify({ mode: prefs.mode, scheme: prefs.scheme, scope: "app" })
      );
    }
  } catch {
    /* ignore */
  }
}

function ensureThemeControls() {
  if (document.getElementById("theme-mode")) return;
  const chrome = document.querySelector(".chrome");
  if (!chrome) return;
  let tools = chrome.querySelector(".chrome-tools");
  if (!tools) {
    tools = document.createElement("div");
    tools.className = "chrome-tools";
    const chip = chrome.querySelector("#tier-chip");
    if (chip) tools.appendChild(chip);
    chrome.appendChild(tools);
  }
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <label class="theme-ctrl"><span>Theme</span>
      <select id="theme-mode" aria-label="Light or dark">
        <option value="dark">Dark</option><option value="light">Light</option>
      </select>
    </label>
    <label class="theme-ctrl"><span>Scheme</span>
      <select id="theme-scheme" aria-label="Colour scheme">
        <option value="ocean">Ocean</option><option value="sand">Sand</option>
        <option value="forest">Forest</option><option value="slate">Slate</option>
      </select>
    </label>
    <label class="theme-ctrl"><span>Apply</span>
      <select id="theme-scope" aria-label="Theme scope">
        <option value="app">App-wide</option><option value="page">This page</option>
      </select>
    </label>`;
  const chip = tools.querySelector("#tier-chip");
  while (wrap.firstChild) tools.insertBefore(wrap.firstChild, chip);
}

function bootThemeControls() {
  ensureThemeControls();
  const modeEl = document.getElementById("theme-mode");
  const schemeEl = document.getElementById("theme-scheme");
  const scopeEl = document.getElementById("theme-scope");
  const prefs = readThemePrefs();
  applyThemePrefs(prefs);
  if (!modeEl || !schemeEl || !scopeEl) return;
  modeEl.value = prefs.mode;
  schemeEl.value = prefs.scheme;
  scopeEl.value = prefs.scope;
  const sync = () => {
    const next = {
      mode: modeEl.value,
      scheme: schemeEl.value,
      scope: scopeEl.value
    };
    applyThemePrefs(next);
    saveThemePrefs(next);
  };
  modeEl.addEventListener("change", sync);
  schemeEl.addEventListener("change", sync);
  scopeEl.addEventListener("change", sync);
}

function markCurrentNav() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll(".chrome nav a").forEach((link) => {
    const href = link.getAttribute("href");
    const current =
      href === path ||
      (href === "/" && (path === "/live" || path === "/forecast")) ||
      (href === "/join" && path === "/membership") ||
      (href.startsWith("/portals/") && path.startsWith("/portals/"));
    link.setAttribute("aria-current", current ? "page" : "false");
  });
}

async function bootChrome() {
  bootThemeControls();
  markCurrentNav();
  const chip = document.getElementById("tier-chip");
  if (!chip) return;
  try {
    const me = await fetch("/api/me").then((res) => res.json());
    chip.textContent = me.tierLabel || "Visitor";
    chip.href = "/join";
    chip.dataset.tier = me.tier;
  } catch {
    chip.textContent = "Visitor";
  }
}

document.addEventListener("DOMContentLoaded", bootChrome);
