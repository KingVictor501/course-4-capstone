// lib/mcp-auth.ts
// WHAT IT'S FOR: the lock on the live MCP server (/api/mcp). A request must carry the secret
// MCP_API_KEY as "Authorization: Bearer <key>", or it is stopped here, before the MCP code,
// the database, or the request body are touched.
// WHO USES IT: app/api/mcp/route.ts (first line of the handler). Tested by lib/mcp-auth.test.ts.
// WHY THE NAME: the MCP lock; ".ts" = no screen code.

import { ApiError } from "./api-error";
// isValidKey (lib/keys.ts) compares keys in constant time, so timing can't leak the key.
import { isValidKey } from "./keys";
import { log } from "./logger";

// Pulls the key out of an "Authorization: Bearer <key>" header. Returns null if the header is
// missing or not in that shape. "Bearer" is the standard word for "whoever holds this key".
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}

// Call first in the MCP route. Throws (so the route stops) unless the key is right.
export function requireMcpKey(request: Request): void {
  const expected = process.env.MCP_API_KEY;

  // No key configured on the server: refuse everything rather than leave the door open.
  if (!expected) {
    log.error("mcp_key_not_configured", {});
    throw new ApiError(503, "NOT_CONFIGURED", "This feature is not available right now.");
  }

  if (!isValidKey(bearerToken(request.headers.get("authorization")), expected)) {
    // We log THAT a bad key was tried, never the key itself.
    log.warn("mcp_auth_failed", {});
    throw new ApiError(401, "UNAUTHORIZED", "A valid key is required.");
  }
}
