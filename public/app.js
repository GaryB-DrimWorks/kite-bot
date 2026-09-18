const filters = document.getElementById("filters");
const modesNav = document.getElementById("modes");
let currentMode = "ride";
let overview = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paramsFromForm() {
  const data = new FormData(filters);
  const query = new URLSearchParams();
  for (const [key, value] of data.entries()) {
    if (String(value).trim()) query.set(key, String(value).trim());
  }
  if (query.get("time")) {
    query.set("time", new Date(query.get("time")).toISOString());
  }
  return query;
}

function fillSelect(id, items, valueKey, labelKey, selected) {
  const node = document.getElementById(id);
  node.innerHTML = items
    .map((item) => {
      const value = item[valueKey];
      const label = item[labelKey];
      return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
    })
    .join("");
}

function scoreClass(rating) {
  return rating || "maybe";
}

function renderNow(data) {
  const top = data.ranked[0];
  const c = top?.conditions;
  if (!c) {
    document.getElementById("now-card").textContent = "No conditions yet.";
    return;
  }
  document.getElementById("now-card").innerHTML = `
    <p class="eyebrow">Now · ${data.location.name}</p>
    <p><strong>${Math.round(c.windSpeedKn)} kn</strong> from ${Math.round(c.windDirection)}°
      · effective <strong>${c.effectiveWindKn} kn</strong></p>
    <p>Gusts ${Number.isFinite(c.windGustsKn) ? Math.round(c.windGustsKn) : "–"} kn
      · gust factor ${c.gustFactor ? c.gustFactor.toFixed(2) : "–"}
      · dir σ ${c.directionVariabilityDeg}°</p>
    <p>${Math.round(c.temperatureC)}°C · ${Math.round(c.humidityPct)}% RH · ${Math.round(c.pressureHpa)} hPa</p>
    <p>Reliability ${data.reliability?.score ?? "n/a"}/100</p>
  `;
}

function renderSpots(data) {
  document.getElementById("spots").innerHTML = data.ranked
    .map((row) => {
      return `<button class="spot" data-spot="${row.spotId}" type="button">
        <span class="score ${scoreClass(row.rating)}">${row.score}</span>
        <span>
          <strong>${row.name}</strong><br>
          <span class="muted">${row.rating} · ${row.travelFromCbdMin} min from CBD · ${row.coast}</span>
        </span>
        <span class="muted">${row.conditions?.effectiveWindKn ?? "–"} kn</span>
      </button>`;
    })
    .join("");
}

function renderFocus(data) {
  const focus = data.focus;
  if (!focus) return;
  const tide = data.tide;
  document.getElementById("focus").innerHTML = `
    <p><strong>${focus.name}</strong> · ${focus.score}/100 · ${focus.rating}</p>
    <p>Effective ${focus.conditions.effectiveWindKn} kn from ${Math.round(focus.conditions.windDirection)}°</p>
    <p>Waves ${focus.conditions.waveHeightM ?? "n/a"} m · chop ${focus.conditions.windWaveHeightM ?? "n/a"} m · current ${focus.conditions.currentSpeedKn} kn</p>
    <p>Tide: ${tide ? `${tide.heightM} m · ${tide.stage} · ${tide.source}` : "n/a"}</p>
    ${tide?.warning ? `<p class="warn">${tide.warning}</p>` : ""}
    <ul>${focus.reasons.map((reason) => `<li>${reason}</li>`).join("")}</ul>
  `;

  const safety = data.safety;
  document.getElementById("safety").innerHTML = `
    <p class="${safety.level === "ok" ? "ok" : "warn"}">${safety.level === "ok" ? "No hard stoppers in the numbers." : "Read the warnings."}</p>
    <ul>${(safety.warnings.length ? safety.warnings : safety.general).map((item) => `<li>${item}</li>`).join("")}</ul>
    <p class="muted">${safety.tips.slice(0, 3).join(" ")}</p>
  `;

  document.getElementById("windows").innerHTML = data.windows.length
    ? `<ul>${data.windows.map((hour) => `<li>${hour.time.replace("T", " ")} · ${Math.round(hour.windSpeedKn)} kn</li>`).join("")}</ul>`
    : `<p class="muted">No clean windows on this profile in the next modelled hours.</p>`;

  document.getElementById("virtual").innerHTML = `
    <p>Planning as <strong>${data.profile.label}</strong> on <strong>${data.discipline.label}</strong>.</p>
    <p>Top pick: ${focus.name}. Travel ${focus.travelFromCbdMin} min. ${focus.reasons[0]}</p>
  `;

  document.getElementById("atmosphere").innerHTML = `
    <p>Pressure ${Math.round(focus.conditions.pressureHpa)} hPa</p>
    <p>Temperature ${Math.round(focus.conditions.temperatureC)}°C</p>
    <p>Humidity ${Math.round(focus.conditions.humidityPct)}%</p>
    <p>Direction variability ${focus.conditions.directionVariabilityDeg}°</p>
    <p>Gust factor ${focus.conditions.gustFactor ? focus.conditions.gustFactor.toFixed(2) : "n/a"}</p>
  `;

  document.getElementById("rnd").innerHTML = `
    <p><strong>${data.reliability?.score ?? "n/a"}/100</strong> model agreement</p>
    <p>${data.reliability?.detail || ""}</p>
    <p class="muted">R&amp;D view uses ECMWF vs GFS wind for Auckland. Forecast-vs-actual logs collect as the app runs.</p>
  `;

  document.getElementById("gear-advice").textContent = data.lostGearAdvice.steps.join(" ");
}

function listHtml(items, render) {
  if (!items.length) return `<p class="muted">Nothing here yet.</p>`;
  return items.map(render).join("");
}

function renderLists(data) {
  document.getElementById("forecast").textContent = data.daily.text;
  document.getElementById("reports").innerHTML = listHtml(
    data.reports,
    (row) => `<li><strong>${escapeHtml(row.author || "anon")}</strong> at ${escapeHtml(row.spotId || "general")}: ${escapeHtml(row.summary)}</li>`
  );
  document.getElementById("gear").innerHTML = listHtml(
    data.lostGear,
    (row) => `<li><strong>${escapeHtml(row.item)}</strong> — ${escapeHtml(row.notes || "")} (${escapeHtml(row.status)})</li>`
  );
  document.getElementById("knowledge").innerHTML = listHtml(
    data.knowledge,
    (row) => `<article class="knowledge-item"><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.body)}</p><p class="muted">${escapeHtml(row.topic)}</p></article>`
  );
  document.getElementById("sponsors").innerHTML = listHtml(
    data.sponsors,
    (row) => `<li><strong>${escapeHtml(row.name)}</strong> — ${escapeHtml(row.discount || "member rates")}</li>`
  );
}

function applyMode() {
  document.querySelectorAll("[data-show]").forEach((section) => {
    const modes = section.getAttribute("data-show").split(",");
    section.hidden = !modes.includes(currentMode);
  });
  modesNav.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-current", button.dataset.mode === currentMode ? "true" : "false");
  });
}

function renderModes(data) {
  modesNav.innerHTML = data.perspectives.modes
    .map((mode) => `<button type="button" data-mode="${mode.id}">${mode.label}</button>`)
    .join("");
}

async function load() {
  const response = await fetch(`/api/overview?${paramsFromForm().toString()}`);
  if (!response.ok) throw new Error("overview failed");
  overview = await response.json();
  const selected = Object.fromEntries(paramsFromForm());
  fillSelect("discipline", overview.perspectives.disciplines, "id", "label", selected.discipline || "kite");
  fillSelect("profile", overview.perspectives.profiles, "id", "label", selected.profile || "beginner-self");
  const spotSelect = document.getElementById("spot");
  const currentSpot = selected.spot || "";
  spotSelect.innerHTML = `<option value="">Best match</option>` + overview.spots
    .map((spot) => `<option value="${spot.id}" ${spot.id === currentSpot ? "selected" : ""}>${spot.name}</option>`)
    .join("");
  renderModes(overview);
  renderNow(overview);
  renderSpots(overview);
  renderFocus(overview);
  renderLists(overview);
  applyMode();
  const keys = await fetch("/api/settings").then((res) => res.json());
  document.getElementById("keys-status").textContent =
    `NIWA tides ${keys.niwaTideConfigured ? "on" : "off"} · Stormglass ${keys.stormglassConfigured ? "on" : "off"}`;
}

function formPost(id, url) {
  document.getElementById(id).addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());
    data.groupOnly = Boolean(form.groupOnly?.checked);
    data.groupId = document.getElementById("group").value.trim();
    data.spotId = document.getElementById("spot").value;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      alert("Could not save that.");
      return;
    }
    form.reset();
    await load();
  });
}

filters.addEventListener("submit", async (event) => {
  event.preventDefault();
  await load();
});

modesNav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");
  if (!button) return;
  currentMode = button.dataset.mode;
  applyMode();
});

document.getElementById("spots").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-spot]");
  if (!button) return;
  document.getElementById("spot").value = button.dataset.spot;
  await load();
});

formPost("report-form", "/api/condition-reports");
formPost("gear-form", "/api/lost-gear");
formPost("knowledge-form", "/api/knowledge");
formPost("sponsor-form", "/api/sponsors");
formPost("spot-form", "/api/spots");

document.getElementById("keys-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {};
  if (data.niwaTideApiKey) payload.niwaTideApiKey = data.niwaTideApiKey;
  if (data.stormglassApiKey) payload.stormglassApiKey = data.stormglassApiKey;
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    alert("Could not save keys.");
    return;
  }
  form.reset();
  await load();
});

load().catch((error) => {
  console.error(error);
  document.getElementById("now-card").textContent =
    "Could not load conditions. Check the weather service and try again.";
});
