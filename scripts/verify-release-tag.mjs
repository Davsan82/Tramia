import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);

const tag = process.env.GITHUB_REF_NAME || process.argv[2];

if (!tag) {
  console.error('Debes indicar un tag, por ejemplo: v0.1.0');
  process.exit(1);
}

if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  console.error(`El tag "${tag}" no cumple el formato vMAJOR.MINOR.PATCH.`);
  process.exit(1);
}

const tagVersion = tag.slice(1);

if (tagVersion !== packageJson.version) {
  console.error(
    `El tag ${tag} no coincide con package.json (${packageJson.version}).`,
  );
  process.exit(1);
}

console.log(`Versión verificada: ${tag}`);
