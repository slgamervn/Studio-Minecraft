import { readFile, writeFile } from 'node:fs/promises';

const dataPath = 'data/minecraft-compat.json';
const docsUrl = 'https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable';
const response = await fetch(docsUrl, { headers: { 'user-agent': 'Studio-Minecraft-Compatibility-Updater/1.1' } });
if (!response.ok) throw new Error('Microsoft Learn returned HTTP ' + response.status);
const html = await response.text();

const manifestIndex = html.indexOf('Manifest Details');
const availableIndex = html.indexOf('Available Versions', manifestIndex >= 0 ? manifestIndex : 0);
if (manifestIndex < 0 || availableIndex < 0) {
  throw new Error('Could not locate version sections on Microsoft Learn; leaving bundled data unchanged.');
}
const section = html.slice(manifestIndex, availableIndex);
const modulePattern = /(?:module_name|@minecraft\/server)[\s\S]{0,800}?version[\s\S]{0,160}?(\d+\.\d+\.\d+)(?![\w.-])/gi;
const versions = [...section.matchAll(modulePattern)].map(match => match[1]).filter(Boolean);
if (!versions.length) {
  throw new Error('Could not safely extract a stable @minecraft/server version from Microsoft Learn.');
}

const data = JSON.parse(await readFile(dataPath, 'utf8'));
if (!data.script_api) throw new Error('Compatibility data has no script_api section.');
const oldVersion = data.script_api.latest_documented_stable?.version;
const latest = versions[0];
const today = new Date().toISOString().slice(0, 10);
const changed = oldVersion !== latest || data.script_api.latest_documented_stable?.checked !== today;

data.script_api.latest_documented_stable = {
  module: '@minecraft/server',
  version: latest,
  evidence: 'Extracted from the Microsoft Learn stable module reference. This is not an exact mapping to every Minecraft game version.',
  checked: today,
  url: docsUrl
};
data.sources = Array.isArray(data.sources) ? data.sources : [];
const sourceId = 'server-module';
const existing = data.sources.find(source => source.id === sourceId);
if (existing) {
  existing.url = docsUrl;
  existing.checked = today;
} else {
  data.sources.push({ id: sourceId, url: docsUrl, checked: today });
}
data.updated_utc = today;

if (changed) {
  const parts = String(data.data_version || '2026.0.0.0').split('.');
  const patch = Number(parts.at(-1)) || 0;
  data.data_version = '2026.' + today.slice(5, 7) + '.' + today.slice(8, 10) + '.' + (oldVersion === latest ? patch : patch + 1);
}
await writeFile(dataPath, JSON.stringify(data, null, 2) + '\n');
console.log('Compatibility data refreshed: @minecraft/server ' + (oldVersion ?? '(none)') + ' -> ' + latest + '; checked ' + today);
