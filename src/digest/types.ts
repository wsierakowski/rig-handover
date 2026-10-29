// Plan morning-digest § 1. The contract every part of § 2 builds against: change it only with
// the plan. The reader lives next to it: `src/digest/read.ts` exports
// `readNight: ReadNight`, so routes import `readNight` from `./digest/read.js`.

// One line of runs/<night>.jsonl: `status` is one of these, nothing else.
export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in the night.
export type DigestRow = {
  job: string;
  // From the job's last line. `null` stays `null`; views render it as `—`.
  owner: string | null;
  // Lines for this job, whatever their status.
  runs: number;
  // Lines with status `retry`.
  retries: number;
  // Status of the job's last line.
  lastStatus: RunStatus;
  // `error` of the job's most recent line that had one; `null` if none did.
  lastError: string | null;
  // `at` of the job's first and last line, verbatim from the log, offset kept (never UTC).
  firstAt: string;
  lastAt: string;
};

export type DigestNight = {
  // YYYY-MM-DD, the file name without `.jsonl`.
  night: string;
  // Sorted by job, so the page and the JSON agree on order. Empty when nothing ran.
  rows: DigestRow[];
  // Non-blank lines that didn't parse or didn't fit the line shape. Counted, never thrown.
  badLines: number;
};

// `null` when runs/<night>.jsonl doesn't exist (the page answers 404). An empty file is a
// night with no rows, not `null`.
export type ReadNight = (runsDir: string, night: string) => DigestNight | null;
