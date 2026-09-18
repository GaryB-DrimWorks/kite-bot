import assert from "node:assert/strict";
import test from "node:test";
import { shareMeta, shareMetaTags } from "../src/http/share.js";

test("share meta covers live dir and forecast skill+spot deep links", () => {
  const live = shareMeta(
    { path: "/live", query: { dir: "SW" } },
    "https://kite-bot.drim.works"
  );
  assert.equal(live.view, "live");
  assert.equal(live.url, "https://kite-bot.drim.works/live?dir=SW");
  assert.match(live.title, /Live/);

  const forecast = shareMeta(
    { path: "/forecast", query: { skill: "beginner", spot: "takapuna" } },
    "https://kite-bot.drim.works"
  );
  assert.equal(forecast.url, "https://kite-bot.drim.works/forecast?skill=beginner&spot=takapuna");
  const tags = shareMetaTags(forecast);
  assert.match(tags, /og:title/);
  assert.match(tags, /og:url/);
  assert.match(tags, /canonical/);
});
