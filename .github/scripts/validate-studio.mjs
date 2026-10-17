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

const i18nStart = html.indexOf('const I18N = {');
if (i18nStart < 0) throw new Error('I18N translation table was not found in index.html.');
const i18nEnd = html.indexOf('\\n};', i18nStart);
if (i18nEnd < 0) throw new Error('I18N translation table could not be bounded.');
const i18nSource = html.slice(i18nStart, i18nEnd);
const localeNames = ['vi', 'en', 'zh', 'es', 'id'];
const localeBlocks = new Map();
for (let i = 0; i < localeNames.length; i++) {
  const name = localeNames[i];
  const start = i18nSource.indexOf('\\n  ' + name + ': {');
  if (start < 0) throw new Error('Missing I18N locale block: ' + name);
  let end = i18nSource.length;
  for (const nextName of localeNames.slice(i + 1)) {
    const next = i18nSource.indexOf('\\n  ' + nextName + ': {', start + 1);
    if (next >= 0 && next < end) end = next;
  }
  localeBlocks.set(name, i18nSource.slice(start, end));
}
const keysFor = block => new Set([...block.matchAll(/\\b(validator[A-Za-z0-9_]*)\\s*:/g)].map(match => match[1]));
const baseKeys = keysFor(localeBlocks.get('vi'));
const missingTranslations = [];
for (const locale of localeNames) {
  const keys = keysFor(localeBlocks.get(locale));
  for (const key of baseKeys) if (!keys.has(key)) missingTranslations.push(locale + '.' + key);
}
if (missingTranslations.length) {
  throw new Error('Missing Add-on Validator translations: ' + missingTranslations.join(', '));
}
console.log('Add-on Validator translation coverage checked for ' + localeNames.length + ' locales (' + baseKeys.size + ' keys).');

console.log('Syntax checked ' + scripts.length + ' inline scripts; compatibility data schema is valid.');
