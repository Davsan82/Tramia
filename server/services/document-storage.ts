import { getStore } from '@netlify/blobs';

const localDocuments = new Map<string, { data: Buffer; contentType: string }>();
const useNetlify = () => Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);

export async function saveDocument(key: string, data: Buffer, contentType: string) {
  if (useNetlify()) {
    await getStore('tramia-documents').set(key, data, { metadata: { contentType } });
    return 'netlify_blobs';
  }
  localDocuments.set(key, { data, contentType });
  return 'local_memory';
}

export async function readDocument(key: string) {
  if (useNetlify()) {
    const store = getStore('tramia-documents');
    const entry = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!entry?.data) return null;
    return { data: Buffer.from(entry.data as ArrayBuffer), contentType: String((entry.metadata as any)?.contentType || 'application/octet-stream') };
  }
  return localDocuments.get(key) || null;
}

export async function removeDocument(key: string) {
  if (useNetlify()) await getStore('tramia-documents').delete(key);
  else localDocuments.delete(key);
}
