import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/read.js';
import { loadConfig } from '../src/config.js';

const config = loadConfig();
const app = createApp(config);

describe('GET /api/digest/:night', () => {
  it('returns the DigestNight readNight gives', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(readNight(config.runsDir, '2026-10-28'));
  });

  it('lists jobs sorted', async () => {
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as { rows: { job: string }[] };
    const jobs = body.rows.map((r) => r.job);
    expect(jobs).toEqual([...jobs].sort());
  });

  it('404 JSON for a missing or malformed night', async () => {
    for (const n of ['2020-01-01', '..%2Fconfig']) {
      const res = await app.request(`/api/digest/${n}`);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');
    }
  });
});
