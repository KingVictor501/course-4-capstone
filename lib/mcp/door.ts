// lib/mcp/door.ts
// WHAT IT'S FOR: the door's MCP server: the list of abilities a caller with the right key may
// use. Right now it has NONE. The weekly Digest's one read ability is added next, and nothing
// that changes data will ever be added here without an approval step in front of it.
// WHO USES IT: app/api/mcp/route.ts, after the key, host and origin checks have passed.
// WHY THE NAME: the app's one door for workers; ".ts" = no screen code.

// createMcpHandler and McpServer come from the official MCP toolkit (@modelcontextprotocol/server).
import { createMcpHandler, McpServer, type McpHttpHandler } from "@modelcontextprotocol/server";

// Builds the handler. The MCP docs ask for a fresh server for each request, so the function
// passed in runs every time.
export function createDoorHandler(): McpHttpHandler {
  return createMcpHandler(() => new McpServer({ name: "door", version: "1.0.0" }));
}
