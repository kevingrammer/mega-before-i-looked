import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

const tmpDirs: string[] = [];
function tempRunsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  tmpDirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('readNight on runs/2026-10-28.jsonl', () => {
  const digest = readNight('runs', '2026-10-28');
  if (!digest.found) throw new Error('expected runs/2026-10-28.jsonl to exist');
  const row = (job: string) => digest.rows.find((r) => r.job === job);

  it('has 5 jobs, sorted by job, and 1 bad line', () => {
    expect(digest.night).toBe('2026-10-28');
    expect(digest.badLines).toBe(1);
    expect(digest.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts retries and keeps times as logged', () => {
    expect(row('fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(row('lane/sync')).toMatchObject({ runs: 8, retries: 1, lastStatus: 'ok', lastError: 'lock held' });
  });

  it('keeps the failure and its error', () => {
    expect(row('notes/backup')).toMatchObject({ owner: 'lane-07', runs: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row whose owner is null', () => {
    expect(row('digest/render')).toMatchObject({ owner: null, runs: 1, lastStatus: 'ok', lastError: null });
  });
});

describe('readNight edge cases', () => {
  it('reports a missing night as not found', () => {
    expect(readNight(tempRunsDir(), '2026-01-01')).toEqual({ found: false, night: '2026-01-01' });
  });

  it('reads an empty file as found with no rows', () => {
    const dir = tempRunsDir();
    writeFileSync(join(dir, '2026-01-02.jsonl'), '');
    expect(readNight(dir, '2026-01-02')).toEqual({ found: true, night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('ignores blank lines and counts lines of the wrong shape as bad', () => {
    const dir = tempRunsDir();
    writeFileSync(
      join(dir, '2026-01-03.jsonl'),
      [
        '{"at":"2026-01-03T01:00:00+01:00","job":"a","status":"ok","owner":"x"}',
        '',
        '{"at":"2026-01-03T01:00:00+01:00","job":"a","status":"maybe","owner":"x"}',
        '{"at":"2026-01-03T01:00:00+01:00","job":"a","status":"ok"}',
        '[1,2]',
        'not json',
      ].join('\n'),
    );
    const digest = readNight(dir, '2026-01-03');
    expect(digest).toMatchObject({ found: true, badLines: 4 });
    if (digest.found) expect(digest.rows).toHaveLength(1);
  });
});
