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
const notesModal = document.getElementById("notesModal");
const notesModalTitle = document.getElementById("notesModalTitle");
const notesModalBody = document.getElementById("notesModalBody");
const notesModalFull = document.getElementById("notesModalFull");

const FAV_KEY = "kan-favourites";
const MATES_KEY = "kan-mates";
const SORT_KEY = "kan-sort";

let payload = null;
let tick = 0;
let focusSpot = "";
let sortMode = { sort: "alpha", dir: "asc" };
const cameraById = new Map();

function viewMode() {
  return document.querySelector('input[name="view"]:checked')?.value || "forecast";
}

function skillMode() {
  return document.querySelector('input[name="skill"]:checked')?.value || "all";
}

function isAutoWind() {
  return filterEl.value === "auto";
}

function bust(url) {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${tick}`;
}

function readJsonSet(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeJsonSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function readMates() {
  try {
    const raw = JSON.parse(localStorage.getItem(MATES_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeMates(map) {
  try {
    localStorage.setItem(MATES_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function favourites() {
  return readJsonSet(FAV_KEY);
}

function spotKey(camera) {
  return camera.spotId || camera.id;
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
    filter: url.searchParams.get("filter") || "",
    sort: url.searchParams.get("sort") || ""
  };
}

function pushShareState() {
  const view = viewMode();
  const skill = skillMode();
  const dir = windEl.value;
  const filter = filterEl.value;
  const params = new URLSearchParams();
  if (dir && !isAutoWind()) params.set("dir", dir);
  if (skill && skill !== "all") params.set("skill", skill);
  if (filter && filter !== "auto") params.set("filter", filter);
  if (focusSpot) params.set("spot", focusSpot);
  if (sortMode.sort && sortMode.sort !== "alpha") params.set("sort", sortMode.sort);
  const path = view === "live" ? "/live" : "/forecast";
  const qs = params.toString();
  history.replaceState({ view, skill, dir, filter }, "", `${path}${qs ? `?${qs}` : ""}`);
  document.title =
    view === "live"
      ? `KAN Live · ${dir} — Auckland kitesurf cameras`
      : `KAN Forecast · ${skill} — Auckland kitesurf`;
}

function syncWindControls() {
  const auto = isAutoWind();
  windEl.disabled = auto;
  chips.classList.toggle("disabled", auto);
  chips.querySelectorAll("button").forEach((button) => {
    button.disabled = auto;
  });
  windEl.title = auto ? "Locked while Auto (match wind) is selected" : "";
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

function summaryFor(camera) {
  return camera.notesSummary || camera.tip || camera.localTips || "No notes yet for this spot.";
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

function directionsUrl(camera) {
  return `https://www.google.com/maps/dir/?api=1&destination=${camera.lat},${camera.lon}`;
}

function appleDirectionsUrl(camera) {
  return `https://maps.apple.com/?daddr=${camera.lat},${camera.lon}&q=${encodeURIComponent(camera.name)}`;
}

function bindNotesBadge(badge, camera) {
  let pressTimer = null;
  let lastTap = 0;
  let longPressed = false;

  const showTip = () => badge.parentElement?.classList.add("tip-open");
  const hideTip = () => badge.parentElement?.classList.remove("tip-open");

  badge.addEventListener("mouseenter", showTip);
  badge.addEventListener("mouseleave", hideTip);
  badge.addEventListener("focus", showTip);
  badge.addEventListener("blur", hideTip);

  badge.addEventListener("click", (event) => {
    event.preventDefault();
    const now = Date.now();
    if (now - lastTap < 350) {
      lastTap = 0;
      window.location.href = `/notes?spot=${encodeURIComponent(spotKey(camera))}`;
      return;
    }
    lastTap = now;
    window.setTimeout(() => {
      if (Date.now() - lastTap >= 340 && lastTap) {
        openNotesModal(camera);
        lastTap = 0;
      }
    }, 340);
  });

  badge.addEventListener("pointerdown", () => {
    longPressed = false;
    pressTimer = window.setTimeout(() => {
      longPressed = true;
      openNotesModal(camera);
    }, 550);
    showTip();
  });
  const clearPress = () => {
    if (pressTimer) window.clearTimeout(pressTimer);
    pressTimer = null;
    hideTip();
  };
  badge.addEventListener("pointerup", clearPress);
  badge.addEventListener("pointerleave", clearPress);
  badge.addEventListener("pointercancel", clearPress);
  badge.addEventListener("contextmenu", (event) => {
    if (longPressed) event.preventDefault();
  });
}

function openNotesModal(camera) {
  const key = spotKey(camera);
  notesModalTitle.textContent = `${camera.name} — notes`;
  notesModalFull.href = `/notes?spot=${encodeURIComponent(key)}`;
  const parts = [];
  if (camera.tip) parts.push(`<p class="modal-tip"><strong>Camera tip:</strong> ${escapeHtml(camera.tip)}</p>`);
  if (camera.localTips) parts.push(`<p><strong>Local tips:</strong> ${escapeHtml(camera.localTips)}</p>`);
  if (camera.launchLand) parts.push(`<p><strong>Launch / land:</strong> ${escapeHtml(camera.launchLand)}</p>`);
  if (camera.parking) parts.push(`<p><strong>Parking:</strong> ${escapeHtml(camera.parking)}</p>`);
  if (camera.bestTide) parts.push(`<p><strong>Best tide:</strong> ${escapeHtml(camera.bestTide)}</p>`);
  if (camera.hazards?.length) {
    parts.push(
      `<p><strong>Hazards:</strong></p><ul>${camera.hazards.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`
    );
  }
  if (camera.notes?.length) {
    parts.push("<p><strong>Saved notes</strong></p>");
    parts.push(
      camera.notes
        .map(
          (note) =>
            `<article class="modal-note"><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.body)}</p></article>`
        )
        .join("")
    );
  } else if (!parts.length) {
    parts.push(`<p class="muted">No notes yet. <a href="/notes?spot=${encodeURIComponent(key)}">Add one</a>.</p>`);
  }
  notesModalBody.innerHTML = parts.join("");
  if (typeof notesModal.showModal === "function") notesModal.showModal();
  else notesModal.setAttribute("open", "");
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
  const sourceHref = camera.sourceUrl || camera.pageUrl;
  const sourceLabel = camera.sourceName || "Source";
  const mapsSms = encodeURIComponent(`${camera.name}: ${directionsUrl(camera)}`);
  const fav = favourites().has(spotKey(camera));
  const mates = readMates()[spotKey(camera)] || 0;

  body.innerHTML = `
    <div class="title-row" data-role="title-row">
      <h2 class="spot-name"><a href="${escapeHtml(camera.pageUrl)}" target="_blank" rel="noopener">${escapeHtml(camera.name)}</a></h2>
      <div class="verdict maybe" data-role="verdict">—</div>
    </div>
    <div class="dirs">${escapeHtml((camera.windDirs || []).join(" · ") || "any")}</div>
    <div class="meta-row">
      <button type="button" class="fav-btn${fav ? " on" : ""}" data-role="fav" aria-pressed="${fav}" title="Toggle favourite">★</button>
      <button type="button" class="mates-btn" data-role="mates" title="Mates here">👥 ${mates}</button>
      <span class="travel" data-role="travel"></span>
    </div>
    <div class="badge-wrap">
      <button type="button" class="badge notes-badge" data-role="notes-badge">Notes</button>
      <div class="tip" data-role="notes-tip"></div>
    </div>
    <div class="attr">
      <a class="btn-src source-go" href="${escapeHtml(sourceHref)}" target="_blank" rel="noopener">${escapeHtml(sourceLabel)} <span aria-hidden="true">→</span></a>
      ${providerUrl ? `<a class="btn-src" href="${escapeHtml(providerUrl)}" target="_blank" rel="noopener">Provider →</a>` : ""}
      ${camera.liveEmbed ? `<a class="btn-src" href="${escapeHtml(camera.liveEmbed)}" target="_blank" rel="noopener">Live player →</a>` : ""}
    </div>
    <div class="map-actions">
      <a class="primary" href="${directionsUrl(camera)}" target="_blank" rel="noopener">Directions</a>
      <a href="${appleDirectionsUrl(camera)}" target="_blank" rel="noopener">Apple Maps</a>
      <a href="sms:?&body=${mapsSms}">Send to phone</a>
    </div>
    <div class="stamp" data-role="stamp"></div>`;

  const badge = body.querySelector('[data-role="notes-badge"]');
  bindNotesBadge(badge, camera);

  body.querySelector('[data-role="fav"]').addEventListener("click", () => {
    const set = favourites();
    const key = spotKey(camera);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    writeJsonSet(FAV_KEY, set);
    paint(true);
  });

  body.querySelector('[data-role="mates"]').addEventListener("click", () => {
    const map = readMates();
    const key = spotKey(camera);
    map[key] = (Number(map[key]) || 0) + 1;
    writeMates(map);
    paint(true);
  });

  card.appendChild(liveStack);
  card.appendChild(report);
  card.appendChild(body);
  return card;
}

function fillReport(card, camera) {
  const report = card.querySelector('[data-role="report"]');
  const verdictEl = card.querySelector('[data-role="verdict"]');
  const tipEl = card.querySelector('[data-role="notes-tip"]');
  const travelEl = card.querySelector('[data-role="travel"]');
  const favBtn = card.querySelector('[data-role="fav"]');
  const matesBtn = card.querySelector('[data-role="mates"]');
  const c = camera.conditions;
  const fx = camera.forecast;
  const liveLine = c
    ? `${Math.round(c.effectiveWindKn ?? c.windSpeedKn)} kn ${c.windDir || ""}` +
      (c.windGustsKn ? ` · G${Math.round(c.windGustsKn)}` : "")
    : "—";
  const fxLine = fx ? `${fx.knMin}–${fx.knMax} kn ${fx.dirs}` : "—";
  const verdict = camera.verdict || { verdict: "FORECAST UNAVAILABLE", cls: "maybe" };

  if (verdictEl) {
    verdictEl.className = `verdict ${verdict.cls}`;
    verdictEl.textContent = verdict.verdict;
  }
  if (tipEl) tipEl.textContent = summaryFor(camera);
  if (travelEl) {
    const bits = [];
    if (camera.travelFromCbdMin != null) bits.push(`${camera.travelFromCbdMin} min`);
    if (camera.travelKm != null) bits.push(`${camera.travelKm} km`);
    travelEl.textContent = bits.length ? bits.join(" · ") : "";
  }
  if (favBtn) {
    const on = favourites().has(spotKey(camera));
    favBtn.classList.toggle("on", on);
    favBtn.setAttribute("aria-pressed", String(on));
  }
  if (matesBtn) matesBtn.textContent = `👥 ${readMates()[spotKey(camera)] || 0}`;

  report.innerHTML = `
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
  const verdictEl = card.querySelector('[data-role="verdict"]');

  if (view === "forecast") {
    liveStack.hidden = true;
    report.hidden = false;
    skillToggle.hidden = false;
    if (verdictEl) verdictEl.hidden = false;
    return;
  }

  liveStack.hidden = false;
  report.hidden = true;
  skillToggle.hidden = true;
  if (verdictEl) verdictEl.hidden = true;
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

function sortCameras(cameras) {
  const fav = favourites();
  const mates = readMates();
  const dirMul = sortMode.dir === "desc" ? -1 : 1;
  const list = [...cameras];

  const value = (camera) => {
    switch (sortMode.sort) {
      case "travel-time":
        return camera.travelFromCbdMin ?? 9999;
      case "travel-km":
        return camera.travelKm ?? 9999;
      case "on":
        return camera.onScore ?? -99;
      case "favourite":
        return fav.has(spotKey(camera)) ? 1 : 0;
      case "popular":
        return camera.popularity ?? 0;
      case "mates":
        return Number(mates[spotKey(camera)]) || 0;
      case "alpha":
      default:
        return String(camera.name || "").toLowerCase();
    }
  };

  list.sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv), "en") * dirMul;
    }
    if (av === bv) return String(a.name).localeCompare(String(b.name), "en");
    return (av - bv) * dirMul;
  });
  return list;
}

function paint(soft) {
  if (!payload) return;
  const wind = windEl.value;
  const filter = filterEl.value;
  const view = viewMode();
  const skill = skillMode();
  const cameras = sortCameras(payload.cameras || []);
  const existing = new Map([...grid.querySelectorAll(".card")].map((card) => [card.dataset.id, card]));
  let visible = 0;

  skillKey.textContent = payload.key
    ? `${payload.key.layout}. ${payload.key.key}`
    : "Beginner · Intermediate · Advanced";
  renderAdvice(payload.generalNotes || []);
  cameraById.clear();

  for (const camera of cameras) {
    cameraById.set(camera.id, camera);
    let card = existing.get(camera.id);
    if (!card) {
      card = buildCard(camera);
      grid.appendChild(card);
    } else {
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
      ? `Forecast · ${visible} spots · skill: ${skill}` +
        (filter === "all" ? "" : ` · wind ${wind}`) +
        ` · sort ${sortMode.sort}`
      : `Live · ${visible} spots` + (filter === "all" ? "" : ` · wind ${wind}`) + ` · sort ${sortMode.sort}`;
  document.querySelectorAll(".chip").forEach((ch) => ch.classList.toggle("active", ch.dataset.dir === wind));
  syncWindControls();
  pushShareState();
}

async function load(soft) {
  status.textContent = "Loading…";
  syncWindControls();
  const params = new URLSearchParams({
    skill: skillMode(),
    filter: filterEl.value
  });
  if (!isAutoWind() && windEl.value) params.set("dir", windEl.value);
  if (focusSpot) params.set("spot", focusSpot);
  try {
    const response = await fetch(`/api/live-forecast?${params}`);
    if (!response.ok) throw new Error("forecast failed");
    payload = await response.json();
    if (payload.dir && DIRS.includes(payload.dir)) {
      if (isAutoWind() || !stateFromLocation().dir) windEl.value = payload.dir;
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
  if (state.sort) {
    sortMode = { sort: state.sort, dir: state.sort === "alpha" || state.sort.startsWith("travel") ? "asc" : "desc" };
  } else {
    try {
      const saved = JSON.parse(localStorage.getItem(SORT_KEY) || "null");
      if (saved?.sort) sortMode = saved;
    } catch {
      /* ignore */
    }
  }
  document.querySelectorAll(".sort-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.sort === sortMode.sort);
  });
}

DIRS.forEach((dir) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.dataset.dir = dir;
  button.textContent = dir;
  button.addEventListener("click", () => {
    if (isAutoWind()) return;
    windEl.value = dir;
    load(false);
  });
  chips.appendChild(button);
});

windEl.addEventListener("change", () => {
  if (isAutoWind()) return;
  load(false);
});
filterEl.addEventListener("change", () => {
  syncWindControls();
  load(false);
});
document.querySelectorAll('input[name="view"]').forEach((input) => {
  input.addEventListener("change", () => paint(false));
});
document.querySelectorAll('input[name="skill"]').forEach((input) => {
  input.addEventListener("change", () => load(false));
});
document.getElementById("refresh").addEventListener("click", () => {
  tick += 1;
  load(true);
});

document.querySelectorAll(".sort-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const next = button.dataset.sort;
    if (sortMode.sort === next) {
      sortMode.dir = sortMode.dir === "asc" ? "desc" : "asc";
    } else {
      sortMode = {
        sort: next,
        dir: next === "alpha" || next.startsWith("travel") ? "asc" : "desc"
      };
    }
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.sort === sortMode.sort);
    });
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify(sortMode));
    } catch {
      /* ignore */
    }
    paint(true);
  });
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
syncWindControls();
load(false);
setInterval(() => {
  tick += 1;
  load(true);
}, 120000);
