import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { renderSlide } from '../render.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// PNG stores width/height big-endian at fixed IHDR offsets.
export function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('renderSlide produces an exact-size PNG with injected data', async () => {
  const out = path.join(here, 'out', 'minimal.png');
  await rm(path.dirname(out), { recursive: true, force: true });
  const browser = await puppeteer.launch();
  try {
    await renderSlide(browser, {
      template: path.join(here, 'fixtures', 'minimal.html'),
      data: { headline: 'HELLO-TOKEN' },
      width: 1290,
      height: 2796,
      outPath: out,
    });
  } finally {
    await browser.close();
  }
  const buf = await readFile(out);
  assert.deepEqual(pngSize(buf), { width: 1290, height: 2796 });
});
