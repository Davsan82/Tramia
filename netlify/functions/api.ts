import serverless from "serverless-http";
import { app } from "../../server";

const expressHandler = serverless(app);

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
  const incomingPath = event.path || event.rawPath || "/api";
  const functionPrefix = "/.netlify/functions/api";
  const normalizedPath = incomingPath.startsWith(functionPrefix)
    ? `/api${incomingPath.slice(functionPrefix.length)}`
    : incomingPath;

  return expressHandler(
    {
      ...event,
      path: normalizedPath,
      rawPath: normalizedPath,
    },
    context,
  );
};
