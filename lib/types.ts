// lib/types.ts
// WHAT IT'S FOR: shared "shapes" (TypeScript types) for data that more than one file uses.
// WHO USES IT: app/api/health/route.ts and lib/with-logging.ts.
// WHY THE NAME: "types" = shapes of data; ".ts" because it holds no screen code.
// The weekly Digest adds one shared type per main thing (appointment, proposal, audit line).

// The answer the health route sends when everything works.
// (Being able to answer at all means the app is running AND the database replied.)
export type HealthResponse = {
  status: "ok";
  // The short git commit of the deploy that answered (from Vercel's VERCEL_GIT_COMMIT_SHA),
  // or "local" on my computer. Shows which deploy is live, for example during a rollback.
  version: string;
};

// The body of every error answer: a short code and a short message, never a stack trace.
export type ApiErrorBody = {
  error: {
    code: string; // e.g. "DB_UNREACHABLE"
    message: string; // e.g. "Database unreachable"
  };
};
