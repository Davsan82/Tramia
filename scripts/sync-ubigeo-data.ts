import { mkdir, writeFile } from 'node:fs/promises';

const base = 'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json';
const files = ['1_ubigeo_departamentos.json', '2_ubigeo_provincias.json', '3_ubigeo_distritos.json'];
await mkdir('public/data', { recursive: true });
for (const file of files) {
  const response = await fetch(`${base}/${file}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  await writeFile(`public/data/${file}`, await response.text(), 'utf8');
  console.log(`${file}: actualizado`);
}
