import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createApp } from "../src/http/app.js";

async function listen(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { server, port };
}

test("cameras, notes and membership HTTP surfaces work without WhatsApp", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "kite-http-"));
  process.env.DATA_PATH = dir;
  process.env.WHATSAPP_DISABLED = "1";
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const app = createApp();
  await app.locals.ready;
  const { server, port } = await listen(app);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${port}`;

  const cameras = await fetch(`${base}/api/cameras`).then((res) => res.json());
  assert.ok(cameras.cameras.length > 0);
  assert.match(cameras.cameras[0].pageUrl, /^https:/);

  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Live \| Forecast|Forecast/);
  assert.match(html, /og:title/);
  assert.match(html, /name="skill"/);

  const live = await fetch(`${base}/live?dir=SW`);
  assert.equal(live.status, 200);
  assert.match(await live.text(), /dir=SW|KAN Live/);

  const created = await fetch(`${base}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "spot",
      type: "advice",
      spotId: "takapuna",
      title: "HTTP note",
      body: "From the test.",
      audience: ["beginner", "new-to-spot"]
    })
  });
  assert.equal(created.status, 201);
  const note = await created.json();
  const patched = await fetch(`${base}/api/notes/${note.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: "Updated from the test." })
  });
  assert.equal(patched.status, 200);

  const filtered = await fetch(
    `${base}/api/notes?spot=takapuna&skill=beginner&newToSpot=1`
  ).then((res) => res.json());
  assert.ok(filtered.notes.some((row) => row.title === "HTTP note"));

  const meRes = await fetch(`${base}/api/me`);
  const me = await meRes.json();
  assert.ok(["visitor", "returning-visitor"].includes(me.tier));
  assert.equal(me.portals.length, 3);
  const setCookie = meRes.headers.get("set-cookie");
  assert.match(setCookie || "", /kb_session=/);

  const signup = await fetch(`${base}/api/membership/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: setCookie },
    body: JSON.stringify({ email: "rider@example.com", name: "Rider" })
  });
  assert.equal(signup.status, 201);

  const instructor = await fetch(`${base}/portals/instructor`);
  assert.equal(instructor.status, 200);
  assert.match(await instructor.text(), /Instructor/);
});
