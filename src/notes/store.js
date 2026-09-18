import { addRecord, getRecord, listRecords, updateRecord } from "../database/client.js";

export const AUDIENCE_TAGS = ["beginner", "intermediate", "advanced", "new-to-spot"];
export const NOTE_KINDS = ["general", "spot"];
export const NOTE_TYPES = ["note", "advice"];

function asBool(value) {
  return value === true || value === "1" || value === "true" || value === "on";
}

export function normalizeAudience(input, extraNewToSpot = false) {
  const raw = Array.isArray(input) ? input : String(input || "").split(",");
  const tags = [];
  for (const item of raw) {
    let tag = String(item || "")
      .toLowerCase()
      .trim();
    if (!tag) continue;
    if (tag === "expert" || tag === "advanced/expert" || tag === "experienced") tag = "advanced";
    if (tag === "new to this spot" || tag === "new-to-this-spot") tag = "new-to-spot";
    if (AUDIENCE_TAGS.includes(tag) && !tags.includes(tag)) tags.push(tag);
  }
  if (extraNewToSpot && !tags.includes("new-to-spot")) tags.push("new-to-spot");
  return tags;
}

export function normalizeNoteInput(body = {}, existing = {}) {
  const kindRaw = (body.kind || existing.kind || "general").toString().toLowerCase();
  const kind = NOTE_KINDS.includes(kindRaw) ? kindRaw : "general";
  const typeRaw = (body.type || existing.type || "note").toString().toLowerCase();
  const type = NOTE_TYPES.includes(typeRaw) ? typeRaw : "note";
  const title = (body.title ?? existing.title ?? "").toString().trim().slice(0, 120);
  const text = (body.body ?? existing.body ?? "").toString().trim().slice(0, 4000);
  const spotId =
    kind === "spot"
      ? (body.spotId ?? existing.spotId ?? "").toString().trim().slice(0, 80)
      : "";
  const audience = normalizeAudience(
    body.audience ?? existing.audience,
    asBool(body.newToSpot) || Boolean(existing.newToSpot)
  );
  const newToSpot = audience.includes("new-to-spot");
  const author = (body.author ?? existing.author ?? "anon").toString().slice(0, 40);
  const groupId = (body.groupId ?? existing.groupId ?? "").toString().slice(0, 80);
  const groupOnly = asBool(body.groupOnly) || Boolean(existing.groupOnly);

  return {
    kind,
    type,
    title,
    body: text,
    spotId,
    audience,
    newToSpot,
    author,
    groupId,
    groupOnly
  };
}

export function validateNote(note) {
  if (!note.title || !note.body) return "title and body are required";
  if (note.kind === "spot" && !note.spotId) return "spotId is required for spot notes";
  return null;
}

export function noteMatchesFilter(note, { spotId, skill, newToSpot, groupId } = {}) {
  if (note.groupOnly && (!groupId || note.groupId !== groupId)) return false;
  if (spotId) {
    if (note.kind === "spot" && note.spotId !== spotId) return false;
  }
  const tags = note.audience || [];
  const skillTags = tags.filter((tag) => tag !== "new-to-spot");
  if (skill && skill !== "all") {
    const wanted = skill === "expert" || skill === "experienced" ? "advanced" : skill;
    if (skillTags.length && !skillTags.includes(wanted)) return false;
  }
  if (asBool(newToSpot)) {
    if (!note.newToSpot && !tags.includes("new-to-spot")) return false;
  }
  return true;
}

export async function listNotes(filter = {}) {
  const rows = await listRecords("notes");
  return rows.filter((note) => noteMatchesFilter(note, filter));
}

export async function createNote(body) {
  const note = normalizeNoteInput(body);
  const error = validateNote(note);
  if (error) return { error, status: 400 };
  const record = await addRecord("notes", note);
  return { record };
}

export async function patchNote(id, body) {
  const existing = await getRecord("notes", id);
  if (!existing) return { error: "not found", status: 404 };
  const note = normalizeNoteInput({ ...existing, ...body }, existing);
  const error = validateNote(note);
  if (error) return { error, status: 400 };
  const record = await updateRecord("notes", id, note);
  return { record };
}

export async function getNote(id) {
  return getRecord("notes", id);
}

export async function seedNotes() {
  const existing = await listRecords("notes");
  if (existing.length) {
    await fixPointChevOutgoingDirection(existing);
    return;
  }
  const starter = [
    {
      kind: "general",
      type: "advice",
      title: "Self-rescue before you chase wind",
      body: "If you cannot body-drag upwind and pack down in the water, stay on a crowded east-coast beach and keep sessions short. White circles mean not enough wind — do not force a tiny kite.",
      audience: ["beginner"],
      author: "KAN"
    },
    {
      kind: "spot",
      type: "advice",
      title: "Takapuna: walk north when it is packed",
      body: "Launch well north of the patrol flags. Give swimmers a wide berth. A 10-minute walk beats a tangle, especially if you are new to this beach.",
      spotId: "takapuna",
      audience: ["beginner", "intermediate", "new-to-spot"],
      author: "KAN"
    },
    {
      kind: "spot",
      type: "advice",
      title: "Point Chev is incoming-to-high only",
      body: "Meola / Point Chevalier is a harbour classroom on the incoming tide. The outgoing Waitemata will take you east. Confirm an official tide, not a phone guess.",
      spotId: "point-chev",
      audience: ["beginner", "intermediate", "new-to-spot"],
      author: "KAN"
    },
    {
      kind: "spot",
      type: "note",
      title: "Muriwai is not a first-session beach",
      body: "West-coast dump, rips, and a crowd of surfers. Green for advanced can still be orange/red for beginners. Pick Orewa or Takapuna if the circles go white or orange on the left.",
      spotId: "muriwai",
      audience: ["beginner", "advanced"],
      author: "KAN"
    }
  ];
  for (const item of starter) {
    await createNote(item);
  }
}

async function fixPointChevOutgoingDirection(existing) {
  for (const note of existing) {
    if (note.spotId !== "point-chev" || typeof note.body !== "string") continue;
    if (!/take you west/i.test(note.body)) continue;
    await updateRecord("notes", note.id, {
      body: note.body.replace(/take you west/gi, "take you east")
    });
  }
}
