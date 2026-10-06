#!/usr/bin/env node
/**
 * Modafie site scraper.
 *
 * Discovers every URL (robots.txt -> sitemaps -> recursive link crawl), renders each
 * page in headless Chromium, scrolls to trigger lazy media, then writes:
 *
 *   <out>/content.json               one entry per page (sections, blocks, media refs)
 *   <out>/media/{images,videos,svg,fonts}/   deduplicated by sha256, clean filenames
 *   <out>/screenshots/<slug>-{desktop,mobile}.png
 *   <out>/report.md
 *
 * Usage:
 *   node scraper/crawl.mjs --base https://www.modafie.io --out ../scrape [--delay 1000]
 *        [--max-pages 500] [--no-screenshots] [--retries 3]
 */
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { extractPage } from './extract.mjs';

// ---------------------------------------------------------------- options
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const BASE = new URL(opt('base', 'https://www.modafie.io'));
const OUT = path.resolve(opt('out', '../scrape'));
const DELAY = Number(opt('delay', 1000));
const MAX_PAGES = Number(opt('max-pages', 500));
const RETRIES = Number(opt('retries', 3));
const SCREENSHOTS = !argv.includes('--no-screenshots');
const UA = 'ModafieSiteMigrator/1.0 (+content owner migration; Playwright)';
const EXEC = process.env.CHROMIUM_PATH || undefined; // e.g. /opt/pw-browsers/chromium if the pinned build is missing

const hostAliases = new Set([BASE.hostname, BASE.hostname.replace(/^www\./, ''), 'www.' + BASE.hostname.replace(/^www\./, '')]);
const failures = [];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---------------------------------------------------------------- rate limiter
let lastRequest = 0;
async function throttle() {
  const wait = lastRequest + DELAY - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

async function withRetry(label, fn) {
  let err;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      err = e;
      if (/^HTTP (4(?!29)\d\d)/.test(e.message)) break; // permanent client errors: no retry
      log(`  ! ${label} failed (attempt ${attempt}/${RETRIES}): ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw err;
}

async function fetchText(url) {
  await throttle();
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ---------------------------------------------------------------- URL helpers
const SKIP_EXT = /\.(pdf|zip|rar|7z|docx?|xlsx?|pptx?|jpe?g|png|gif|webp|avif|svg|mp4|webm|mov|mp3|wav|ico|xml|txt|css|js|json|woff2?|ttf|otf|eot)$/i;
const TRACKING = /^(utm_|fbclid|gclid|mc_|_hs|ref$|srsltid)/i;

export function normalizeUrl(raw, from = BASE.href) {
  let u;
  try { u = new URL(raw, from); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (!hostAliases.has(u.hostname)) return null;
  u.hostname = BASE.hostname;
  u.protocol = BASE.protocol;
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.replace(/\/+$/, '');
  return u.href;
}

export function slugFor(url) {
  const u = new URL(url);
  let s = decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, '');
  if (!s) return 'home';
  s = s.replace(/\.(html?|php|aspx?)$/i, '').toLowerCase().replace(/[^a-z0-9/_-]+/g, '-').replace(/\//g, '--');
  if (u.search) s += '--' + crypto.createHash('md5').update(u.search).digest('hex').slice(0, 6);
  return s.replace(/-{3,}/g, '--').slice(0, 120);
}

// ---------------------------------------------------------------- robots + sitemaps
function parseRobots(txt) {
  const groups = [];
  let cur = null;
  const sitemaps = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = line.replace(/#.*/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    const key = k.toLowerCase();
    if (key === 'sitemap') sitemaps.push(v.trim());
    else if (key === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(v.trim().toLowerCase());
    } else if ((key === 'disallow' || key === 'allow') && cur) cur.rules.push({ allow: key === 'allow', path: v.trim() });
  }
  const g = groups.find((x) => x.agents.some((a) => a !== '*' && UA.toLowerCase().includes(a))) || groups.find((x) => x.agents.includes('*'));
  const rules = (g ? g.rules : []).filter((r) => r.path);
  const toRe = (p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
  const compiled = rules.map((r) => ({ ...r, re: toRe(r.path), len: r.path.length }));
  return {
    sitemaps,
    rules,
    allowed(url) {
      const p = new URL(url).pathname + new URL(url).search;
      let best = null;
      for (const r of compiled) if (r.re.test(p) && (!best || r.len > best.len || (r.len === best.len && r.allow))) best = r;
      return !best || best.allow;
    },
  };
}

async function readSitemap(url, seen, found) {
  if (seen.has(url) || seen.size > 200) return;
  seen.add(url);
  let xml;
  try { xml = await withRetry(`sitemap ${url}`, () => fetchText(url)); } catch (e) { failures.push({ type: 'sitemap', url, error: e.message }); return; }
  const locs = [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, '&'));
  if (/<sitemapindex/i.test(xml)) {
    for (const l of locs) await readSitemap(l, seen, found);
  } else {
    for (const l of locs) found.add(l);
  }
}

// ---------------------------------------------------------------- media store
const MEDIA_DIRS = { images: 'images', videos: 'videos', svg: 'svg', fonts: 'fonts' };
const media = new Map();        // sha256 -> record
const mediaByUrl = new Map();   // source url -> sha256
const skippedMedia = [];
const OPEN_FONT_HOSTS = /(^|\.)fonts\.gstatic\.com$|(^|\.)fonts\.bunny\.net$|(^|\.)use\.fontawesome\.com$/;

function kindFor(contentType, url) {
  const ct = (contentType || '').toLowerCase();
  const p = new URL(url).pathname.toLowerCase();
  if (ct.includes('svg') || p.endsWith('.svg')) return 'svg';
  if (ct.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|ico|bmp)$/.test(p)) return 'images';
  if (ct.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/.test(p)) return 'videos';
  if (ct.includes('font') || /\.(woff2?|ttf|otf|eot)$/.test(p)) return 'fonts';
  return null;
}
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf', 'application/font-woff2': 'woff2', 'application/font-woff': 'woff' };

function cleanBase(url, hint) {
  const u = new URL(url);
  let name = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || 'file');
  // CDN transform URLs (Wix: /media/abc.jpg/v1/fill/..../name.jpg) -> keep meaningful segment
  if (/^v1$/.test(name) || name.length < 3) name = decodeURIComponent(u.pathname.split('/').filter(Boolean).slice(-3)[0] || name);
  name = name.replace(/\.[a-z0-9]{2,5}$/i, '');
  if (hint && (/^[a-f0-9_-]{16,}$/i.test(name) || /^(image|img|file|download|\d+)$/i.test(name))) name = hint;
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
}

async function storeMedia(url, buf, contentType, { alt = '', hint = '' } = {}) {
  const kind = kindFor(contentType, url);
  if (!kind) return null;
  if (kind === 'fonts' && !OPEN_FONT_HOSTS.test(new URL(url).hostname)) {
    if (!skippedMedia.find((s) => s.url === url)) skippedMedia.push({ url, reason: 'font licence not verifiable (not from an open-font CDN) - referenced only' });
    return null;
  }
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  mediaByUrl.set(url, sha);
  if (media.has(sha)) {
    const rec = media.get(sha);
    if (!rec.sources.includes(url)) rec.sources.push(url);
    if (alt && !rec.alt) rec.alt = alt;
    return rec;
  }
  let ext = EXT[(contentType || '').split(';')[0].trim()] || (new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i) || [])[1] || 'bin';
  ext = ext.toLowerCase().replace('jpeg', 'jpg');
  let base = cleanBase(url, hint || alt);
  let file = `${MEDIA_DIRS[kind]}/${base}.${ext}`;
  let n = 2;
  while ([...media.values()].some((m) => m.file === file)) file = `${MEDIA_DIRS[kind]}/${base}-${n++}.${ext}`;
  await fs.writeFile(path.join(OUT, 'media', file), buf);
  const rec = { id: sha.slice(0, 16), sha256: sha, file, kind, contentType: (contentType || '').split(';')[0], bytes: buf.length, url, sources: [url], alt, width: null, height: null };
  media.set(sha, rec);
  return rec;
}

/** Best-effort "original size" variant for well-known CDNs. */
export function upgradeMediaUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'static.wixstatic.com') {
      const m = u.pathname.match(/^(\/media\/[^/]+)\/v1\//);
      if (m) return u.origin + m[1];
    }
    if (/squarespace-cdn\.com$/.test(u.hostname) && u.searchParams.has('format')) { u.searchParams.set('format', '2500w'); return u.href; }
    if (/cdn\.shopify\.com$/.test(u.hostname) || u.pathname.includes('/cdn/shop/')) {
      u.pathname = u.pathname.replace(/_(\d+x\d*|\d*x\d+|pico|icon|thumb|small|compact|medium|large|grande)(?=\.[a-z]+$)/i, '');
      u.searchParams.delete('width'); u.searchParams.delete('height'); return u.href;
    }
    if (/\.(webflow|website-files)\.com$/.test(u.hostname) || u.hostname.endsWith('.webflow.io')) {
      u.pathname = u.pathname.replace(/-p-\d+(?=\.[a-z]+$)/i, ''); return u.href;
    }
    if (u.pathname.includes('/wp-content/uploads/')) { u.pathname = u.pathname.replace(/-\d+x\d+(?=\.[a-z]+$)/i, '').replace(/-scaled(?=\.[a-z]+$)/i, ''); return u.href; }
  } catch { /* ignore */ }
  return url;
}

async function download(url, meta = {}) {
  if (mediaByUrl.has(url)) return media.get(mediaByUrl.get(url));
  if (url.startsWith('data:')) {
    const m = url.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
    if (!m) return null;
    const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
    if (buf.length < 200) return null; // 1px spacers / blur placeholders
    return storeMedia(`https://inline.local/${crypto.createHash('md5').update(buf).digest('hex')}.${m[1].split('/')[1].replace('+xml', '')}`, buf, m[1], meta);
  }
  const candidates = [...new Set([upgradeMediaUrl(url), url])];
  for (const c of candidates) {
    try {
      const rec = await withRetry(`media ${c}`, async () => {
        await throttle();
        const res = await fetch(c, { headers: { 'user-agent': UA, referer: BASE.href } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        return storeMedia(c, buf, res.headers.get('content-type'), meta);
      });
      if (rec) { mediaByUrl.set(url, rec.sha256); return rec; }
    } catch (e) {
      if (c === candidates[candidates.length - 1]) failures.push({ type: 'media', url, error: e.message });
    }
  }
  return null;
}

// ---------------------------------------------------------------- page rendering
async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
    let last = -1;
    for (let i = 0; i < 400; i++) {
      window.scrollBy({ top: step, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 120));
      const y = window.scrollY + window.innerHeight;
      if (y >= document.documentElement.scrollHeight - 2) {
        if (last === document.documentElement.scrollHeight) break;
        last = document.documentElement.scrollHeight;
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

async function dismissOverlays(page) {
  const labels = [/accept( all)?/i, /agree/i, /got it/i, /allow all/i, /^ok$/i, /close/i];
  for (const re of labels) {
    const btn = page.getByRole('button', { name: re }).first();
    if (await btn.isVisible({ timeout: 300 }).catch(() => false)) await btn.click({ timeout: 1000 }).catch(() => {});
  }
}

async function renderPage(context, url, captured) {
  const page = await context.newPage();
  const onResponse = async (res) => {
    try {
      const rt = res.request().resourceType();
      if (!['image', 'media', 'font'].includes(rt) || res.status() >= 300) return;
      const u = res.url();
      if (captured.has(u)) return;
      const body = await res.body().catch(() => null);
      if (body && body.length > 200) captured.set(u, { body, ct: res.headers()['content-type'] || '' });
    } catch { /* ignore */ }
  };
  page.on('response', onResponse);
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  try {
    await throttle();
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await dismissOverlays(page);
    await autoScroll(page);
    const status = resp ? resp.status() : 0;
    const finalUrl = page.url();
    const data = await page.evaluate(extractPage);
    return { page, status, finalUrl, data, consoleErrors };
  } catch (e) {
    await page.close();
    throw e;
  }
}

// ---------------------------------------------------------------- main
async function main() {
  for (const d of ['media/images', 'media/videos', 'media/svg', 'media/fonts', 'screenshots']) await fs.mkdir(path.join(OUT, d), { recursive: true });
  const started = Date.now();
  log(`Scraping ${BASE.href} -> ${OUT} (delay ${DELAY}ms)`);

  // 1. robots + sitemaps
  let robots = parseRobots('');
  try { robots = parseRobots(await withRetry('robots.txt', () => fetchText(new URL('/robots.txt', BASE).href))); log(`robots.txt: ${robots.rules.length} rules, ${robots.sitemaps.length} sitemaps`); }
  catch (e) { failures.push({ type: 'robots', url: '/robots.txt', error: e.message }); }
  const sitemapUrls = new Set(robots.sitemaps);
  for (const p of ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml', '/wp-sitemap.xml']) sitemapUrls.add(new URL(p, BASE).href);
  const fromSitemaps = new Set();
  const seenSitemaps = new Set();
  for (const s of sitemapUrls) await readSitemap(s, seenSitemaps, fromSitemaps);
  // sitemap 404s for guessed locations are expected; drop them from failures unless declared in robots
  for (let i = failures.length - 1; i >= 0; i--) if (failures[i].type === 'sitemap' && !robots.sitemaps.includes(failures[i].url)) failures.splice(i, 1);
  log(`sitemaps: ${seenSitemaps.size} read, ${fromSitemaps.size} URLs`);

  const queue = [];
  const queued = new Set();
  const disallowed = [];
  const enqueue = (raw, from) => {
    const n = normalizeUrl(raw, from);
    if (!n || queued.has(n) || SKIP_EXT.test(new URL(n).pathname)) return;
    if (/\/(wp-admin|wp-login|cart|checkout|my-account|account|login|logout|search)(\/|$)/i.test(new URL(n).pathname)) return;
    queued.add(n);
    if (!robots.allowed(n)) { disallowed.push(n); return; }
    queue.push({ url: n, via: from ? 'link' : 'sitemap' });
  };
  enqueue(BASE.href);
  for (const u of fromSitemaps) enqueue(u);

  // 2. crawl
  const browser = await chromium.launch({ executablePath: EXEC });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: `${UA} Chrome`, deviceScaleFactor: 1 });
  const mobile = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const pages = [];
  const finalSeen = new Set();
  const site = { base: BASE.href, crawledAt: new Date().toISOString(), favicon: null, logo: null, brand: null, fonts: null, nav: null, footer: null };

  while (queue.length && pages.length < MAX_PAGES) {
    const { url, via } = queue.shift();
    log(`[${pages.length + 1}/${pages.length + queue.length + 1}] ${url}`);
    const captured = new Map();
    let r;
    try { r = await withRetry(`page ${url}`, () => renderPage(desktop, url, captured)); }
    catch (e) { failures.push({ type: 'page', url, error: e.message }); continue; }
    const { page, status, finalUrl, data, consoleErrors } = r;
    const canonical = normalizeUrl(finalUrl) || finalUrl;
    if (status >= 400) { failures.push({ type: 'page', url, error: `HTTP ${status}` }); await page.close(); continue; }
    if (finalSeen.has(canonical)) { await page.close(); continue; } // redirect duplicate
    finalSeen.add(canonical);
    for (const l of data.links) enqueue(l, finalUrl);

    // media: save browser-captured responses first, then anything referenced but not loaded
    const refs = new Map(); // url -> meta
    for (const m of data.media) if (!refs.has(m.url)) refs.set(m.url, m);
    for (const [u, { body, ct }] of captured) {
      const meta = refs.get(u) || {};
      const better = upgradeMediaUrl(u);
      if (better !== u && !captured.has(better)) continue; // download the original-size variant instead
      if (!mediaByUrl.has(u)) await storeMedia(u, body, ct, { alt: meta.alt || '' });
    }
    for (const [u, meta] of refs) {
      if (meta.kind === 'embed' || meta.kind === 'inline-svg') continue;
      if (!mediaByUrl.has(u)) await download(u, { alt: meta.alt || '' });
    }
    // inline SVG icons -> files
    for (const m of data.media.filter((x) => x.kind === 'inline-svg')) {
      const buf = Buffer.from(m.svg);
      const rec = await storeMedia(`https://inline.local/${crypto.createHash('md5').update(buf).digest('hex')}.svg`, buf, 'image/svg+xml', { hint: m.hint || 'icon' });
      if (rec) m.url = rec.url;
    }
    const resolve = (u) => { const sha = mediaByUrl.get(u) || mediaByUrl.get(upgradeMediaUrl(u)); return sha ? media.get(sha) : null; };
    for (const m of data.media) {
      const rec = m.url && resolve(m.url);
      if (rec) { m.mediaId = rec.id; m.file = rec.file; if (m.width && !rec.width) { rec.width = m.width; rec.height = m.height; } }
    }
    const attach = (b) => {
      if (b.src) { const rec = resolve(b.src); if (rec) { b.mediaId = rec.id; b.file = rec.file; } }
      if (b.poster) { const rec = resolve(b.poster); if (rec) { b.posterMediaId = rec.id; b.posterFile = rec.file; } }
      if (b.svg) { const rec = resolve(`https://inline.local/${crypto.createHash('md5').update(Buffer.from(b.svg)).digest('hex')}.svg`); if (rec) { b.mediaId = rec.id; b.file = rec.file; delete b.svg; } }
      if (b.items) b.items.forEach((i) => typeof i === 'object' && attach(i));
    };
    for (const s of data.sections) {
      if (s.background && s.background.image) { const rec = resolve(s.background.image); if (rec) { s.background.mediaId = rec.id; s.background.file = rec.file; } }
      if (s.background && s.background.video) { const rec = resolve(s.background.video); if (rec) { s.background.videoMediaId = rec.id; s.background.videoFile = rec.file; } }
      s.blocks.forEach(attach);
    }

    // site-wide bits from the first page
    if (!site.brand) {
      site.brand = data.brand; site.fonts = data.fonts; site.nav = data.nav; site.footer = data.footerLinks;
      site.headerBlocks = data.header; site.footerBlocks = data.footer;
      site.headerBlocks.forEach(attach); site.footerBlocks.forEach(attach);
      if (data.favicon) { const rec = resolve(data.favicon) || await download(data.favicon, { hint: 'favicon' }); site.favicon = rec ? { url: data.favicon, mediaId: rec.id, file: rec.file } : { url: data.favicon }; }
      if (data.logo) { const rec = data.logo.src ? (resolve(data.logo.src) || await download(data.logo.src, { hint: 'logo' })) : null; site.logo = { ...data.logo, mediaId: rec && rec.id, file: rec && rec.file }; if (site.logo.svg && !site.logo.file) { const buf = Buffer.from(site.logo.svg); const r2 = await storeMedia('https://inline.local/logo.svg', buf, 'image/svg+xml', { hint: 'logo' }); if (r2) { site.logo.mediaId = r2.id; site.logo.file = r2.file; } } }
    }

    const slug = slugFor(canonical);
    const entry = {
      url: canonical, requestedUrl: url, discoveredVia: via, slug, status,
      title: data.title, meta: data.meta, lang: data.lang,
      headings: data.headings, sections: data.sections,
      media: data.media.filter((m) => m.mediaId || m.kind === 'embed').map(({ svg, ...m }) => m),
      forms: data.forms, consoleErrors,
      screenshots: {},
    };
    if (SCREENSHOTS) {
      try {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(OUT, 'screenshots', `${slug}-desktop.png`), fullPage: true, timeout: 60000 });
        entry.screenshots.desktop = `screenshots/${slug}-desktop.png`;
      } catch (e) { failures.push({ type: 'screenshot', url, error: `desktop: ${e.message}` }); }
    }
    await page.close();
    if (SCREENSHOTS) {
      try {
        await withRetry(`mobile ${url}`, async () => {
          const mp = await mobile.newPage();
          try {
            await throttle();
            await mp.goto(canonical, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await mp.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
            await dismissOverlays(mp);
            await autoScroll(mp);
            await mp.screenshot({ path: path.join(OUT, 'screenshots', `${slug}-mobile.png`), fullPage: true, timeout: 60000 });
          } finally { await mp.close(); }
        });
        entry.screenshots.mobile = `screenshots/${slug}-mobile.png`;
      } catch (e) { failures.push({ type: 'screenshot', url, error: `mobile: ${e.message}` }); }
    }
    pages.push(entry);
  }
  await browser.close();

  // 3. outputs
  const mediaList = [...media.values()];
  // read image dimensions for files we never saw rendered
  for (const m of mediaList) if (m.kind === 'images') Object.assign(m, imageSize(await fs.readFile(path.join(OUT, 'media', m.file))) || {});
  const content = { generator: 'modafie-scraper/1.0', source: 'live', site, pages, media: Object.fromEntries(mediaList.map((m) => [m.id, m])) };
  await fs.writeFile(path.join(OUT, 'content.json'), JSON.stringify(content, null, 2));
  await writeReport({ pages, mediaList, disallowed, started, fromSitemaps, seenSitemaps, robots });
  log(`Done: ${pages.length} pages, ${mediaList.length} media files, ${failures.length} failures`);
}

function imageSize(buf) {
  try {
    if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (buf.toString('ascii', 0, 3) === 'GIF') return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const t = buf.toString('ascii', 12, 16);
      if (t === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (t === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (t === 'VP8L') { const b = buf.readUInt32LE(21); return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }; }
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
        i += 2 + len;
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function writeReport({ pages, mediaList, disallowed, started, fromSitemaps, seenSitemaps, robots }) {
  const byKind = {};
  for (const m of mediaList) { byKind[m.kind] ??= { count: 0, bytes: 0 }; byKind[m.kind].count++; byKind[m.kind].bytes += m.bytes; }
  const total = mediaList.reduce((a, m) => a + m.bytes, 0);
  const mb = (b) => (b / 1048576).toFixed(2) + ' MB';
  const embeds = pages.flatMap((p) => p.media.filter((m) => m.kind === 'embed').map((m) => `${m.url} (on ${p.slug})`));
  const lines = [
    '# Modafie scrape report', '',
    `- Source: ${BASE.href}`, `- Crawled: ${new Date().toISOString()} (${Math.round((Date.now() - started) / 1000)}s, ${DELAY}ms between requests, ${RETRIES} retries)`,
    `- robots.txt rules: ${robots.rules.length}; sitemaps read: ${seenSitemaps.size}; URLs in sitemaps: ${fromSitemaps.size}`,
    `- **Pages scraped: ${pages.length}**`, `- **Media files: ${mediaList.length} (${mb(total)})**`, '',
    '| Kind | Files | Size |', '|---|---:|---:|',
    ...Object.entries(byKind).map(([k, v]) => `| ${k} | ${v.count} | ${mb(v.bytes)} |`), '',
    '## Pages', '', '| Slug | Title | Sections | Media | Found via |', '|---|---|---:|---:|---|',
    ...pages.map((p) => `| ${p.slug} | ${(p.title || '').replace(/\|/g, '/')} | ${p.sections.length} | ${p.media.length} | ${p.discoveredVia} |`), '',
    '## Embedded videos (kept as embed links)', '', ...(embeds.length ? embeds.map((e) => `- ${e}`) : ['- none']), '',
    '## Skipped by robots.txt', '', ...(disallowed.length ? disallowed.map((u) => `- ${u}`) : ['- none']), '',
    '## Media referenced but not downloaded', '', ...(skippedMedia.length ? skippedMedia.map((s) => `- ${s.url}: ${s.reason}`) : ['- none']), '',
    '## Failures', '', ...(failures.length ? failures.map((f) => `- **${f.type}** ${f.url}: ${f.error}`) : ['- none']), '',
  ];
  await fs.writeFile(path.join(OUT, 'report.md'), lines.join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
