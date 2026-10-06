#!/usr/bin/env node
/**
 * End-to-end test against a local WordPress (tools/test/docker-compose.yml):
 *  1. log in, confirm the activation notice, run the one-click import via the real button
 *  2. (optional) run the import a second time and verify nothing is duplicated
 *  3. screenshot every imported page at 1440 / 768 / 390
 *  4. verify every text string + image of the demo package is present on the page
 *  5. open each page in the Elementor editor and check it loads with editable widgets
 *  6. collect browser console errors
 *
 * Usage: node test/e2e.mjs [--base http://localhost:8080] [--skip-import] [--rerun] [--out ../screenshots/after]
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const BASE = opt('base', 'http://localhost:8080');
const OUT = path.resolve(__dirname, opt('out', '../../screenshots/after'));
const DEMO = path.resolve(__dirname, '../../theme/modafie/demo');
const WIDTHS = { desktop: 1440, tablet: 768, mobile: 390 };
const results = { import: null, rerun: null, pages: [], editor: [], consoleErrors: [], failures: [] };
const fail = (m) => { results.failures.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

async function login(page) {
  await page.goto(`${BASE}/wp-login.php`);
  await page.fill('#user_login', 'admin');
  await page.fill('#user_pass', 'admin');
  await page.click('#wp-submit');
  await page.waitForURL(/wp-admin/);
}

async function runImport(page, label) {
  await page.goto(`${BASE}/wp-admin/themes.php?page=modafie-setup`);
  page.once('dialog', (d) => d.accept());
  const t0 = Date.now();
  await page.click('#modafie-import');
  await page.waitForFunction(() => document.body.classList.contains('modafie-import-complete') || document.querySelector('.modafie-steps .is-error'), null, { timeout: 600000 });
  const errors = await page.$$eval('.modafie-steps .is-error', (els) => els.map((e) => e.textContent.trim()));
  const steps = await page.$$eval('.modafie-steps li', (els) => els.map((e) => ({ step: e.dataset.step, state: e.className, detail: e.querySelector('.modafie-step-detail').textContent })));
  const log = await page.$eval('#modafie-log', (e) => e.innerText).catch(() => '');
  await page.screenshot({ path: path.join(OUT, `admin-import-${label}.png`), fullPage: true });
  const r = { seconds: Math.round((Date.now() - t0) / 1000), steps, errors, log };
  if (errors.length) fail(`${label} import failed: ${errors.join('; ')}`);
  else ok(`${label} import completed in ${r.seconds}s`);
  return r;
}

/** Strings we expect to see rendered, derived from the Elementor JSON of the demo package. */
function expectedFromElements(elements) {
  const texts = [];
  const images = [];
  const walk = (els) => {
    for (const el of els) {
      const s = el.settings || {};
      if (el.widgetType === 'heading' && s.title) texts.push(s.title);
      if (el.widgetType === 'text-editor' && s.editor) texts.push(s.editor.replace(/<[^>]+>/g, ' '));
      if (el.widgetType === 'button' && s.text) texts.push(s.text);
      if (el.widgetType === 'icon-list') for (const i of s.icon_list || []) texts.push(i.text);
      if (el.widgetType === 'nested-accordion') for (const i of s.items || []) texts.push(i.item_title);
      if (el.widgetType === 'html' && s.html) { const m = s.html.match(/<button[^>]*>([^<]+)</); if (m) texts.push(m[1]); }
      for (const k of ['image', 'background_image']) if (s[k]?.url) images.push(s[k].url.match(/media-url:([^}]+)/)?.[1]);
      walk(el.elements || []);
    }
  };
  walk(elements);
  const norm = (t) => t.replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/\s+/g, ' ').trim();
  return { texts: texts.map(norm).filter(Boolean), images: images.filter(Boolean) };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const manifest = JSON.parse(await fs.readFile(path.join(DEMO, 'manifest.json'), 'utf8'));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push({ where: page.url(), text: m.text() }); });
  page.on('pageerror', (e) => results.consoleErrors.push({ where: page.url(), text: 'pageerror: ' + e.message }));

  console.log('Admin + import');
  await login(page);
  await page.goto(`${BASE}/wp-admin/`);
  const notice = await page.locator('.modafie-setup-notice').count();
  notice ? ok('activation notice shown') : console.log('  • activation notice not shown (already imported or dismissed)');
  if (!args.includes('--skip-import')) results.import = await runImport(page, 'first');
  if (args.includes('--rerun')) results.rerun = await runImport(page, 'rerun');

  // Page URLs from WP (by our demo meta) via REST
  const pagesJson = await (await ctx.request.get(`${BASE}/?rest_route=/wp/v2/pages&per_page=100&_fields=id,slug,link,title`)).json();
  const mediaJson = await (await ctx.request.get(`${BASE}/?rest_route=/wp/v2/media&per_page=100&_fields=id,source_url`)).json();
  const tplCount = (await (await ctx.request.get(`${BASE}/?rest_route=/wp/v2/elementor_library&per_page=100&_fields=id`)).json().catch(() => [])).length;
  console.log(`\nSite has ${pagesJson.length} pages, ${mediaJson.length} media items`);
  const dupSlugs = pagesJson.filter((p) => /-\d+$/.test(p.slug) && pagesJson.some((q) => q.slug === p.slug.replace(/-\d+$/, '')));
  dupSlugs.length ? fail(`duplicate pages: ${dupSlugs.map((p) => p.slug).join(', ')}`) : ok('no duplicate pages');
  if (mediaJson.length > manifest.media.length) fail(`media count ${mediaJson.length} > package ${manifest.media.length} (duplicates?)`); else ok(`media count matches package (${mediaJson.length}/${manifest.media.length})`);
  results.counts = { pages: pagesJson.length, media: mediaJson.length, templates: tplCount };

  console.log('\nFront end');
  for (const mp of manifest.pages) {
    const wp = pagesJson.find((p) => p.slug === mp.slug);
    if (!wp) { fail(`page ${mp.slug} missing`); continue; }
    const url = mp.front ? `${BASE}/` : wp.link;
    const elements = JSON.parse(await fs.readFile(path.join(DEMO, mp.file), 'utf8'));
    const expected = expectedFromElements(elements);
    const pr = { slug: mp.slug, url, shots: {}, missingText: [], missingImages: [] };
    for (const [name, width] of Object.entries(WIDTHS)) {
      const p2 = await browser.newPage({ viewport: { width, height: name === 'mobile' ? 844 : 900 }, isMobile: name === 'mobile', hasTouch: name !== 'desktop' });
      p2.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push({ where: url + ` @${width}`, text: m.text() }); });
      p2.on('pageerror', (e) => results.consoleErrors.push({ where: url + ` @${width}`, text: 'pageerror: ' + e.message }));
      await p2.goto(url, { waitUntil: 'networkidle' });
      // scroll through to trigger entrance animations + lazy media, then return to top
      await p2.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } window.scrollTo(0, document.body.scrollHeight); await new Promise((r) => setTimeout(r, 1200)); window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 1300)); });
      const file = `${mp.slug}-${name}.png`;
      await p2.screenshot({ path: path.join(OUT, file), fullPage: true });
      pr.shots[name] = file;
      if (name === 'desktop') {
        const body = (await p2.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').toLowerCase();
        for (const t of expected.texts) if (!body.includes(t.toLowerCase().slice(0, 80))) pr.missingText.push(t);
        const html = await p2.content();
        for (const key of expected.images) { const stem = key.replace(/\.[a-z0-9]+$/i, ''); if (!html.includes(stem)) pr.missingImages.push(key); }
        const hScroll = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (hScroll) fail(`${mp.slug}: horizontal scroll at ${width}px`);
      } else {
        const hScroll = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (hScroll) fail(`${mp.slug}: horizontal scroll at ${width}px`);
      }
      await p2.close();
    }
    pr.missingText.length ? fail(`${mp.slug}: missing text ${JSON.stringify(pr.missingText.slice(0, 5))}`) : ok(`${mp.slug}: all ${expected.texts.length} text strings rendered`);
    pr.missingImages.length ? fail(`${mp.slug}: missing images ${pr.missingImages.join(', ')}`) : ok(`${mp.slug}: all ${expected.images.length} images rendered`);
    results.pages.push(pr);
  }

  console.log('\nElementor editor');
  for (const mp of manifest.pages) {
    const wp = pagesJson.find((p) => p.slug === mp.slug);
    if (!wp) continue;
    const errs = [];
    const onErr = (e) => errs.push(e.message);
    page.on('pageerror', onErr);
    await page.goto(`${BASE}/wp-admin/post.php?post=${wp.id}&action=elementor`, { waitUntil: 'domcontentloaded' });
    let loaded = false;
    let widgets = 0;
    try {
      await page.waitForFunction(() => window.elementor && window.elementor.documents && window.elementor.documents.getCurrent && window.elementor.documents.getCurrent()?.container, null, { timeout: 90000 });
      const frame = page.frameLocator('#elementor-preview-iframe');
      await frame.locator('.elementor-widget').first().waitFor({ timeout: 60000 });
      widgets = await frame.locator('.elementor-widget').count();
      // click a heading → panel should show its controls (= editable)
      // click a heading in the preview; the panel must switch to "Edit Heading" with an editable Title
      const titleField = page.locator('#elementor-panel .elementor-control-title textarea:visible').first();
      for (let attempt = 0; attempt < 4; attempt++) {
        await page.waitForTimeout(2500);
        await frame.locator('.elementor-widget-heading').nth(attempt % 2).click({ timeout: 10000 }).catch(() => {});
        if (await titleField.isVisible().catch(() => false)) break;
      }
      await titleField.waitFor({ timeout: 10000 });
      loaded = true;
      if (mp.front) await page.screenshot({ path: path.join(OUT, `editor-${mp.slug}.png`) });
    } catch (e) {
      await page.screenshot({ path: path.join(OUT, `editor-fail-${mp.slug}.png`) }).catch(() => {});
      errs.push('editor: ' + e.message.split('\n')[0]);
    }
    page.off('pageerror', onErr);
    results.editor.push({ slug: mp.slug, loaded, widgets, errors: errs });
    loaded && !errs.length ? ok(`${mp.slug}: editor loaded, ${widgets} widgets, heading editable`) : fail(`${mp.slug}: editor problem ${errs.join(' | ')}`);
  }

  // Templates library
  await page.goto(`${BASE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=library`);
  results.counts.templatesListed = await page.locator('#the-list tr').count();
  await page.screenshot({ path: path.join(OUT, 'admin-templates.png') });

  await browser.close();
  const ignorable = (t) => /favicon|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|net::ERR_|wordpress\.org|elementor\.com|api\.wordpress|mixpanel|Failed to load resource/i.test(t);
  results.consoleErrorsRelevant = results.consoleErrors.filter((e) => !ignorable(e.text));
  await fs.writeFile(path.join(OUT, 'e2e-results.json'), JSON.stringify(results, null, 2));
  console.log(`\nConsole errors: ${results.consoleErrors.length} total, ${results.consoleErrorsRelevant.length} relevant`);
  for (const e of results.consoleErrorsRelevant.slice(0, 20)) console.log('   - ' + e.where + ': ' + e.text.slice(0, 200));
  console.log(`Failures: ${results.failures.length}`);
  process.exit(results.failures.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
