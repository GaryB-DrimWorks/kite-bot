const form = document.getElementById("note-form");
const list = document.getElementById("note-list");
const status = document.getElementById("note-status");
const ioStatus = document.getElementById("io-status");
const kindEl = document.getElementById("note-kind");
const spotEl = document.getElementById("note-spot");
const filterSpot = document.getElementById("filter-spot");
const filterSkill = document.getElementById("filter-skill");
const filterNew = document.getElementById("filter-new");

let cachedNotes = [];
let spotOptions = [];

function querySpot() {
  return new URL(window.location.href).searchParams.get("spot") || "";
}

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
  spotOptions = unique;
  const options = unique
    .map((spot) => `<option value="${escapeHtml(spot.id)}">${escapeHtml(spot.name)}</option>`)
    .join("");
  spotEl.innerHTML = options;
  filterSpot.innerHTML = `<option value="">All spots + general</option>` + options;
  const fromUrl = querySpot();
  if (fromUrl) {
    filterSpot.value = fromUrl;
    if ([...spotEl.options].some((opt) => opt.value === fromUrl)) {
      kindEl.value = "spot";
      spotEl.value = fromUrl;
    }
  }
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
  cachedNotes = data.notes || [];
  if (!cachedNotes.length) {
    list.innerHTML = `<p class="muted">Nothing here yet.</p>`;
    return;
  }
  list.innerHTML = cachedNotes
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
  const fromUrl = querySpot();
  if (fromUrl && [...spotEl.options].some((opt) => opt.value === fromUrl)) {
    kindEl.value = "spot";
    spotEl.value = fromUrl;
  }
  applyKind();
}

function notesToMarkdown(notes) {
  return notes
    .map((note) => {
      const tags = (note.audience || []).join(", ");
      return [
        `# ${note.title}`,
        "",
        `- kind: ${note.kind}`,
        `- type: ${note.type}`,
        note.spotId ? `- spotId: ${note.spotId}` : null,
        tags ? `- audience: ${tags}` : null,
        note.author ? `- author: ${note.author}` : null,
        "",
        note.body,
        ""
      ]
        .filter((line) => line != null)
        .join("\n");
    })
    .join("\n---\n\n");
}

function notesToHtml(notes) {
  const articles = notes
    .map((note) => {
      const meta = [
        `kind=${escapeHtml(note.kind)}`,
        `type=${escapeHtml(note.type)}`,
        note.spotId ? `spotId=${escapeHtml(note.spotId)}` : "",
        note.audience?.length ? `audience=${escapeHtml(note.audience.join(","))}` : "",
        note.author ? `author=${escapeHtml(note.author)}` : ""
      ]
        .filter(Boolean)
        .join(" ");
      return `<article data-note ${meta}>
  <h2>${escapeHtml(note.title)}</h2>
  <p>${escapeHtml(note.body).replaceAll("\n", "<br>")}</p>
</article>`;
    })
    .join("\n\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>KAN spot notes</title></head>
<body>
${articles}
</body></html>
`;
}

function downloadBlob(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseMarkdownNotes(text) {
  const chunks = text.split(/\n---\n/).map((chunk) => chunk.trim()).filter(Boolean);
  const notes = [];
  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/);
    let title = "";
    const meta = {};
    let bodyStart = 0;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!title && line.startsWith("# ")) {
        title = line.slice(2).trim();
        continue;
      }
      const match = line.match(/^- ([a-zA-Z]+):\s*(.*)$/);
      if (match) {
        meta[match[1]] = match[2].trim();
        bodyStart = i + 1;
        continue;
      }
      if (line.trim() === "" && Object.keys(meta).length) {
        bodyStart = i + 1;
        break;
      }
    }
    const body = lines.slice(bodyStart).join("\n").trim();
    if (!title || !body) continue;
    notes.push({
      title,
      body,
      kind: meta.kind === "spot" ? "spot" : "general",
      type: meta.type === "note" ? "note" : "advice",
      spotId: meta.spotId || "",
      audience: meta.audience ? meta.audience.split(",").map((s) => s.trim()).filter(Boolean) : [],
      author: meta.author || "import"
    });
  }
  return notes;
}

function parseHtmlNotes(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const articles = [...doc.querySelectorAll("article[data-note], article")];
  return articles
    .map((article) => {
      const title =
        article.querySelector("h1, h2, h3")?.textContent?.trim() ||
        article.getAttribute("title") ||
        "";
      const bodyEl = article.querySelector("p");
      const body = (bodyEl?.innerText || article.textContent || "")
        .replace(title, "")
        .trim();
      if (!title || !body) return null;
      return {
        title: title.slice(0, 120),
        body: body.slice(0, 4000),
        kind: article.getAttribute("kind") === "spot" || article.getAttribute("data-kind") === "spot" ? "spot" : "general",
        type: article.getAttribute("type") === "note" ? "note" : "advice",
        spotId: article.getAttribute("spotId") || article.getAttribute("data-spot") || filterSpot.value || "",
        audience: String(article.getAttribute("audience") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        author: article.getAttribute("author") || "import"
      };
    })
    .filter(Boolean);
}

async function importNotes(parsed) {
  if (!parsed.length) {
    ioStatus.textContent = "No notes found in that file.";
    return;
  }
  let ok = 0;
  for (const note of parsed) {
    if (note.kind === "spot" && !note.spotId) {
      note.spotId = filterSpot.value || spotEl.value || spotOptions[0]?.id || "";
    }
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note)
    });
    if (response.ok) ok += 1;
  }
  ioStatus.textContent = `Imported ${ok} of ${parsed.length}.`;
  await loadNotes();
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
  const params = new URLSearchParams(location.search);
  if (filterSpot.value) params.set("spot", filterSpot.value);
  else params.delete("spot");
  history.replaceState({}, "", `${location.pathname}${params.toString() ? `?${params}` : ""}`);
  await loadNotes();
});
list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  const note = await fetch(`/api/notes/${button.dataset.id}`).then((res) => res.json());
  fillForm(note);
});

document.getElementById("export-md").addEventListener("click", () => {
  downloadBlob("kan-notes.md", notesToMarkdown(cachedNotes), "text/markdown");
  ioStatus.textContent = `Exported ${cachedNotes.length} notes as Markdown.`;
});
document.getElementById("export-html").addEventListener("click", () => {
  downloadBlob("kan-notes.html", notesToHtml(cachedNotes), "text/html");
  ioStatus.textContent = `Exported ${cachedNotes.length} notes as HTML.`;
});
document.getElementById("import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const lower = file.name.toLowerCase();
  const parsed =
    lower.endsWith(".html") || lower.endsWith(".htm") || text.trim().startsWith("<")
      ? parseHtmlNotes(text)
      : parseMarkdownNotes(text);
  await importNotes(parsed);
  event.target.value = "";
});

loadSpots().then(() => {
  applyKind();
  return loadNotes();
});
