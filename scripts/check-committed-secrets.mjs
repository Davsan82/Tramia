import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.endsWith('package-lock.json'));

const forbiddenFile = /(^|\/)(\.env(\..+)?|codigoaplicaciongmail\.txt)$/i;
const forbiddenContent = [
  /postgres(?:ql)?:\/\/[^\s:"']+:[^\s@"']+@/i,
  /\bnpg_[A-Za-z0-9]{12,}\b/,
  /SMTP_APP_PASSWORD\s*=\s*["']?[^\s"']{8,}/i,
  /PERUDEVS_API_KEY\s*=\s*["']?[A-Za-z0-9+/=_-]{24,}/i,
];

const violations = [];
for (const file of files) {
  if (forbiddenFile.test(file) && file !== '.env.example') {
    violations.push(`${file}: archivo sensible versionado`);
    continue;
  }
  const content = readFileSync(file, 'utf8')
    .replaceAll('postgresql://USER:PASSWORD@HOST', 'postgresql://PLACEHOLDER')
    .replaceAll('postgresql://USER:PASSWORD@POOLER_HOST', 'postgresql://PLACEHOLDER')
    .replaceAll('postgresql://USER:PASSWORD@DIRECT_HOST', 'postgresql://PLACEHOLDER');
  if (forbiddenContent.some((pattern) => pattern.test(content))) violations.push(`${file}: posible credencial real`);
}

if (violations.length) {
  console.error('Se detectaron posibles secretos en archivos versionados:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log(`Revisión de secretos completada: ${files.length} archivos versionados.`);
