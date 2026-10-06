#!/usr/bin/env node
/**
 * Screenshots every demo page at desktop (1440), tablet (768) and mobile (390), full page.
 * Scrolls first so lazy media and Elementor entrance animations are triggered.
 *
 *   node test/screenshots.mjs [--base http://localhost:8080] [--out ../screenshots/after] [--only home]
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const BASE = opt('base', 'http://localhost:8080').replace(/\/$/, '');
const OUT = path.resolve(opt('out', '../screenshots/after'));
const ONLY = opt('only', null);
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } };
const VP_ONLY = opt('viewports', Object.keys(VIEWPORTS).join(',')).split(',');

const manifest = JSON.parse(await fs.readFile(new URL('../../theme/modafie/demo/manifest.json', import.meta.url), 'utf8'));
const pages = manifest.pages.filter((p) => !ONLY || ONLY.split(',').includes(p.slug));
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  if (!VP_ONLY.includes(vp)) continue;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, isMobile: vp === 'mobile', hasTouch: vp !== 'desktop' });
  for (const p of pages) {
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${vp} ${p.slug}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${vp} ${p.slug}: ${e.message}`));
    const url = p.slug === 'home' ? `${BASE}/` : `${BASE}/${p.slug}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 150)); }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: path.join(OUT, `${p.slug}-${vp}.png`), fullPage: true });
    await page.close();
    console.log(`${p.slug}-${vp}.png`);
  }
  await ctx.close();
}
await browser.close();
if (errors.length) { console.log('Console errors:'); errors.forEach((e) => console.log('  ' + e)); }
