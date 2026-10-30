import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

const NORMAL = '2026-02-01';
const EMPTY = '2026-02-02';
const BAD = '2026-02-03';
const MISSING = '2026-02-04';

// Written out of job order on purpose, so sorting is visible.
const normalLines = [
  '{"at":"2026-02-01T01:00:00+01:00","job":"zeta/last","status":"ok","owner":"rook"}',
  '{"at":"2026-02-01T01:05:00+01:00","job":"alpha/first","status":"retry","owner":"lane-07","error":"upstream 503"}',
  '{"at":"2026-02-01T01:09:00+01:00","job":"alpha/first","status":"ok","owner":"lane-07"}',
  '{"at":"2026-02-01T01:10:00+01:00","job":"mid/job","status":"fail","owner":null,"error":"quota exceeded"}',
];
const badLines = [
  '{"at":"2026-02-03T01:00:00+01:00","job":"solo/job","status":"ok","owner":"rook"}',
  'this is not json',
];

let runsDir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  writeFileSync(join(runsDir, `${NORMAL}.jsonl`), normalLines.join('\n') + '\n');
  writeFileSync(join(runsDir, `${EMPTY}.jsonl`), '');
  writeFileSync(join(runsDir, `${BAD}.jsonl`), badLines.join('\n') + '\n');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

type DigestJson = { night: string; rows: DigestRow[]; badLines: number };

describe('GET /digest/:night', () => {
  it('renders a normal night with its jobs sorted', async () => {
    const res = await app.request(`/digest/${NORMAL}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    const at = ['alpha/first', 'mid/job', 'zeta/last'].map((job) => html.indexOf(job));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request(`/digest/${MISSING}`);
    expect(res.status).toBe(404);
  });

  it('answers 404 for a night that is not YYYY-MM-DD', async () => {
    const res = await app.request('/digest/not-a-night');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty night', async () => {
    const res = await app.request(`/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders 200 when a line is unparseable', async () => {
    const res = await app.request(`/digest/${BAD}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('solo/job');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns night, rows sorted by job, and badLines', async () => {
    const res = await app.request(`/api/digest/${NORMAL}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(body.night).toBe(NORMAL);
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha/first', 'mid/job', 'zeta/last']);
    expect(body.rows[0]).toEqual({
      job: 'alpha/first',
      owner: 'lane-07',
      runs: 2,
      retries: 1,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-02-01T01:05:00+01:00',
      lastAt: '2026-02-01T01:09:00+01:00',
    });
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
  });

  it('returns no rows for an empty night', async () => {
    const res = await app.request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ night: EMPTY, rows: [], badLines: 0 });
  });

  it('counts the bad line and still returns the good rows', async () => {
    const res = await app.request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['solo/job']);
  });
});

describe('page and JSON agree', () => {
  it('lists the same jobs in the same order', async () => {
    const html = await (await app.request(`/digest/${NORMAL}`)).text();
    const body = (await (await app.request(`/api/digest/${NORMAL}`)).json()) as DigestJson;
    const jobs = body.rows.map((r) => r.job);
    const pageOrder = jobs
      .map((job) => ({ job, i: html.indexOf(job) }))
      .sort((a, b) => a.i - b.i)
      .map((x) => x.job);
    expect(jobs.length).toBeGreaterThan(1);
    expect(pageOrder).toEqual(jobs);
  });
});
