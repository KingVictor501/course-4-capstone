// lib/keys.test.ts
// WHAT IT'S FOR: checks the key comparison (lib/keys.ts). Run with `npm test`.
// WHY THE NAME: tests for lib/keys.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidKey } from "./keys";

test("the right key is accepted", () => {
  assert.equal(isValidKey("abc123", "abc123"), true);
});

test("a wrong, empty, or missing key is refused", () => {
  assert.equal(isValidKey("abc124", "abc123"), false);
  assert.equal(isValidKey("", "abc123"), false);
  assert.equal(isValidKey(null, "abc123"), false);
  assert.equal(isValidKey("short", "a much longer expected key"), false);
});

test("if no key is configured on the server, nothing is accepted (not even an empty key)", () => {
  assert.equal(isValidKey("", undefined), false);
  assert.equal(isValidKey("anything", undefined), false);
  assert.equal(isValidKey("", ""), false);
});
