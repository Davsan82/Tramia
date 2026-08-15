import serverless from "serverless-http";
import { connectLambda } from "@netlify/blobs";
import { app } from "../../server";
import { closeDrizzleDatabase } from "../../server/db/client";

// Netlify Functions requires binary payloads to be base64-encoded by the
// Lambda adapter. Without this list, images and PDFs are converted to UTF-8
// text and arrive corrupted even though the original blob is stored correctly.
const expressHandler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream'],
});

type NetlifyEvent = {
  path?: string;
  rawPath?: string;
  [key: string]: unknown;
};

/**
 * Netlify redirects /api/* to this function. Normalize direct function URLs as
 * well so Express always receives the public /api/* path.
 */
export const handler = async (event: NetlifyEvent, context: unknown) => {
  connectLambda(event as never);
  const incomingPath = event.path || event.rawPath || "/api";
  const functionPrefix = "/.netlify/functions/api";
  const normalizedPath = incomingPath.startsWith(functionPrefix)
    ? `/api${incomingPath.slice(functionPrefix.length)}`
    : incomingPath;

  try {
    return await expressHandler(
      {
        ...event,
        path: normalizedPath,
        rawPath: normalizedPath,
      },
      context,
    );
  } finally {
    // En funciones serverless, cada invocación cierra su pool para evitar
    // conexiones WebSocket huérfanas entre ejecuciones congeladas.
    await closeDrizzleDatabase();
  }
};
