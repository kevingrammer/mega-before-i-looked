// Plan morning-digest § 1: the run log reader.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, NightDigest, ReadNight, RunLine, RunStatus } from './types.js';

const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

function isStatus(value: unknown): value is RunStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

// Parse one raw line at the edge. null means a bad line (not JSON, or not a RunLine).
export function parseLine(raw: string): RunLine | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.at !== 'string' || typeof v.job !== 'string' || v.job === '') return null;
  if (!isStatus(v.status)) return null;
  if (v.owner !== null && typeof v.owner !== 'string') return null;
  if (v.error !== undefined && typeof v.error !== 'string') return null;
  const line: RunLine = { at: v.at, job: v.job, status: v.status, owner: v.owner };
  if (v.error !== undefined) line.error = v.error;
  return line;
}

// Lines are taken in file order: the log is appended as jobs run, so the last line for a job is
// its latest. `at` strings are kept exactly as logged (offset kept, never converted to UTC).
export const readNight: ReadNight = (runsDir, night): NightDigest => {
  const path = join(runsDir, `${night}.jsonl`);
  if (!existsSync(path)) return { found: false, night };

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line === null) {
      badLines += 1;
      continue;
    }
    const row = byJob.get(line.job);
    if (row === undefined) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error ?? null,
        firstAt: line.at,
        lastAt: line.at,
      });
      continue;
    }
    row.runs += 1;
    if (line.status === 'retry') row.retries += 1;
    row.lastStatus = line.status;
    if (line.error !== undefined) row.lastError = line.error;
    if (line.owner !== null) row.owner = line.owner;
    row.lastAt = line.at;
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { found: true, night, rows, badLines };
};
