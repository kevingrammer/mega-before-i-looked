// Plan morning-digest § 1. Types only: the reader (readNight) is built against this file, and so
// is every part of § 2 (page, JSON, board link, route tests).

// One status per run-log line.
export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing. Times are the strings as logged, offset kept.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  // null when the log has no owner; views render it as `—`.
  owner: string | null;
  // Lines for this job, whatever their status.
  runs: number;
  // Lines for this job with status 'retry'.
  retries: number;
  // Status of the job's latest line.
  lastStatus: RunStatus;
  // Latest error logged for this job; null if it never logged one.
  lastError: string | null;
  // `at` of the job's earliest and latest line, as logged (offset kept, never converted to UTC).
  firstAt: string;
  lastAt: string;
};

// What reading one night gives back.
// - found: false   no runs/<night>.jsonl on disk (routes answer 404).
// - rows: []       the file exists but nothing parsed into a row ("nothing ran").
// - badLines       non-blank lines that didn't parse; counted, never thrown.
export type NightDigest =
  | { found: false; night: string }
  | { found: true; night: string; rows: DigestRow[]; badLines: number };

// night is YYYY-MM-DD; reads <runsDir>/<night>.jsonl. Rows are sorted by job.
export type ReadNight = (runsDir: string, night: string) => NightDigest;
