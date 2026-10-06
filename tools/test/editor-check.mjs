#!/usr/bin/env node
/**
 * Opens every demo page (and the footer template) in the Elementor editor and checks that:
 *  - the editor boots without JS errors and the preview renders the page's widgets
 *  - clicking a heading opens its settings panel (i.e. the content is editable)
 *
 *   node test/editor-check.mjs [--base http://localhost:8080] [--out ../screenshots/editor]
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const BASE = opt('base', 'http://localhost:8080');
const OUT = path.resolve(opt('out', '../screenshots/editor'));
await fs.mkdir(OUT, { recursive: true });
const wp = (...a) => execFileSync('docker', ['compose', '-f', new URL('./docker-compose.yml', import.meta.url).pathname, 'exec', '-T', 'cli', 'wp', ...a], { encoding: 'utf8' }).trim();
const map = JSON.parse(wp('option', 'get', 'modafie_demo_map', '--format=json'));
const targets = [...Object.entries(map.pages).map(([slug, id]) => ({ name: slug, id })), { name: 'template-site-footer', id: map.templates['site-footer'] }];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/wp-login.php`);
await page.fill('#user_login', 'admin');
await page.fill('#user_pass', 'admin');
await page.click('#wp-submit');
await page.waitForURL(/wp-admin/);

const results = [];
let failed = false;
for (const t of targets) {
  const errors = [];
  const onErr = (e) => errors.push(e.message || String(e));
  const onConsole = (m) => { if (m.type() === 'error' && !/Failed to load resource|wordpress\.org|elementor\.com|my\.elementor|net::ERR/i.test(m.text())) errors.push(m.text()); };
  page.on('pageerror', onErr);
  page.on('console', onConsole);
  await page.goto(`${BASE}/wp-admin/post.php?post=${t.id}&action=elementor`, { waitUntil: 'domcontentloaded' });
  let widgets = 0;
  let editable = false;
  let panelTitle = '';
  try {
    await page.waitForFunction(() => window.elementor && window.elementor.loaded !== false && document.querySelector('#elementor-preview-iframe'), null, { timeout: 90000 });
    const frame = page.frameLocator('#elementor-preview-iframe');
    await frame.locator('.elementor-edit-area .elementor-element').first().waitFor({ timeout: 90000 });
    // Dismiss any onboarding / announcement dialogs.
    for (const sel of ['.dialog-close-button', '[aria-label="Close"]', 'button:has-text("Skip")', 'button:has-text("Got it")']) {
      const b = page.locator(sel).first();
      if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
    }
    widgets = await frame.locator('.elementor-edit-area .elementor-widget').count();
    const heading = frame.locator('.elementor-edit-area .elementor-widget-heading .elementor-heading-title').first();
    const titleInput = page.locator('#elementor-panel textarea[data-setting="title"], #elementor-controls textarea[data-setting="title"]').first();
    for (let attempt = 0; attempt < 4 && !editable; attempt++) {
      await heading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await heading.click({ force: true });
      await page.waitForTimeout(1200);
      panelTitle = await page.evaluate(() => {
        const el = document.querySelector('#elementor-panel-header-title, .elementor-panel-header-title, #elementor-panel [class*="header-title"]');
        return el ? el.textContent.trim() : '';
      });
      editable = /heading/i.test(panelTitle) || (await titleInput.isVisible().catch(() => false));
    }
    await page.screenshot({ path: path.join(OUT, `${t.name}.png`) });
  } catch (e) {
    errors.push('editor did not load: ' + e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(OUT, `${t.name}-FAILED.png`) }).catch(() => {});
  }
  page.off('pageerror', onErr);
  page.off('console', onConsole);
  const ok = widgets > 0 && editable && !errors.length;
  failed ||= !ok;
  results.push({ ...t, widgets, editable, panelTitle, errors });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${t.name.padEnd(22)} widgets=${String(widgets).padEnd(4)} heading-panel="${panelTitle}" ${errors.length ? 'errors=' + JSON.stringify(errors) : ''}`);
}
await fs.writeFile(path.join(OUT, 'editor-results.json'), JSON.stringify(results, null, 2));
await browser.close();
process.exit(failed ? 1 : 0);
