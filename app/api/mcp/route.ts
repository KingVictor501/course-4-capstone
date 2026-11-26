// app/api/mcp/route.ts
// WHAT IT'S FOR: the app's one door for workers, at <live address>/api/mcp. A worker connects
// here with the door's key (MCP_API_KEY) and gets the abilities listed in lib/mcp/door.ts.
// WHO USES IT: MCP clients such as Claude Code. Not linked from any page.
// WHY THE NAME: folder path = URL (app/api/mcp -> /api/mcp); "route.ts" is the Next.js name
// for an API route file.
//
// ORDER MATTERS. Every request goes through these steps, in this order:
//   1. the key check (lib/mcp-auth.ts): nothing else runs without the right key,
//   2. the host and origin checks from the MCP toolkit,
//   3. the MCP handler, which reads the request and runs the ability.

import {
  hostHeaderValidationResponse,
  localhostAllowedHostnames,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { requireMcpKey } from "@/lib/mcp-auth";
import { createDoorHandler } from "@/lib/mcp/door";
import { withLogging } from "@/lib/with-logging";

// Never cache: every call reads the latest data.
export const dynamic = "force-dynamic";

// Built once and reused (the docs advise creating it outside the request).
const handler = createDoorHandler();

// Which addresses may be used to reach this server. VERCEL_PROJECT_PRODUCTION_URL is set by
// Vercel itself (for example "my-app.vercel.app", no https://), so nothing is typed into
// the code. "localhost" is allowed only off production, for testing on my computer.
function allowedHostnames(): string[] {
  const names: string[] = [];
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) names.push(production);
  if (process.env.VERCEL_ENV !== "production") names.push(...localhostAllowedHostnames());
  return names;
}

// The one function behind GET, POST and DELETE. withLogging adds request_done and safe errors.
const handle = withLogging("/api/mcp", async (request: Request) => {
  // 1. The key check. A wrong or missing key stops here with a 401 (or 503 if not configured).
  requireMcpKey(request);

  // 2. Host and origin checks. Each returns a ready-made refusal, or undefined if all is well.
  const hosts = allowedHostnames();
  const badHost = hostHeaderValidationResponse(request, hosts);
  if (badHost) return badHost;
  const badOrigin = originValidationResponse(request, hosts);
  if (badOrigin) return badOrigin;

  // 3. Hand the request to the MCP toolkit, which answers it.
  return handler.fetch(request);
});

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
