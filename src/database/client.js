import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config/index.js";

async function ensureDir() {
  await mkdir(config.dataPath, { recursive: true });
}

function fileFor(name) {
  return path.join(config.dataPath, `${name}.json`);
}

async function readJson(name, fallback) {
  await ensureDir();
  try {
    const raw = await readFile(fileFor(name), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(name, value) {
  await ensureDir();
  await writeFile(fileFor(name), JSON.stringify(value, null, 2));
}

function withId(record) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...record
  };
}

export async function listRecords(name) {
  return readJson(name, []);
}

export async function addRecord(name, record) {
  const rows = await listRecords(name);
  const next = [withId(record), ...rows].slice(0, 400);
  await writeJson(name, next);
  return next[0];
}

export async function listVisible(name, groupId) {
  const rows = await listRecords(name);
  return rows.filter((row) => {
    if (!row.groupOnly) return true;
    return Boolean(groupId) && row.groupId === groupId;
  });
}

export async function getSettings() {
  return readJson("settings", {
    niwaTideApiKey: config.niwaTideApiKey,
    stormglassApiKey: config.stormglassApiKey
  });
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await writeJson("settings", next);
  return maskSettings(next);
}

export function maskSettings(settings) {
  return {
    niwaTideConfigured: Boolean(settings.niwaTideApiKey),
    stormglassConfigured: Boolean(settings.stormglassApiKey)
  };
}

export async function appendForecastLog(entry) {
  const rows = await readJson("forecast-log", []);
  const next = [entry, ...rows].slice(0, 500);
  await writeJson("forecast-log", next);
  return entry;
}

export async function listForecastLog() {
  return readJson("forecast-log", []);
}
