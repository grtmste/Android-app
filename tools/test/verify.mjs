#!/usr/bin/env node
/**
 * Compares the rebuilt WordPress pages with scrape/content.json and reports anything missing:
 *  - every heading / paragraph / list item / button / link text / form label in the scraped page
 *  - every media file (img src, CSS background, video, inline SVG icon) and every video embed
 *
 *   node test/verify.mjs [--base http://localhost:8080] [--scrape ../scrape] [--out ../screenshots/verify-report.md]
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const BASE = opt('base', 'http://localhost:8080').replace(/\/$/, '');
const SCRAPE = path.resolve(opt('scrape', '../scrape'));
const OUT = path.resolve(opt('out', '../screenshots/verify-report.md'));
const content = JSON.parse(await fs.readFile(path.join(SCRAPE, 'content.json'), 'utf8'));
const norm = (s) => String(s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d\u2033]/g, '"').replace(/[\u2013\u2014\u2212]/g, '-').replace(/\u2026/g, '...').replace(/\s+/g, ' ').trim();
const stem = (file) => path.basename(file).replace(/\.[a-z0-9]+$/i, '').toLowerCase();

function expectations(page) {
  const texts = [];
  const mediaFiles = new Set();
  const svgs = [];
  const embeds = [];
  const walk = (b) => {
    // Marquee strips render each "✦"-separated message as its own item.
    if (['heading', 'paragraph', 'quote', 'button', 'link'].includes(b.type) && b.text) b.text.split(/\s*[✦•|·]\s*/).filter(Boolean).forEach((t) => texts.push({ type: b.type, text: t }));
    if (b.type === 'list') b.items.forEach((i) => texts.push({ type: 'list', text: typeof i === 'string' ? i : i.text }));
    if (b.type === 'form') { b.fields.forEach((f) => f.label && texts.push({ type: 'form-label', text: f.label })); if (b.submit) texts.push({ type: 'form-submit', text: b.submit }); }
    if (b.type === 'table') b.rows.flat().forEach((c) => c && texts.push({ type: 'table', text: c }));
    if ((b.type === 'image' || b.type === 'video') && b.file) mediaFiles.add(b.file);
    if (b.posterFile) mediaFiles.add(b.posterFile);
    if (b.type === 'svg' && b.file) svgs.push(b.file);
    if (b.type === 'embed') embeds.push(b.url);
  };
  for (const s of page.sections) {
    if (s.background && s.background.file) mediaFiles.add(s.background.file);
    if (s.background && s.background.videoFile) mediaFiles.add(s.background.videoFile);
    s.blocks.forEach(walk);
  }
  return { texts, mediaFiles: [...mediaFiles], svgs, embeds };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const lines = ['# Content verification: rebuilt site vs scrape/content.json', '', `- Site: ${BASE}`, `- Source: ${content.source} (${content.pages.length} pages)`, `- Run: ${new Date().toISOString()}`, ''];
let totalMissing = 0;
let totalChecked = 0;
for (const p of content.pages) {
  const url = p.slug === 'home' ? `${BASE}/` : `${BASE}/${p.slug}/`;
  const page = await ctx.newPage();
  const res = await page.goto(url, { waitUntil: 'networkidle' });
  // Scroll through so lazy-loaded backgrounds/images are applied.
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 100)); } });
  await page.waitForTimeout(500);
  const found = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const text = main.textContent + ' ' + [...main.querySelectorAll('input,textarea')].map((i) => i.placeholder).join(' ');
    const urls = new Set();
    main.querySelectorAll('img').forEach((i) => { urls.add(i.currentSrc || i.src); (i.srcset || '').split(',').forEach((s) => urls.add(s.trim().split(' ')[0])); });
    main.querySelectorAll('*').forEach((el) => { const bg = getComputedStyle(el).backgroundImage; if (bg && bg !== 'none') [...bg.matchAll(/url\("?([^")]+)"?\)/g)].forEach((m) => urls.add(m[1])); });
    main.querySelectorAll('video, video source').forEach((v) => urls.add(v.currentSrc || v.src));
    main.querySelectorAll('[data-settings]').forEach((el) => { const m = el.getAttribute('data-settings').match(/https?:[^"]+?\.(mp4|webm|mov)/g); if (m) m.forEach((u) => urls.add(u.replace(/\\\//g, '/'))); });
    const embeds = [...main.querySelectorAll('[data-settings]')].map((el) => el.getAttribute('data-settings')).join(' ') + [...main.querySelectorAll('iframe')].map((f) => f.src).join(' ');
    return { text, urls: [...urls].filter(Boolean), inlineSvgs: main.querySelectorAll('.elementor-icon svg, .elementor-icon-box-icon svg, .elementor-widget-image img[src$=".svg"]').length, embeds };
  });
  const haystack = norm(found.text);
  const exp = expectations(p);
  const missingText = exp.texts.filter((t) => !haystack.includes(norm(t.text)));
  const urlStems = found.urls.map((u) => stem(decodeURIComponent(u.split('?')[0])).replace(/-\d+x\d+$/, '').replace(/-scaled$/, ''));
  const missingMedia = exp.mediaFiles.filter((f) => !urlStems.some((u) => u === stem(f) || u.startsWith(stem(f) + '-')));
  const missingSvgs = Math.max(0, exp.svgs.length - found.inlineSvgs);
  const missingEmbeds = exp.embeds.filter((e) => { const id = (e.match(/(?:v=|vimeo\.com\/)([\w-]+)/) || [])[1]; return !found.embeds.includes(id || e); });
  const missing = missingText.length + missingMedia.length + missingSvgs + missingEmbeds.length;
  const checked = exp.texts.length + exp.mediaFiles.length + exp.svgs.length + exp.embeds.length;
  totalMissing += missing;
  totalChecked += checked;
  lines.push(`## ${p.slug} ${missing ? '❌' : '✅'}`, '', `- URL: ${url} (HTTP ${res.status()})`, `- Text blocks: ${exp.texts.length - missingText.length}/${exp.texts.length}`, `- Media files: ${exp.mediaFiles.length - missingMedia.length}/${exp.mediaFiles.length}`, `- SVG icons: ${exp.svgs.length - missingSvgs}/${exp.svgs.length}`, `- Video embeds: ${exp.embeds.length - missingEmbeds.length}/${exp.embeds.length}`);
  missingText.forEach((t) => lines.push(`  - missing ${t.type}: “${t.text}”`));
  missingMedia.forEach((m) => lines.push(`  - missing media: ${m}`));
  if (missingSvgs) lines.push(`  - missing ${missingSvgs} SVG icon(s)`);
  missingEmbeds.forEach((e) => lines.push(`  - missing embed: ${e}`));
  lines.push('');
  console.log(`${missing ? 'FAIL' : 'OK  '} ${p.slug.padEnd(16)} ${checked - missing}/${checked} items present`);
  await page.close();
}
lines.splice(5, 0, `- **Result: ${totalChecked - totalMissing}/${totalChecked} items present, ${totalMissing} missing**`, '');
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, lines.join('\n'));
await browser.close();
console.log(`${totalChecked - totalMissing}/${totalChecked} present → ${OUT}`);
process.exit(totalMissing ? 1 : 0);
