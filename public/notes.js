const form = document.getElementById("note-form");
const list = document.getElementById("note-list");
const status = document.getElementById("note-status");
const kindEl = document.getElementById("note-kind");
const spotEl = document.getElementById("note-spot");
const filterSpot = document.getElementById("filter-spot");
const filterSkill = document.getElementById("filter-skill");
const filterNew = document.getElementById("filter-new");

async function loadSpots() {
  const data = await fetch("/api/cameras").then((res) => res.json());
  const unique = [];
  const seen = new Set();
  for (const camera of data.cameras || []) {
    const id = camera.spotId || camera.id;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push({ id, name: camera.spot || camera.name });
  }
  const options = unique
    .map((spot) => `<option value="${escapeHtml(spot.id)}">${escapeHtml(spot.name)}</option>`)
    .join("");
  spotEl.innerHTML = options;
  filterSpot.innerHTML = `<option value="">All spots + general</option>` + options;
}

function selectedAudience(root = form) {
  return [...root.querySelectorAll('input[name="audience"]:checked')].map((input) => input.value);
}

function applyKind() {
  spotEl.disabled = kindEl.value !== "spot";
}

async function loadNotes() {
  const params = new URLSearchParams();
  if (filterSpot.value) params.set("spot", filterSpot.value);
  if (filterSkill.value && filterSkill.value !== "all") params.set("skill", filterSkill.value);
  if (filterNew.checked) params.set("newToSpot", "1");
  const data = await fetch(`/api/notes?${params}`).then((res) => res.json());
  if (!data.notes?.length) {
    list.innerHTML = `<p class="muted">Nothing here yet.</p>`;
    return;
  }
  list.innerHTML = data.notes
    .map((note) => {
      const tags = (note.audience || []).join(" · ") || "all";
      return `<button class="note-row" type="button" data-id="${escapeHtml(note.id)}">
        <strong>${escapeHtml(note.title)}</strong>
        <span class="muted">${escapeHtml(note.kind)} · ${escapeHtml(note.type)} · ${escapeHtml(note.spotId || "general")} · ${escapeHtml(tags)}</span>
        <span>${escapeHtml(note.body)}</span>
      </button>`;
    })
    .join("");
}

function fillForm(note) {
  form.elements.id.value = note.id;
  form.elements.kind.value = note.kind;
  form.elements.type.value = note.type;
  form.elements.spotId.value = note.spotId || spotEl.value;
  form.elements.title.value = note.title;
  form.elements.body.value = note.body;
  form.elements.author.value = note.author || "";
  form.querySelectorAll('input[name="audience"]').forEach((input) => {
    input.checked = (note.audience || []).includes(input.value);
  });
  document.getElementById("form-title").textContent = "Edit note";
  applyKind();
}

function resetForm() {
  form.reset();
  form.elements.id.value = "";
  document.getElementById("form-title").textContent = "New note";
  applyKind();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    kind: form.elements.kind.value,
    type: form.elements.type.value,
    spotId: form.elements.spotId.value,
    title: form.elements.title.value,
    body: form.elements.body.value,
    author: form.elements.author.value,
    audience: selectedAudience()
  };
  const id = form.elements.id.value;
  const response = await fetch(id ? `/api/notes/${id}` : "/api/notes", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    status.textContent = err.error || "Could not save.";
    return;
  }
  status.textContent = id ? "Updated." : "Saved.";
  resetForm();
  await loadNotes();
});

document.getElementById("note-reset").addEventListener("click", resetForm);
kindEl.addEventListener("change", applyKind);
document.getElementById("note-filters").addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadNotes();
});
list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  const note = await fetch(`/api/notes/${button.dataset.id}`).then((res) => res.json());
  fillForm(note);
});

loadSpots().then(() => {
  applyKind();
  return loadNotes();
});
