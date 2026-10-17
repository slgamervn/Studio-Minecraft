import { readFile, writeFile } from 'node:fs/promises';

const dataPath = 'data/minecraft-compat.json';
const docsUrl = 'https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable';
const response = await fetch(docsUrl, { headers: { 'user-agent': 'Studio-Minecraft-Compatibility-Updater/1.0' } });
if (!response.ok) throw new Error(`Microsoft Learn returned HTTP ${response.status}`);
const html = await response.text();

const manifestIndex = html.indexOf('Manifest Details');
const availableIndex = html.indexOf('Available Versions', manifestIndex >= 0 ? manifestIndex : 0);
if (manifestIndex < 0 || availableIndex < 0) throw new Error('Could not locate version sections on Microsoft Learn; leaving bundled data unchanged.');
const section = html.slice(manifestIndex, availableIndex);
const stableMatches = [...section.matchAll(/(?:module_name|@minecraft\\/server)[\\s\\S]{0,500}?version[\\s\\S]{0,100}?(\\d+\\.\\d+\\.\\d+)(?![\\w.-])/g)]
  .map(match => match[1])
  .filter(version => !version.includes('-'));
if (!stableMatches.length) throw new Error('Could not safely extract a stable @minecraft/server version from Microsoft Learn.');
const latest = stableMatches[0];

const data = JSON.parse(await readFile(dataPath, 'utf8'));
if (!data.script_api) throw new Error('Compatibility data has no script_api section.');
const today = new Date().toISOString().slice(0, 10);
const oldVersion = data.script_api.latest_documented_stable?.version;
data.script_api.latest_documented_stable = {
  module: '@minecraft/server',
  version: latest,
  evidence: 'Automatically extracted from the Microsoft Learn stable module reference. This is not an exact mapping to every Minecraft game version.',
  checked: today,
  url: docsUrl
};
data.sources = Array.isArray(data.sources) ? data.sources : [];
const sourceId = 'server-module';
const existing = data.sources.find(source => source.id === sourceId);
if (existing) { existing.url = docsUrl; existing.checked = today; }
else data.sources.push({ id: sourceId, url: docsUrl, checked: today });
data.updated_utc = today;
const patch = Number(String(data.data_version || '1').split('.').at(-1)) || 0;
if (oldVersion !== latest || data.updated_utc !== today) data.data_version = '2026.' + today.slice(5, 7) + '.' + today.slice(8, 10) + '.' + (oldVersion === latest ? patch : patch + 1);
await writeFile(dataPath, JSON.stringify(data, null, 2) + '\n');
console.log(`Compatibility data refreshed: @minecraft/server ${oldVersion ?? '(none)'} -> ${latest}; checked ${today}`);
