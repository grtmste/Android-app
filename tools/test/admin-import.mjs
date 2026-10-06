#!/usr/bin/env node
/**
 * End-to-end: on a FRESH WordPress, upload dist/modafie-theme.zip through Appearance → Themes → Upload,
 * activate it, follow the admin notice and click "Import Modafie demo content". Fails on any error.
 *
 *   node test/admin-import.mjs [--base http://localhost:8080] [--zip ../dist/modafie-theme.zip] [--out ../screenshots/admin]
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const BASE = opt('base', 'http://localhost:8080');
const ZIP = path.resolve(opt('zip', '../dist/modafie-theme.zip'));
const OUT = path.resolve(opt('out', '../screenshots/admin'));
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|wordpress\.org|api\.w\.org|Failed to load resource/.test(m.text())) errors.push(m.text()); });
const step = (s) => console.log(`- ${s}`);

await page.goto(`${BASE}/wp-login.php`);
await page.fill('#user_login', 'admin');
await page.fill('#user_pass', 'admin');
await page.click('#wp-submit');
await page.waitForURL(/wp-admin/);
step('logged in');

await page.goto(`${BASE}/wp-admin/theme-install.php?upload`);
if (!(await page.locator('#install-theme-submit').isVisible())) await page.click('.upload-view-toggle');
await page.setInputFiles('#themezip', ZIP);
await page.click('#install-theme-submit');
await page.waitForSelector('text=Theme installed successfully', { timeout: 120000 });
await page.screenshot({ path: path.join(OUT, '01-theme-uploaded.png') });
step('theme uploaded via Appearance → Themes → Upload');
await page.click('a.activatelink, a:has-text("Activate")');
await page.waitForURL(/themes\.php/);
const notice = page.locator('.mf-import-notice');
await notice.waitFor({ timeout: 15000 });
await page.screenshot({ path: path.join(OUT, '02-activation-notice.png') });
step('theme activated, import notice shown');

await notice.locator('a.button-primary').click();
await page.waitForURL(/page=modafie-import/);
await page.screenshot({ path: path.join(OUT, '03-import-page.png'), fullPage: true });
await page.click('#mf-import-start');
await Promise.race([
  page.waitForSelector('#mf-import-result:not([hidden])', { timeout: 600000 }),
  page.waitForSelector('.mf-import__steps li.is-error', { timeout: 600000 }).then(async () => { throw new Error('Import step failed: ' + await page.locator('.mf-import__steps li.is-error').innerText()); }),
]);
await page.screenshot({ path: path.join(OUT, '04-import-complete.png'), fullPage: true });
const stepText = await page.locator('.mf-import__steps').innerText();
console.log(stepText.split('\n').map((l) => '    ' + l).join('\n'));
step('one-click import completed');
const warnings = await page.locator('#mf-import-log').innerText();
if (warnings.trim()) console.log('Import log:\n' + warnings);

await page.goto(`${BASE}/`);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: path.join(OUT, '05-front-page.png') });
const front = await page.evaluate(() => ({ title: document.title, h1: document.querySelector('h1')?.textContent.trim(), elementor: !!document.querySelector('[data-elementor-type="wp-page"]') }));
console.log('front page:', front);
await browser.close();
if (!front.elementor) { console.error('Front page is not an Elementor page'); process.exit(1); }
if (errors.length) { console.log('Browser errors:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('OK');
