import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/read.js';

// Route tests for plan morning-digest § 2d. They run against a temp runs dir: runs/ is read-only.
const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const line = (o: object) => JSON.stringify(o);
writeFileSync(
  join(dir, '2026-10-20.jsonl'),
  [
    line({ at: '2026-10-20T01:00:00+01:00', job: 'b-job', status: 'ok', owner: 'rook' }),
    line({ at: '2026-10-20T01:05:00+01:00', job: 'a-job', status: 'retry', owner: null, error: 'timeout' }),
    line({ at: '2026-10-20T01:10:00+01:00', job: 'a-job', status: 'fail', owner: null, error: 'boom' }),
  ].join('\n') + '\n',
);
writeFileSync(join(dir, '2026-10-21.jsonl'), '');
writeFileSync(
  join(dir, '2026-10-22.jsonl'),
  [
    line({ at: '2026-10-22T02:00:00+01:00', job: 'only', status: 'ok', owner: 'rook' }),
    'this is not json',
  ].join('\n') + '\n',
);

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir };
const app = createApp(config);

describe('GET /digest/:night', () => {
  it('200 with the rows sorted by job', async () => {
    const res = await app.request('/digest/2026-10-20');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a-job')).toBeGreaterThan(-1);
    expect(html.indexOf('a-job')).toBeLessThan(html.indexOf('b-job'));
    expect(html).toContain('—');
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty file', async () => {
    const res = await app.request('/digest/2026-10-21');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders a night with a bad line', async () => {
    const res = await app.request('/digest/2026-10-22');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('only');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 with a body equal to the DigestNight', async () => {
    const res = await app.request('/api/digest/2026-10-20');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(readNight(dir, '2026-10-20'));
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('empty night has no rows', async () => {
    const res = await app.request('/api/digest/2026-10-21');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-10-21', rows: [], badLines: 0 });
  });

  it('counts the bad line and keeps the good one', async () => {
    const body = (await (await app.request('/api/digest/2026-10-22')).json()) as { rows: unknown[]; badLines: number };
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(1);
  });

  it('lists the same jobs in the same order as the page', async () => {
    const json = (await (await app.request('/api/digest/2026-10-20')).json()) as { rows: { job: string }[] };
    const html = await (await app.request('/digest/2026-10-20')).text();
    const jobs = json.rows.map((r) => r.job);
    expect(jobs).toEqual(['a-job', 'b-job']);
    expect(html.indexOf(jobs[0]!)).toBeLessThan(html.indexOf(jobs[1]!));
  });
});
