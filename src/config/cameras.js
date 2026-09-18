export const WIND_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function preferWindsurfUrl(url) {
  if (!url) return "";
  let next = String(url);
  if (/windsurf\.co\.nz/i.test(next)) {
    next = next.replace(/^http:\/\//i, "https://");
    next = next.replace("://www.windsurf.co.nz", "://windsurf.co.nz");
  }
  return next;
}

function cam(row) {
  return {
    featured: true,
    sourceName: "Windsurf.co.nz",
    ...row,
    pageUrl: preferWindsurfUrl(row.pageUrl),
    pageUrlAlt: row.pageUrlAlt ? preferWindsurfUrl(row.pageUrlAlt) : "",
    liveImage: /windsurf\.co\.nz/i.test(row.liveImage || "")
      ? preferWindsurfUrl(row.liveImage)
      : row.liveImage || "",
    liveImageAlt: /windsurf\.co\.nz/i.test(row.liveImageAlt || "")
      ? preferWindsurfUrl(row.liveImageAlt)
      : row.liveImageAlt || "",
    chartUrl: preferWindsurfUrl(row.chartUrl || ""),
    sourceUrl: preferWindsurfUrl(row.sourceUrl || row.pageUrl),
    providerUrl: row.providerUrl || row.altSourceUrl || "",
    liveEmbed: row.liveEmbed || ""
  };
}

export const CAMERAS = [
  cam({
    id: "orewa",
    name: "Orewa",
    spot: "Orewa",
    spotId: "orewa",
    windDirs: ["NE", "E", "N"],
    lat: -36.585,
    lon: 174.695,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_orewa.asp",
    liveImage: "https://windsurf.co.nz/webcams/orewa.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_orewa.asp",
    feedKey: "orewa-main",
    notes: "Working live JPEG. East-coast / Hibiscus Coast kite & foil spot."
  }),
  cam({
    id: "orewa-2",
    name: "Orewa 2",
    spot: "Orewa",
    spotId: "orewa",
    windDirs: ["NE", "E", "N"],
    lat: -36.585,
    lon: 174.695,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_orewa2.asp",
    liveImage: "https://windsurf.co.nz/webcams/orewa2.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_orewa.asp",
    feedKey: "orewa-2",
    notes: "Second Orewa Windsurf cam."
  }),
  cam({
    id: "muriwai",
    name: "Muriwai",
    spot: "Muriwai",
    spotId: "muriwai",
    windDirs: ["SW", "W", "NW", "S"],
    lat: -36.831,
    lon: 174.434,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_muriwai.asp",
    liveImage: "https://windsurf.co.nz/webcams/muriwai/muriwai.jpg",
    liveImageAlt: "https://camstills.cdn-surfline.com/ap-southeast-2/nz-muriwai/latest_full.jpg",
    altSourceName: "Surfline",
    altSourceUrl: "https://www.surfline.com/surf-report/muriwai-beach/584204204e65fad6a7709674",
    chartUrl: "https://windsurf.co.nz/chart/line_muriwai.asp",
    feedKey: "muriwai",
    notes: "West-coast wave kite spot. Windsurf cam; Surfline still as secondary."
  }),
  cam({
    id: "pt-chev",
    name: "Point Chevalier",
    spot: "Point Chevalier",
    spotId: "point-chev",
    windDirs: ["SW", "W", "NW", "NE"],
    lat: -36.862,
    lon: 174.705,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_ptchev.asp",
    liveImage: "https://windsurf.co.nz/webcams/ptchev/ptchev.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_ptchev.asp",
    feedKey: "pt-chev",
    notes: "Popular Waitemata harbour kite spot. Incoming-to-high tide classroom."
  }),
  cam({
    id: "takapuna",
    name: "Takapuna",
    spot: "Takapuna",
    spotId: "takapuna",
    windDirs: ["NE", "E", "N"],
    lat: -36.787,
    lon: 174.773,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_takapuna.asp",
    liveImage: "https://windsurf.co.nz/webcams/takapuna/takapuna1_lg.jpg",
    liveImageAlt: "https://images.webcamgalore.com/394-current-webcam-Takapuna.jpg",
    altSourceName: "Webcam Galore",
    altSourceUrl: "https://www.webcamgalore.com/webcam/New-Zealand/Takapuna-394.html",
    chartUrl: "https://windsurf.co.nz/chart/line_takapuna.asp",
    feedKey: "takapuna",
    notes: "Primary North Shore kite beach. Try Windsurf still first; Webcam Galore secondary."
  }),
  cam({
    id: "takapuna-2",
    name: "Takapuna 2",
    spot: "Takapuna",
    spotId: "takapuna",
    windDirs: ["NE", "E", "N"],
    lat: -36.787,
    lon: 174.773,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_takapuna2.asp",
    liveImage: "https://windsurf.co.nz/webcams/takapuna/takapuna1_lg.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_takapuna.asp",
    feedKey: "takapuna-2",
    notes: "Second Windsurf Takapuna view. Local files were stale at last audit."
  }),
  cam({
    id: "mairangi",
    name: "Mairangi Bay",
    spot: "Mairangi Bay",
    spotId: "mairangi-bay",
    windDirs: ["NE", "E", "N"],
    lat: -36.74,
    lon: 174.749,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_mairangibay.asp",
    liveImage: "https://windsurf.co.nz/webcams/mairangi1_lg.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_mairangi.asp",
    feedKey: "mairangi",
    notes: "East-coast / North Shore."
  }),
  cam({
    id: "mairangi-2",
    name: "Mairangi Bay 2",
    spot: "Mairangi Bay",
    spotId: "mairangi-bay",
    windDirs: ["NE", "E", "N"],
    lat: -36.74,
    lon: 174.749,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_mairangibay2.asp",
    liveImage: "https://windsurf.co.nz/webcams/mairangi2_lg.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_mairangi.asp",
    feedKey: "mairangi-2",
    notes: "Second Mairangi view."
  }),
  cam({
    id: "manly",
    name: "Manly",
    spot: "Manly (Whangaparaoa)",
    spotId: "manly",
    windDirs: ["NE", "E", "N", "NW"],
    lat: -36.633,
    lon: 174.765,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_manly.asp",
    liveImage: "https://windsurf.co.nz/webcams/manly/manly_sm.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_manly.asp",
    feedKey: "manly",
    notes: "Whangaparaoa / Shakes. Cam + JPEG are live."
  }),
  cam({
    id: "browns-bay",
    name: "Browns Bay",
    spot: "Browns Bay",
    spotId: "browns-bay",
    windDirs: ["NE", "E", "N"],
    lat: -36.716,
    lon: 174.748,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_brownsbay.asp",
    liveImage: "https://windsurf.co.nz/webcams/brownsbay/brownsbay.jpg",
    chartUrl: "",
    feedKey: "browns-bay",
    notes: "East-coast North Shore fill-in between Takapuna and Orewa. No dedicated Windsurf chart."
  }),
  cam({
    id: "bayswater-shoal",
    name: "Bayswater / Shoal Bay",
    spot: "Bayswater / Shoal Bay",
    spotId: "shoal-bay",
    windDirs: ["SW", "W", "NW", "NE"],
    lat: -36.825,
    lon: 174.76,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_bayswater.asp",
    pageUrlAlt: "https://windsurf.co.nz/windsurf_cam_shoalbay.asp",
    liveImage: "https://windsurf.co.nz/webcams/bayswater.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_shoalbay.asp",
    feedKey: "bayswater-feed",
    notes: "Shared Bayswater feed (legacy Shoal still is dead)."
  }),
  cam({
    id: "st-heliers",
    name: "St Heliers",
    spot: "St Heliers",
    spotId: "st-heliers",
    windDirs: ["NE", "E", "N"],
    lat: -36.85,
    lon: 174.856,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_stheliers.asp",
    liveImage: "http://www.destin.co.nz/weather/webcam.jpg",
    liveImageAlt: "https://windsurf.co.nz/chart/line_stheliers.asp",
    altSourceName: "Destin",
    altSourceUrl: "http://www.destin.co.nz/weather/webcam.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_stheliers.asp",
    feedKey: "st-heliers",
    mixedContent: true,
    notes: "Destin still is HTTP-only; Windsurf page + chart are the HTTPS entry."
  }),
  cam({
    id: "farm-cove",
    name: "Farm Cove / Bucklands / Tamaki",
    spot: "Farm Cove / Bucklands Beach",
    spotId: "farm-cove",
    windDirs: ["NE", "E", "N", "SW"],
    lat: -36.882,
    lon: 174.9,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_farmcove.asp",
    pageUrlAlt: "https://windsurf.co.nz/windsurf_cam_tamaki.asp",
    liveImage:
      "https://cameraftpapi.drivehq.com/api/Camera/GetCameraThumbnail.ashx?parentID=278623865&shareID=14262225",
    liveEmbed:
      "https://www.cameraftp.com/Camera/Cameraplayer.aspx?parentID=278623865&shareID=14262225&isEmbedded=true&mode=live",
    chartUrl: "https://windsurf.co.nz/chart/line_tamaki.asp",
    feedKey: "farm-cove-cameraftp",
    sourceName: "Windsurf.co.nz / CameraFTP",
    providerUrl:
      "https://www.cameraftp.com/Camera/Cameraplayer.aspx?parentID=278623865&shareID=14262225&isEmbedded=true&mode=live",
    notes: "Shared CameraFTP feed for Farm Cove / Tamaki / Bucklands."
  }),
  cam({
    id: "pine-harbour",
    name: "Pine Harbour",
    spot: "Pine Harbour / Beachlands",
    spotId: "pine-harbour",
    windDirs: ["NE", "E", "SW"],
    lat: -36.89,
    lon: 174.98,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_pine-harbour.asp",
    liveImage:
      "https://cameraftpapi.drivehq.com/api/Camera/GetCameraThumbnail.ashx?parentID=311029379&shareID=14771069",
    liveEmbed:
      "https://www.cameraftp.com/Camera/Cameraplayer.aspx?parentID=311029379&shareID=14771069&isEmbedded=true&mode=live",
    chartUrl: "https://windsurf.co.nz/chart/line_pineharbour.asp",
    feedKey: "pine-harbour",
    sourceName: "Windsurf.co.nz / CameraFTP",
    providerUrl:
      "https://www.cameraftp.com/Camera/Cameraplayer.aspx?parentID=311029379&shareID=14771069&isEmbedded=true&mode=live",
    notes: "CameraFTP thumbnail is often weak; chart is the reliable panel."
  }),
  cam({
    id: "lake-pupuke",
    name: "Lake Pupuke",
    spot: "Lake Pupuke",
    spotId: "lake-pupuke",
    windDirs: ["NE", "E", "SW", "W", "NW"],
    lat: -36.78,
    lon: 174.766,
    pageUrl: "https://windsurf.co.nz/windsurf_cam_lake-pupuke.asp",
    liveImage:
      "https://cameraftpapi.drivehq.com/api/Camera/GetCameraThumbnail.ashx?parentID=289984293&shareID=14421426",
    liveEmbed:
      "https://www.cameraftp.com/Camera/Cameraplayer.aspx?parentID=289984293&shareID=14421426&isEmbedded=true&mode=live",
    chartUrl: "https://windsurf.co.nz/chart/line_pupuke.asp",
    feedKey: "lake-pupuke",
    sourceName: "Windsurf.co.nz / CameraFTP",
    providerUrl:
      "https://www.cameraftp.com/Camera/Cameraplayer.aspx?parentID=289984293&shareID=14421426&isEmbedded=true&mode=live",
    notes: "Flat-water / learning spot."
  }),
  cam({
    id: "piha",
    name: "Piha",
    spot: "Piha",
    spotId: "piha",
    windDirs: ["SW", "W", "NW"],
    lat: -36.954,
    lon: 174.468,
    pageUrl: "https://www.surfline.com/surf-report/piha/5842041f4e65fad6a7708d7c",
    liveImage: "https://camstills.cdn-surfline.com/ap-southeast-2/nz-piha/latest_full.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_muriwai.asp",
    feedKey: "piha-surfline",
    sourceName: "Surfline",
    sourceUrl: "https://www.surfline.com/surf-report/piha/5842041f4e65fad6a7708d7c",
    notes: "Surfline still; Windsurf chart proxies Muriwai."
  }),
  cam({
    id: "omaha",
    name: "Omaha South",
    spot: "Omaha",
    spotId: "omaha",
    windDirs: ["NE", "E", "N"],
    lat: -36.333,
    lon: 174.783,
    pageUrl: "https://www.surfline.com/surf-report/omaha-beach/6178698263e26bab7abf55d9",
    liveImage: "https://camstills.cdn-surfline.com/ap-southeast-2/nz-omahasouth/latest_full.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_orewa.asp",
    feedKey: "omaha-surfline",
    sourceName: "Surfline",
    sourceUrl: "https://www.surfline.com/surf-report/omaha-beach/6178698263e26bab7abf55d9",
    notes: "East-coast kite/surf further north. Surfline still; chart proxies Orewa."
  }),
  cam({
    id: "orewa-bar-surfline",
    name: "Orewa Bar (Surfline still)",
    spot: "Orewa",
    spotId: "orewa",
    windDirs: ["NE", "E"],
    lat: -36.585,
    lon: 174.695,
    pageUrl: "https://www.surfline.com/surf-report/omaha-beach/6178698263e26bab7abf55d9",
    liveImage: "https://camstills.cdn-surfline.com/ap-southeast-2/nz-orewabar/latest_full.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_orewa.asp",
    feedKey: "orewa-bar-surfline",
    sourceName: "Surfline",
    sourceUrl: "https://www.surfline.com/surf-report/omaha-beach/6178698263e26bab7abf55d9",
    notes: "Surfline still works without login. Video may need premium."
  }),
  cam({
    id: "karekare",
    name: "Karekare (Surfline still)",
    spot: "Karekare",
    spotId: "karekare",
    windDirs: ["SW", "W", "NW"],
    lat: -36.988,
    lon: 174.481,
    pageUrl: "https://www.surfline.com/surf-report/muriwai-beach/584204204e65fad6a7709674",
    liveImage: "https://camstills.cdn-surfline.com/ap-southeast-2/nz-karekare/latest_full.jpg",
    chartUrl: "https://windsurf.co.nz/chart/line_muriwai.asp",
    feedKey: "karekare-surfline",
    sourceName: "Surfline",
    sourceUrl: "https://www.surfline.com/surf-report/muriwai-beach/584204204e65fad6a7709674",
    notes: "Nearby west-coast still. Uncertain for kite popularity vs Muriwai."
  })
];

export const CAMERA_LINKS = [
  {
    id: "metservice-harbour-bridge",
    name: "Auckland Harbour Bridge",
    url: "https://www.metservice.com/weather-station-location/93106/auckland-harbour-bridge",
    kind: "station"
  },
  {
    id: "metservice-whangaparaoa",
    name: "Whangaparaoa Peninsula",
    url: "https://www.metservice.com/weather-station-location/93103/whangaparaoa-peninsula",
    kind: "station"
  },
  {
    id: "hauraki-gulf-weather-hub",
    name: "Hauraki Gulf Weather live cams",
    url: "https://www.haurakigulfweather.com/live-webcams",
    kind: "hub"
  },
  {
    id: "predictwind-nz-hub",
    name: "PredictWind NZ webcams",
    url: "https://www.predictwind.com/webcams",
    kind: "hub"
  },
  {
    id: "windsurf-home",
    name: "Windsurf.co.nz",
    url: "https://windsurf.co.nz/",
    kind: "source"
  }
];

export function featuredCameras() {
  const seen = new Set();
  const unique = [];
  for (const camera of CAMERAS) {
    if (!camera.featured) continue;
    const key = camera.feedKey || camera.id;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(camera);
  }
  return unique;
}

export function matchesSpotQuery(camera, spot) {
  if (!spot) return true;
  const query = String(spot).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!query) return true;
  const haystack = [camera.id, camera.spotId, camera.spot, camera.name]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  return haystack.some((value) => value === query || value.includes(query) || query.includes(value));
}

export function matchesWindDir(camera, dir) {
  if (!dir || dir === "all") return true;
  if (!camera.windDirs?.length) return true;
  return camera.windDirs.includes(String(dir).toUpperCase());
}

export function getCamera(id) {
  return CAMERAS.find((camera) => camera.id === id) || null;
}
