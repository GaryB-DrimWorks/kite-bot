import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createNote, listNotes, noteMatchesFilter, patchNote } from "../src/notes/store.js";

test("notes filter by spot, skill and new-to-spot", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "kite-notes-"));
  process.env.DATA_PATH = dir;
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const general = await createNote({
    kind: "general",
    type: "advice",
    title: "Pack a leash",
    body: "Always.",
    audience: ["beginner"]
  });
  assert.ok(general.record.id);

  const spot = await createNote({
    kind: "spot",
    type: "advice",
    title: "Takapuna flags",
    body: "Walk north.",
    spotId: "takapuna",
    audience: ["beginner", "new-to-spot"]
  });
  assert.ok(spot.record.newToSpot);

  const advanced = await createNote({
    kind: "spot",
    type: "note",
    title: "Muriwai dump",
    body: "Advanced only today.",
    spotId: "muriwai",
    audience: ["advanced"]
  });
  assert.equal(advanced.record.spotId, "muriwai");

  const takapuna = await listNotes({ spotId: "takapuna", skill: "beginner" });
  assert.ok(takapuna.some((note) => note.title === "Takapuna flags"));
  assert.ok(takapuna.some((note) => note.title === "Pack a leash"));
  assert.equal(
    takapuna.some((note) => note.title === "Muriwai dump"),
    false
  );

  const newcomers = await listNotes({ newToSpot: "1" });
  assert.equal(newcomers.length, 1);
  assert.equal(newcomers[0].title, "Takapuna flags");

  const patched = await patchNote(spot.record.id, {
    body: "Walk further north of the flags."
  });
  assert.equal(patched.record.body, "Walk further north of the flags.");
  assert.equal(patched.record.id, spot.record.id);

  assert.equal(
    noteMatchesFilter(
      { kind: "spot", spotId: "orewa", audience: ["intermediate"] },
      { spotId: "orewa", skill: "beginner" }
    ),
    false
  );
});

test("spot notes require a spot id", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "kite-notes-bad-"));
  process.env.DATA_PATH = dir;
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  const result = await createNote({
    kind: "spot",
    title: "Missing beach",
    body: "Oops"
  });
  assert.equal(result.status, 400);
});
