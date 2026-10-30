// Plan morning-digest § 2c: status counts for the board.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';
import type { RunStatus } from './types.js';

export type StatusCounts = Record<RunStatus, number>;

// Count of parsed log lines with each status in <runsDir>/<night>.jsonl. Bad lines count for
// nothing. null when the file is missing or unreadable.
export function countStatuses(runsDir: string, night: string): StatusCounts | null {
  const path = join(runsDir, `${night}.jsonl`);
  if (!existsSync(path)) return null;
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line !== null) counts[line.status] += 1;
  }
  return counts;
}
