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

test('device-slide renders at iPhone and iPad sizes', async () => {
  const browser = await puppeteer.launch();
  try {
    // Bootstrap a placeholder capture with Puppeteer itself (no image deps).
    const cap = path.join(here, 'fixtures', 'placeholder-capture.png');
    const p = await browser.newPage();
    await p.setViewport({ width: 1179, height: 2556 });
    await p.setContent('<body style="margin:0;background:#111;color:#B072BB;font:60px sans-serif">CAPTURE</body>');
    await p.screenshot({ path: cap });
    await p.close();

    for (const [w, h, device] of [[1290, 2796, 'iphone'], [2048, 2732, 'ipad']]) {
      const out = path.join(here, 'out', `device-${device}.png`);
      await renderSlide(browser, {
        template: path.join(here, '..', 'templates', 'device-slide.html'),
        data: {
          kicker: 'Settle Up',
          headline: ['Who Pays Who —', 'And How'],
          capture: '../test/fixtures/placeholder-capture.png',
          device, tilt: true,
          cards: [{ x: 0, y: 0, w: 1179, h: 400, left: 60, top: 1400, scale: 0.9 }],
        },
        width: w, height: h, outPath: out,
      });
      const buf = await readFile(out);
      assert.deepEqual(pngSize(buf), { width: w, height: h });
    }
  } finally {
    await browser.close();
  }
});
