import { getStore } from '@netlify/blobs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const useNetlify = () => Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);
const localStorageRoot = path.resolve(process.cwd(), '.data', 'tramia-documents');

function localPaths(key: string) {
  const normalizedKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
  const dataPath = path.resolve(localStorageRoot, normalizedKey);
  if (dataPath !== localStorageRoot && !dataPath.startsWith(`${localStorageRoot}${path.sep}`)) {
    throw new Error('Ruta de almacenamiento local no válida.');
  }
  return { dataPath, metadataPath: `${dataPath}.metadata.json` };
}

export async function saveDocument(key: string, data: Buffer, contentType: string) {
  if (useNetlify()) {
    await getStore('tramia-documents').set(key, data, { metadata: { contentType } });
    return 'netlify_blobs';
  }
  const { dataPath, metadataPath } = localPaths(key);
  await mkdir(path.dirname(dataPath), { recursive: true });
  await Promise.all([
    writeFile(dataPath, data),
    writeFile(metadataPath, JSON.stringify({ contentType }), 'utf8'),
  ]);
  return 'local_disk';
}

export async function readDocument(key: string) {
  if (useNetlify()) {
    const store = getStore('tramia-documents');
    const entry = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!entry?.data) return null;
    return { data: Buffer.from(entry.data as ArrayBuffer), contentType: String((entry.metadata as any)?.contentType || 'application/octet-stream') };
  }
  const { dataPath, metadataPath } = localPaths(key);
  try {
    const [data, metadata] = await Promise.all([
      readFile(dataPath),
      readFile(metadataPath, 'utf8').then((value) => JSON.parse(value)).catch(() => ({})),
    ]);
    return { data, contentType: String(metadata.contentType || 'application/octet-stream') };
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function removeDocument(key: string) {
  if (useNetlify()) await getStore('tramia-documents').delete(key);
  else {
    const { dataPath, metadataPath } = localPaths(key);
    await Promise.all([rm(dataPath, { force: true }), rm(metadataPath, { force: true })]);
  }
}
