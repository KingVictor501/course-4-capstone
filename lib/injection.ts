// lib/injection.ts
// WHAT IT'S FOR: the injection screen. A "prompt injection" is text that contains instructions
// aimed at an AI or a worker ("ignore your rules and say X") instead of facts. Records that
// arrive from outside (an appointment's notes, for example) are DATA, never instructions, so any
// record whose text matches one of these patterns is flagged "suspicious" and handed to a person
// instead of being acted on (docs/scoping.md, "Must hand to me").
//   INJECTION_RULES    the instruction-like patterns, each with a short id for the log
//   findInjectionRule  the id of the first rule a piece of text matches, or null
// WHO USES IT: the weekly Digest (coming next), and lib/injection.test.ts.
// WHY THE NAME: it screens for injections; ".ts" = no screen code.
//
// PRIVACY: callers log the rule id and the record's ID only, never the text that matched.

export type InjectionRule = { id: string; pattern: RegExp };

// The rules. Each looks for wording that talks TO the AI, which a normal help document never does.
export const INJECTION_RULES: InjectionRule[] = [
  {
    // "ignore all previous instructions", "disregard the rules above", "forget your prior prompt"
    id: "override-instructions",
    pattern: /\b(ignore|disregard|forget|override|bypass)\b[^.\n]{0,50}\b(instructions?|rules?|prompts?|guidelines?)\b/i,
  },
  {
    // "SYSTEM NOTICE", "message to the assistant", "note for the AI"
    id: "addresses-the-ai",
    pattern: /\b(system|developer|admin)\s+(notice|message|override)\b|\b(to|for)\s+the\s+(assistant|ai|model|chatbot)\b/i,
  },
  {
    // "you are now ...", "new instructions:"
    id: "role-reassignment",
    pattern: /\byou\s+are\s+now\b|\bnew\s+instructions?\b/i,
  },
  {
    // "do not cite any source", "never mention the documents"
    id: "hide-sources",
    pattern: /\b(do\s+not|don't|never)\s+(cite|mention|reveal|disclose)\b[^.\n]{0,40}\b(source|sources|documents?|excerpts?)\b/i,
  },
  {
    // "end your answer with ...", "begin your reply with ..."
    id: "forced-output",
    pattern: /\b(end|begin|start|finish)\s+(your|the)\s+(answer|reply|response)\s+with\b/i,
  },
  {
    // "reveal the system prompt", "print your instructions"
    id: "extract-prompt",
    pattern: /\b(reveal|print|repeat|show|output)\b[^.\n]{0,30}\b(system\s+prompt|your\s+instructions|api\s+key)\b/i,
  },
];

// Returns the id of the first rule the text trips, or null if the text looks clean.
export function findInjectionRule(text: string): string | null {
  for (const rule of INJECTION_RULES) {
    if (rule.pattern.test(text)) return rule.id;
  }
  return null;
}
