// lib/mcp/tools.test.ts
// WHAT IT'S FOR: checks the MCP reply shape (lib/mcp/tools.ts). Run with `npm test`.
// WHY THE NAME: tests for lib/mcp/tools.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorReply, textReply } from "./tools";

test("replies have the MCP shape, and only errors carry isError", () => {
  assert.deepEqual(textReply("hi"), { content: [{ type: "text", text: "hi" }] });
  assert.equal(errorReply("no").isError, true);
});
