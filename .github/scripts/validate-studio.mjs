import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile('index.html', 'utf8');
const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const scripts = [];
for (const match of html.matchAll(scriptPattern)) {
  if (/\bsrc\s*=/i.test(match[1])) continue;
  if (match[2].trim()) scripts.push(match[2]);
}
if (!scripts.length) throw new Error('No inline scripts found in index.html');

for (let i = 0; i < scripts.length; i++) {
  try {
    new vm.Script(scripts[i], { filename: 'index.html:inline-script-' + (i + 1) });
  } catch (error) {
    console.error('Inline script ' + (i + 1) + ' failed syntax validation:', error);
    process.exitCode = 1;
  }
}

const data = JSON.parse(await readFile('data/minecraft-compat.json', 'utf8'));
if (data.schema_version !== 1 || !data.manifest || !data.script_api || !Array.isArray(data.sources)) {
  throw new Error('minecraft-compat.json does not match expected top-level schema.');
}
if (!data.script_api.latest_documented_stable?.version) {
  throw new Error('Latest stable Script API reference is missing.');
}
if (!/^\d+\.\d+\.\d+$/.test(data.script_api.latest_documented_stable.version)) {
  throw new Error('Latest documented stable Script API version must be a stable SemVer triple.');
}
for (const source of data.sources) {
  if (!source.id || !(/^https:\/\/learn\.microsoft\.com\//.test(source.url || '') || /^https:\/\/github\.com\/MicrosoftDocs\/minecraft-creator\//.test(source.url || '') || /^https:\/\/wiki\.bedrock\.dev\//.test(source.url || '') || /^https:\/\/feedback\.minecraft\.net\//.test(source.url || ''))) {
    throw new Error('Every compatibility source must have an id and an official Microsoft Learn, Minecraft Creator, or Bedrock Wiki URL.');
  }
}

const evidence = data.script_api.release_note_evidence || {};
for (const [gameVersion, entry] of Object.entries(evidence)) {
  if (!/^\d+\.\d+\.\d+$/.test(gameVersion) ||
      entry?.status !== 'release-note-evidence' ||
      typeof entry.module !== 'string' ||
      !/^\d+\.\d+\.\d+$/.test(entry.version || '') ||
      !(/^https:\/\/learn\.microsoft\.com\//.test(entry.url || '') || /^https:\/\/feedback\.minecraft\.net\//.test(entry.url || '')) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.checked || '')) {
    throw new Error('Invalid release-note evidence entry for Minecraft ' + gameVersion + '.');
  }
}

const previewEvidence = data.script_api.preview_evidence || {};
for (const [previewVersion, entry] of Object.entries(previewEvidence)) {
  if (!/^\d+\.\d+\.\d+-preview\.\d+$/.test(previewVersion) ||
      entry?.status !== 'preview-evidence' ||
      typeof entry.module !== 'string' ||
      !/^\d+\.\d+\.\d+-beta$/.test(entry.version || '') ||
      !/^https:\/\/learn\.microsoft\.com\//.test(entry.url || '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.checked || '')) {
    throw new Error('Invalid preview API evidence entry for Minecraft ' + previewVersion + '.');
  }
}

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const seenIds = new Set();
for (const id of ids) {
  if (seenIds.has(id)) throw new Error('Duplicate HTML id found: ' + id);
  seenIds.add(id);
}

const directHandlers = new Map();
for (const match of html.matchAll(/getElementById\(['"]([^'"]+)['"]\)\.(onclick|onchange|oninput|onkeyup|onkeydown)\s*=/g)) {
  const key = match[1] + '.' + match[2];
  directHandlers.set(key, (directHandlers.get(key) || 0) + 1);
}
for (const [key, count] of directHandlers) {
  if (count > 1) throw new Error('Duplicate direct event-handler assignment found: ' + key);
}

const serviceWorker = await readFile('sw.js', 'utf8');
new vm.Script(serviceWorker, { filename: 'sw.js' });
if (!serviceWorker.includes("url.pathname.endsWith('/data/minecraft-compat.json')") ||
    !serviceWorker.includes("fetch(request, { cache: 'no-cache' })")) {
  throw new Error('Service worker must refresh compatibility data from the network before using its offline cache.');
}
console.log('Syntax checked ' + scripts.length + ' inline scripts and sw.js; compatibility data, release-note evidence, and unique HTML ids are valid.');
