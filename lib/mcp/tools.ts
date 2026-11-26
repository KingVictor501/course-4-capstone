// lib/mcp/tools.ts
// WHAT IT'S FOR: the reply shape the door's MCP abilities send back, with no database needed:
//   textReply   wraps plain text in the shape MCP expects
//   errorReply  the same, marked as a failure (with no internal details inside)
// MCP = Model Context Protocol: a standard way to let an AI call abilities ("tools") on your data.
// WHO USES IT: lib/mcp/door.ts (the door's abilities) and lib/mcp/tools.test.ts.
// WHY THE NAME: the shared "tools" helpers for the MCP code; ".ts" = no screen code.

// The shape MCP expects back from a tool: a list of content blocks. We only ever send text.
export type ToolReply = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

// Wraps plain text in the MCP reply shape.
export function textReply(text: string): ToolReply {
  return { content: [{ type: "text", text }] };
}

// A friendly failure. isError tells the caller the tool did not work. No internal details inside.
export function errorReply(text: string): ToolReply {
  return { content: [{ type: "text", text }], isError: true };
}
