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
  if (!source.id || !(/^https:\/\/learn\.microsoft\.com\//.test(source.url || '') || /^https:\/\/github\.com\/MicrosoftDocs\/minecraft-creator\//.test(source.url || '') || /^https:\/\/wiki\.bedrock\.dev\//.test(source.url || ''))) {
    throw new Error('Every compatibility source must have an id and an official Microsoft Learn, Minecraft Creator, or Bedrock Wiki URL.');
  }
}
console.log('Syntax checked ' + scripts.length + ' inline scripts; compatibility data schema is valid.');
