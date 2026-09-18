const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const windEl = document.getElementById("wind");
const filterEl = document.getElementById("filter");
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const status = document.getElementById("status");
const chips = document.getElementById("chips");
const skillToggle = document.getElementById("skillToggle");
const adviceEl = document.getElementById("advice");
const skillKey = document.getElementById("skillKey");
const stations = document.getElementById("stations");

let payload = null;
let tick = 0;
let focusSpot = "";

function viewMode() {
  return document.querySelector('input[name="view"]:checked')?.value || "forecast";
}

function skillMode() {
  return document.querySelector('input[name="skill"]:checked')?.value || "all";
}

function bust(url) {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${tick}`;
}

function stateFromLocation() {
  const url = new URL(window.location.href);
  const path = url.pathname.replace(/\/$/, "") || "/";
  let view = "forecast";
  if (path === "/live" || url.searchParams.get("view") === "live") view = "live";
  if (path === "/forecast" || url.searchParams.get("view") === "forecast") view = "forecast";
  return {
    view,
    dir: (url.searchParams.get("dir") || "").toUpperCase(),
    skill: (url.searchParams.get("skill") || "all").toLowerCase(),
    spot: (url.searchParams.get("spot") || "").toLowerCase(),
    filter: url.searchParams.get("filter") || ""
  };
}

function pushShareState() {
  const view = viewMode();
  const skill = skillMode();
  const dir = windEl.value;
  const filter = filterEl.value;
  const params = new URLSearchParams();
  if (dir) params.set("dir", dir);
  if (skill && skill !== "all") params.set("skill", skill);
  if (filter && filter !== "auto") params.set("filter", filter);
  if (focusSpot) params.set("spot", focusSpot);
  const path = view === "live" ? "/live" : "/forecast";
  const qs = params.toString();
  history.replaceState({ view, skill, dir, filter }, "", `${path}${qs ? `?${qs}` : ""}`);
  document.title =
    view === "live"
      ? `KAN Live · ${dir} — Auckland kitesurf cameras`
      : `KAN Forecast · ${skill} — Auckland kitesurf`;
}

function circlesHtml(circles) {
  if (!circles?.length) return "";
  const dots = circles
    .map(
      (circle) =>
        `<span class="sk-circle ${circle.fill}" title="${escapeHtml(circle.label)}: ${escapeHtml(circle.meaning)}"></span>`
    )
    .join("");
  return `<div class="skill-row">
    <span class="sk-circles" role="img" aria-label="Beginner Intermediate Advanced">${dots}</span>
    <span class="skill-caption">Beginner · Intermediate · Advanced</span>
  </div>`;
}

function notesHtml(notes) {
  if (!notes?.length) return "";
  return notes
    .map(
      (note) =>
        `<div class="note"><strong>${escapeHtml(note.title)}</strong> — ${escapeHtml(note.body)}</div>`
    )
    .join("");
}

function onStillError(panel, camera, img) {
  const tried = img.dataset.tried || "";
  if (!tried.includes("alt") && camera.liveImageAlt) {
    img.dataset.tried = `${tried}alt,`;
    img.src = camera.liveImageAlt;
    return;
  }
  if (!tried.includes("www") && camera.liveImage && camera.liveImage.includes("://windsurf.co.nz/")) {
    img.dataset.tried = `${tried}www,`;
    img.src = camera.liveImage.replace("://windsurf.co.nz/", "://www.windsurf.co.nz/");
    return;
  }
  panel.classList.add("need-sub");
}

function buildCard(camera) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.id = camera.id;
  card.dataset.spot = camera.spotId || "";

  const liveStack = document.createElement("div");
  liveStack.className = "live-stack";
  liveStack.hidden = true;

  const liveRow = document.createElement("div");
  liveRow.className = "live-row";

  const stillPanel = document.createElement("div");
  stillPanel.className = "still-panel";
  stillPanel.dataset.role = "still";
  stillPanel.innerHTML = `<div class="lbl">Live</div>`;

  const stillFrame = document.createElement("div");
  stillFrame.className = "frame";
  const stillLink = document.createElement("a");
  stillLink.href = camera.sourceUrl || camera.pageUrl;
  stillLink.target = "_blank";
  stillLink.rel = "noopener";
  stillLink.title = "Open source";
  const img = document.createElement("img");
  img.className = "still";
  img.alt = camera.name;
  img.decoding = "async";
  img.addEventListener("error", () => onStillError(stillPanel, camera, img));
  img.addEventListener("load", () => stillPanel.classList.remove("need-sub"));
  stillLink.appendChild(img);
  stillFrame.appendChild(stillLink);

  const windsurfUrl = camera.sourceUrl || camera.pageUrl;
  const providerUrl = camera.providerUrl || camera.altSourceUrl || "";
  const fallback = document.createElement("div");
  fallback.className = "fallback";
  fallback.innerHTML = `
    <p><strong>Subscription required</strong> to embed this media here.</p>
    <a class="btn" href="${escapeHtml(windsurfUrl)}" target="_blank" rel="noopener">Open on Windsurf</a>
    ${providerUrl ? `<a class="sec" href="${escapeHtml(providerUrl)}" target="_blank" rel="noopener">Or open provider source</a>` : ""}
    ${camera.liveEmbed ? `<a class="sec" href="${escapeHtml(camera.liveEmbed)}" target="_blank" rel="noopener">Open live player</a>` : ""}`;

  stillPanel.appendChild(stillFrame);
  stillPanel.appendChild(fallback);

  const chartPanel = document.createElement("div");
  chartPanel.className = "chart-panel";
  if (!camera.chartUrl) {
    chartPanel.hidden = true;
  } else {
    chartPanel.innerHTML = `<div class="lbl">windsurf.co.nz</div>`;
    const chartFrame = document.createElement("div");
    chartFrame.className = "frame";
    const chartA = document.createElement("a");
    chartA.href = camera.chartUrl;
    chartA.target = "_blank";
    chartA.rel = "noopener";
    const chartImg = document.createElement("img");
    chartImg.alt = `${camera.name} chart`;
    chartImg.dataset.role = "chart";
    chartImg.addEventListener("error", () => {
      chartPanel.hidden = true;
    });
    chartA.appendChild(chartImg);
    chartFrame.appendChild(chartA);
    chartPanel.appendChild(chartFrame);
  }

  liveRow.appendChild(stillPanel);
  liveRow.appendChild(chartPanel);
  liveStack.appendChild(liveRow);

  const report = document.createElement("div");
  report.className = "report";
  report.dataset.role = "report";

  const body = document.createElement("div");
  body.className = "body";
  const mapsView = `https://www.google.com/maps/search/?api=1&query=${camera.lat},${camera.lon}`;
  const mapsApple = `https://maps.apple.com/?ll=${camera.lat},${camera.lon}&q=${encodeURIComponent(camera.name)}`;
  const smsBody = encodeURIComponent(`${camera.name}: ${mapsView}`);
  body.innerHTML = `
    <h2><a href="${escapeHtml(camera.pageUrl)}" target="_blank" rel="noopener">${escapeHtml(camera.name)}</a></h2>
    <div class="dirs">${escapeHtml((camera.windDirs || []).join(" · ") || "any")}</div>
    <div class="badge-wrap">
      <span class="badge" tabindex="0">${escapeHtml(camera.spot)}</span>
      <div class="tip">${escapeHtml(camera.notes || "")}</div>
    </div>
    <div class="attr">Source: <a href="${escapeHtml(camera.sourceUrl || camera.pageUrl)}" target="_blank" rel="noopener">${escapeHtml(camera.sourceName || "Source")}</a>
      <div>
        <a class="btn-src" href="${escapeHtml(camera.sourceUrl || camera.pageUrl)}" target="_blank" rel="noopener">Open source</a>
        ${camera.providerUrl ? ` <a class="btn-src" href="${escapeHtml(camera.providerUrl)}" target="_blank" rel="noopener">Provider</a>` : ""}
        ${camera.liveEmbed ? ` <a class="btn-src" href="${escapeHtml(camera.liveEmbed)}" target="_blank" rel="noopener">Live player</a>` : ""}
      </div>
    </div>
    <div class="map-actions">
      <a class="primary" href="${mapsView}" target="_blank" rel="noopener">View map</a>
      <a href="${mapsApple}" target="_blank" rel="noopener">Apple Maps</a>
      <a href="sms:?&body=${smsBody}">Send to phone</a>
    </div>
    <div class="stamp" data-role="stamp"></div>`;

  card.appendChild(liveStack);
  card.appendChild(report);
  card.appendChild(body);
  return card;
}

function fillReport(card, camera) {
  const report = card.querySelector('[data-role="report"]');
  const c = camera.conditions;
  const fx = camera.forecast;
  const liveLine = c
    ? `${Math.round(c.effectiveWindKn ?? c.windSpeedKn)} kn ${c.windDir || ""}` +
      (c.windGustsKn ? ` · G${Math.round(c.windGustsKn)}` : "")
    : "—";
  const fxLine = fx ? `${fx.knMin}–${fx.knMax} kn ${fx.dirs}` : "—";
  const verdict = camera.verdict || { verdict: "FORECAST UNAVAILABLE", cls: "maybe" };
  report.innerHTML = `
    <div class="verdict ${verdict.cls}">${escapeHtml(verdict.verdict)}</div>
    <div class="row">
      <div class="box"><div class="lbl">Live now</div><div class="val">${escapeHtml(liveLine)}</div><div class="sub">Open-Meteo</div></div>
      <div class="box"><div class="lbl">Forecast</div><div class="val">${escapeHtml(fxLine)}</div><div class="sub">${escapeHtml(fx?.label || "—")}</div></div>
    </div>
    ${circlesHtml(camera.circles)}
    <div class="hint">Preferred: ${escapeHtml((camera.windDirs || []).join(" · ") || "any")}</div>
    ${notesHtml(camera.notes)}`;
}

function applyMode(card, camera, soft) {
  const view = viewMode();
  const liveStack = card.querySelector(".live-stack");
  const report = card.querySelector('[data-role="report"]');
  const stillPanel = card.querySelector('[data-role="still"]');
  const img = stillPanel.querySelector("img.still");
  const chartImg = card.querySelector('img[data-role="chart"]');
  const stamp = card.querySelector('[data-role="stamp"]');

  if (view === "forecast") {
    liveStack.hidden = true;
    report.hidden = false;
    skillToggle.hidden = false;
    return;
  }

  liveStack.hidden = false;
  report.hidden = true;
  skillToggle.hidden = true;
  stillPanel.classList.remove("need-sub");
  if (!soft) img.dataset.tried = "";
  if (camera.liveImage) {
    img.src = soft ? bust(camera.liveImage) : camera.liveImage;
  } else {
    stillPanel.classList.add("need-sub");
  }
  if (chartImg && camera.chartUrl) {
    chartImg.src = soft ? bust(camera.chartUrl) : camera.chartUrl;
  }
  stamp.textContent = `Live · ${new Date().toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}`;
}

function rideable(camera, skill) {
  if (skill === "all") return true;
  const row = camera.circles?.find((circle) => circle.skill === skill);
  return Boolean(row && ["blue", "green", "orange"].includes(row.fill));
}

function renderAdvice(notes) {
  if (!notes?.length) {
    adviceEl.hidden = true;
    return;
  }
  adviceEl.hidden = false;
  adviceEl.innerHTML =
    `<h2>General advice</h2>` +
    notes
      .map((note) => `<p><strong>${escapeHtml(note.title)}</strong> — ${escapeHtml(note.body)}</p>`)
      .join("");
}

function paint(soft) {
  if (!payload) return;
  const wind = windEl.value;
  const filter = filterEl.value;
  const view = viewMode();
  const skill = skillMode();
  const cameras = payload.cameras || [];
  const existing = new Map([...grid.querySelectorAll(".card")].map((card) => [card.dataset.id, card]));
  let visible = 0;

  skillKey.textContent = payload.key
    ? `${payload.key.layout}. ${payload.key.key}`
    : "Beginner · Intermediate · Advanced";
  renderAdvice(payload.generalNotes || []);

  for (const camera of cameras) {
    let card = existing.get(camera.id);
    if (!card) {
      card = buildCard(camera);
      grid.appendChild(card);
    }
    existing.delete(camera.id);
    fillReport(card, camera);
    const windOk = filter === "all" ? true : (camera.windDirs || []).includes(wind);
    const skillOk = view === "forecast" ? rideable(camera, skill) : true;
    const hide = !windOk || !skillOk;
    card.classList.toggle("hidden", hide);
    if (hide) continue;
    applyMode(card, camera, soft);
    visible += 1;
  }
  for (const leftover of existing.values()) leftover.remove();

  empty.hidden = visible > 0;
  status.textContent =
    view === "forecast"
      ? `Forecast · ${visible} spots · skill: ${skill}` + (filter === "all" ? "" : ` · wind ${wind}`)
      : `Live · ${visible} spots` + (filter === "all" ? "" : ` · wind ${wind}`);
  document.querySelectorAll(".chip").forEach((ch) => ch.classList.toggle("active", ch.dataset.dir === wind));
  pushShareState();
}

async function load(soft) {
  status.textContent = "Loading…";
  const params = new URLSearchParams({
    dir: windEl.value,
    skill: skillMode(),
    filter: filterEl.value
  });
  if (focusSpot) params.set("spot", focusSpot);
  try {
    const response = await fetch(`/api/live-forecast?${params}`);
    if (!response.ok) throw new Error("forecast failed");
    payload = await response.json();
    if (payload.dir && filterEl.value === "auto" && DIRS.includes(payload.dir) && !soft) {
      const fromUrl = stateFromLocation().dir;
      if (!fromUrl) windEl.value = payload.dir;
    }
  } catch (error) {
    console.error(error);
    const cameras = await fetch("/api/cameras").then((res) => res.json());
    payload = { cameras: cameras.cameras || [], links: cameras.links, generalNotes: [], key: null };
  }
  if (payload.links?.length) {
    stations.innerHTML =
      "Stations / sources: " +
      payload.links
        .map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.name)}</a>`)
        .join(" · ");
  }
  paint(soft);
}

function applyLocation() {
  const state = stateFromLocation();
  const viewInput = document.querySelector(`input[name="view"][value="${state.view}"]`);
  if (viewInput) viewInput.checked = true;
  const skill = state.skill === "expert" ? "advanced" : state.skill;
  const skillInput = document.querySelector(`input[name="skill"][value="${skill}"]`);
  if (skillInput) skillInput.checked = true;
  if (DIRS.includes(state.dir)) windEl.value = state.dir;
  if (state.filter) filterEl.value = state.filter;
  focusSpot = state.spot || "";
}

DIRS.forEach((dir) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.dataset.dir = dir;
  button.textContent = dir;
  button.addEventListener("click", () => {
    windEl.value = dir;
    paint(false);
  });
  chips.appendChild(button);
});

windEl.addEventListener("change", () => paint(false));
filterEl.addEventListener("change", () => paint(false));
document.querySelectorAll('input[name="view"]').forEach((input) => {
  input.addEventListener("change", () => paint(false));
});
document.querySelectorAll('input[name="skill"]').forEach((input) => {
  input.addEventListener("change", () => paint(false));
});
document.getElementById("refresh").addEventListener("click", () => {
  tick += 1;
  load(true);
});

const zoomEl = document.getElementById("zoom");
const zoomVal = document.getElementById("zoomVal");
function applyZoom() {
  const height = Number(zoomEl.value) || 220;
  document.documentElement.style.setProperty("--media-h", `${height}px`);
  document.documentElement.style.setProperty("--card-min", `${Math.max(320, Math.round(height * 1.55))}px`);
  zoomVal.textContent = `${height}px`;
  try {
    localStorage.setItem("kan-media-h", String(height));
  } catch {
    /* ignore */
  }
}
try {
  const saved = localStorage.getItem("kan-media-h");
  if (saved) zoomEl.value = saved;
} catch {
  /* ignore */
}
zoomEl.addEventListener("input", applyZoom);
applyZoom();
applyLocation();
load(false);
setInterval(() => {
  tick += 1;
  load(true);
}, 120000);
