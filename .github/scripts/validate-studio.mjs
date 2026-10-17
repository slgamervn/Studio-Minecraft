import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)<\\/script>/gi)];
if (!scripts.length) throw new Error('No inline scripts found in index.html');
let checked = 0;
for (let i = 0; i < scripts.length; i++) {
  const source = scripts[i][1].trim();
  if (!source) continue;
  try { new vm.Script(source, { filename: `index.html:inline-script-${i + 1}` }); }
  catch (error) { console.error(error); process.exitCode = 1; }
  checked++;
}
const data = JSON.parse(await readFile('data/minecraft-compat.json', 'utf8'));
if (data.schema_version !== 1 || !data.manifest || !data.script_api || !Array.isArray(data.sources)) {
  throw new Error('minecraft-compat.json does not match expected top-level schema.');
}
if (!data.script_api.latest_documented_stable?.version) throw new Error('Latest stable Script API reference is missing.');
console.log(`Syntax checked ${checked} inline scripts; compatibility data schema is valid.`);
