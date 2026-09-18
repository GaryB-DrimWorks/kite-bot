import { config } from "../config/index.js";

export function shareStateFromRequest(req) {
  const path = req.path || "/";
  const query = req.query || {};
  let view = "forecast";
  if (path === "/live" || query.view === "live") view = "live";
  if (path === "/forecast" || query.view === "forecast") view = "forecast";
  const skill = String(query.skill || "all").toLowerCase();
  const spot = String(query.spot || "").toLowerCase();
  const dir = String(query.dir || "").toUpperCase();
  return { view, skill, spot, dir, path };
}

export function absoluteUrl(req, origin) {
  const state = shareStateFromRequest(req);
  const path = state.view === "live" ? "/live" : state.path === "/" ? "/" : "/forecast";
  const params = new URLSearchParams();
  if (state.dir) params.set("dir", state.dir);
  if (state.skill && state.skill !== "all") params.set("skill", state.skill);
  if (state.spot) params.set("spot", state.spot);
  const qs = params.toString();
  return `${origin}${path}${qs ? `?${qs}` : ""}`;
}

export function shareMeta(req, origin = config.publicOrigin) {
  const state = shareStateFromRequest(req);
  const url = absoluteUrl(req, origin);
  const skillBit =
    state.skill && state.skill !== "all"
      ? ` · ${state.skill}`
      : "";
  const spotBit = state.spot ? ` · ${state.spot}` : "";
  const dirBit = state.dir ? ` · ${state.dir}` : "";
  const title =
    state.view === "live"
      ? `KAN Live${dirBit} — Auckland kitesurf cameras`
      : `KAN Forecast${skillBit}${spotBit} — Auckland kitesurf`;
  const description =
    state.view === "live"
      ? "Live Windsurf stills and charts for Auckland kite spots. Click through to the source."
      : "KAN report cards for Auckland kite spots with Beginner · Intermediate · Advanced skill circles.";
  return { ...state, title, description, url };
}

export function shareMetaTags(meta) {
  const entries = [
    ["og:title", meta.title],
    ["og:description", meta.description],
    ["og:url", meta.url],
    ["og:type", "website"],
    ["og:site_name", "KAN · Recreation Assistant"],
    ["twitter:card", "summary"],
    ["twitter:title", meta.title],
    ["twitter:description", meta.description]
  ];
  const og = entries
    .map(([property, content]) => {
      const attr = property.startsWith("twitter:") ? "name" : "property";
      return `<meta ${attr}="${property}" content="${escapeAttr(content)}">`;
    })
    .join("\n    ");
  return `${og}\n    <link rel="canonical" href="${escapeAttr(meta.url)}">`;
}

function escapeAttr(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}
