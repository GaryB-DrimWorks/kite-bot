import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMERAS,
  featuredCameras,
  matchesSpotQuery,
  preferWindsurfUrl
} from "../src/config/cameras.js";

test("Windsurf stills and charts prefer non-www https", () => {
  assert.equal(
    preferWindsurfUrl("https://www.windsurf.co.nz/webcams/orewa.jpg"),
    "https://windsurf.co.nz/webcams/orewa.jpg"
  );
  assert.equal(
    preferWindsurfUrl("http://www.windsurf.co.nz/chart/line_takapuna.asp"),
    "https://windsurf.co.nz/chart/line_takapuna.asp"
  );
  assert.equal(
    preferWindsurfUrl("http://www.destin.co.nz/weather/webcam.jpg"),
    "http://www.destin.co.nz/weather/webcam.jpg"
  );
});

test("featured catalog has live stills or charts and Auckland spots", () => {
  const featured = featuredCameras();
  assert.ok(featured.length >= 12);
  const ids = featured.map((camera) => camera.id);
  assert.ok(ids.includes("takapuna"));
  assert.ok(ids.includes("muriwai"));
  for (const camera of featured) {
    assert.ok(camera.liveImage || camera.chartUrl, camera.id);
    if (camera.chartUrl) {
      assert.match(camera.chartUrl, /^https:\/\/windsurf\.co\.nz\//);
    }
    if ((camera.liveImage || "").includes("windsurf.co.nz")) {
      assert.doesNotMatch(camera.liveImage, /www\.windsurf\.co\.nz/);
    }
  }
  assert.ok(CAMERAS.some((camera) => matchesSpotQuery(camera, "takapuna")));
});
