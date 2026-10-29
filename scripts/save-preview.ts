// Plan morning-digest § 3: save one rig page as one self-contained HTML file (ADR 0001, 0003).
// Renders through the app itself, so the copy is what rig serves. The banner reads LANE_MARKER
// from the environment: unset it to save the clean copy for the clean-up step.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

const [path, out] = process.argv.slice(2);
if (!path || !out) {
  console.error('usage: pnpm preview:save <path> <out.html>   e.g. /digest/2026-10-28 _site/index.html');
  process.exit(2);
}

const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`${path}: ${res.status}`);
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await res.text());
console.log(`saved ${path} -> ${out} (marker: ${process.env.LANE_MARKER?.trim() || 'none'})`);
