import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'server', 'database', 'scripts', 'docs'];
const standalone = ['index.html', 'README.md', 'CHANGELOG.md', 'netlify.toml'];
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.html', '.sql', '.toml', '.yml', '.yaml']);
const files = [...standalone];
const visit = (directory) => {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(target);
    else if (extensions.has(path.extname(target))) files.push(target);
  }
};
roots.forEach(visit);

const invalidUtf8 = [];
const mojibake = [];
const decoder = new TextDecoder('utf-8', { fatal: true });
const suspicious = new RegExp(['\\u00c3[\\u0080-\\u00bf]', '\\u00c2[\\u0080-\\u00bf]', '\\u00e2\\u20ac', '\\ufffd'].join('|'));
for (const file of files) {
  const bytes = fs.readFileSync(file);
  let text;
  try { text = decoder.decode(bytes); } catch { invalidUtf8.push(file); continue; }
  if (suspicious.test(text)) mojibake.push(file);
}
if (invalidUtf8.length || mojibake.length) {
  if (invalidUtf8.length) console.error('Archivos que no son UTF-8:', invalidUtf8.join(', '));
  if (mojibake.length) console.error('Texto con posible mojibake:', mojibake.join(', '));
  process.exit(1);
}
console.log(`Codificación UTF-8 verificada en ${files.length} archivos.`);
