#!/usr/bin/env node
/**
 * Modafie site crawler (Phase 1).
 *
 * Discovers every URL (robots.txt → sitemaps → recursive internal links), renders each
 * page in headless Chromium, scrolls to trigger lazy media, then extracts structured
 * content + media and writes:
 *
 *   scrape/content.json            one entry per page (sections → blocks → media refs)
 *   scrape/brand.json              detected brand colours, fonts, logo, favicon
 *   scrape/media/{images,videos,svg,fonts}/   deduplicated by sha256
 *   scrape/screenshots/{desktop,mobile}/<slug>.png
 *   scrape/report.md
 *
 * Usage:
 *   node scrape.mjs [--base https://www.modafie.io] [--out ../scrape] [--max-pages 500]
 *                   [--delay 1000] [--no-screenshots] [--include-archives]
 */
import { chromium, request as pwRequest } from 'playwright';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// CLI options
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const BASE = new URL(opt('base', 'https://www.modafie.io'));
const OUT = path.resolve(__dirname, opt('out', '../scrape'));
const MAX_PAGES = Number(opt('max-pages', 500));
const DELAY = Number(opt('delay', 1000)); // ~1 request / second
const RETRIES = Number(opt('retries', 3));
const SCREENSHOTS = !args.includes('--no-screenshots');
const INCLUDE_ARCHIVES = args.includes('--include-archives');
const EXEC = process.env.CHROMIUM_PATH || undefined;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 ModafieThemeMigration/1.0';

const ALLOWED_HOSTS = new Set([BASE.host, BASE.host.replace(/^www\./, ''), 'www.' + BASE.host.replace(/^www\./, '')]);

const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Rate limiter + retry
// ---------------------------------------------------------------------------
let lastRequest = 0;
async function throttle() {
  const wait = lastRequest + DELAY - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
}
async function withRetry(label, fn) {
  let err;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      await throttle();
      return await fn(attempt);
    } catch (e) {
      err = e;
      log(`  ! ${label} failed (attempt ${attempt}/${RETRIES}): ${e.message.split('\n')[0]}`);
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw err;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------
const SKIP_EXT = /\.(jpe?g|png|gif|webp|avif|svg|ico|pdf|zip|mp4|webm|mov|mp3|wav|css|js|json|xml|txt|woff2?|ttf|otf|eot)$/i;
function normalizeUrl(raw, base = BASE) {
  try {
    const u = new URL(raw, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!ALLOWED_HOSTS.has(u.host)) return null;
    u.hash = '';
    u.host = BASE.host;
    u.protocol = BASE.protocol;
    // drop tracking params, keep meaningful ones (e.g. ?page=2)
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|_ga)/.test(k)) u.searchParams.delete(k);
    if (SKIP_EXT.test(u.pathname)) return null;
    if (/\/(wp-admin|wp-login|cart|checkout|my-account|account|login|logout)\b/.test(u.pathname)) return null;
    // Comment-reply, search, feed and archive listings are not content pages.
    if (['replytocom', 's', 'share', 'add-to-cart'].some((k) => u.searchParams.has(k))) return null;
    if (!INCLUDE_ARCHIVES && /\/(feed|author|category|tag|page\/\d+|\d{4}\/\d{2}(\/\d{2})?)(\/|$)/.test(u.pathname)) return null;
    let s = u.toString();
    if (u.pathname !== '/' && s.endsWith('/') && !u.search) s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}
function slugFor(url) {
  const u = new URL(url);
  let s = u.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '--') || 'home';
  if (u.search) s += '--' + u.search.slice(1).replace(/[^a-z0-9]+/gi, '-');
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 120);
}
function cleanName(name) {
  return (
    decodeURIComponent(name)
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .replace(/[-_]?\d{2,4}x\d{2,4}$/, '') // strip WP size suffixes
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'file'
  );
}

// ---------------------------------------------------------------------------
// Discovery: robots.txt + sitemaps
// ---------------------------------------------------------------------------
async function fetchText(api, url) {
  return withRetry(`GET ${url}`, async () => {
    const r = await api.get(url, { timeout: 30000 });
    if (r.status() === 404) return null;
    if (!r.ok()) throw new Error(`HTTP ${r.status()}`);
    return r.text();
  }).catch(() => null);
}
async function discoverFromSitemaps(api, report) {
  const urls = new Set();
  const sitemapQueue = [];
  const robots = await fetchText(api, new URL('/robots.txt', BASE).toString());
  report.robots = robots ? robots.slice(0, 4000) : null;
  const disallow = [];
  if (robots) {
    let applies = false;
    for (const line of robots.split(/\r?\n/)) {
      const [k, ...rest] = line.split(':');
      const v = rest.join(':').trim();
      const key = k.trim().toLowerCase();
      if (key === 'sitemap' && v) sitemapQueue.push(v);
      if (key === 'user-agent') applies = v === '*';
      if (key === 'disallow' && applies && v) disallow.push(v);
    }
  }
  for (const p of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml', '/sitemap-index.xml'])
    sitemapQueue.push(new URL(p, BASE).toString());
  const seen = new Set();
  while (sitemapQueue.length) {
    const sm = sitemapQueue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm);
    const xml = await fetchText(api, sm);
    if (!xml || !xml.includes('<')) continue;
    report.sitemaps.push(sm);
    const locs = [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    if (/<sitemapindex/i.test(xml)) sitemapQueue.push(...locs);
    else for (const l of locs) { const n = normalizeUrl(l); if (n) urls.add(n); }
  }
  return { urls, disallow };
}

// ---------------------------------------------------------------------------
// In-page extraction (runs in the browser)
// ---------------------------------------------------------------------------
function extractInPage() {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || null;
  // Opacity is ignored on purpose: scroll-reveal content starts transparent but is real content.
  const visible = (el) => {
    if (el.closest('[aria-hidden="true"]')) return false; // marquee clones, decorative duplicates
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // textContent, not innerText: innerText applies CSS text-transform (would turn headings UPPERCASE).
  const text = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('.screen-reader-text, .sr-only, .visually-hidden, [aria-hidden="true"], script, style').forEach((n) => n.remove());
    c.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    return (c.textContent || '').replace(/[ \t\r\f\v]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  const largestFromSrcset = (srcset) => {
    if (!srcset) return null;
    let best = null, bestW = -1;
    for (const part of srcset.split(/,\s+(?=\S)/)) {
      const [u, d] = part.trim().split(/\s+/);
      const w = d ? parseFloat(d) * (d.endsWith('x') ? 1000 : 1) : 0;
      if (w > bestW) { bestW = w; best = u; }
    }
    return abs(best);
  };
  const bgUrls = (el) => {
    const out = [];
    for (const prop of ['backgroundImage']) {
      const v = getComputedStyle(el)[prop];
      if (v && v !== 'none') for (const m of v.matchAll(/url\(["']?([^"')]+)["']?\)/g)) if (!m[1].startsWith('data:')) out.push(abs(m[1]));
    }
    for (const pseudo of ['::before', '::after']) {
      const v = getComputedStyle(el, pseudo).backgroundImage;
      if (v && v !== 'none') for (const m of v.matchAll(/url\(["']?([^"')]+)["']?\)/g)) if (!m[1].startsWith('data:')) out.push(abs(m[1]));
    }
    return out;
  };
  const embedOf = (src) => {
    if (!src) return null;
    const yt = src.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/);
    if (yt) return { provider: 'youtube', id: yt[1], url: `https://www.youtube.com/watch?v=${yt[1]}` };
    const vm = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return { provider: 'vimeo', id: vm[1], url: `https://vimeo.com/${vm[1]}` };
    return null;
  };

  const media = []; // {kind, url, alt, ...}
  const addMedia = (m) => { if (m.url && !m.url.startsWith('data:')) media.push(m); return m.url; };

  // ---- section detection -------------------------------------------------
  const SECTION_SEL = [
    'body > header', 'body > footer', 'header[role=banner]', 'footer[role=contentinfo]',
    'header:not(article header):not(section header):not(main header)', 'footer:not(article footer):not(section footer):not(main footer)',
    '#masthead', '#colophon', '.site-header', '.site-footer', '[class*=announcement]', '[class*=topbar]', '[class*=top-bar]', 'aside',
    'section', '[data-section]', '.shopify-section', '.elementor-top-section', '.e-con.e-parent',
    '.wp-block-group.alignfull', '.wp-block-cover', 'main > div', 'main > article > *',
    '[class*="section"]:not(span):not(a):not(li)'
  ].join(',');
  let candidates = [...document.querySelectorAll(SECTION_SEL)].filter((el) => visible(el) && el.getBoundingClientRect().height > 40);
  // keep outermost matches only
  candidates = candidates.filter((el) => !candidates.some((o) => o !== el && o.contains(el)));
  if (candidates.length < 2) candidates = [...document.body.children].filter((el) => visible(el) && !/^(SCRIPT|STYLE|NOSCRIPT|LINK)$/.test(el.tagName));
  // ensure sections that are outermost but very tall with many sub-sections get split one level deeper
  const sections = [];
  for (const el of candidates) {
    const inner = [...el.querySelectorAll(':scope > * > section, :scope > section, :scope > .e-con, :scope > .elementor-container > .elementor-column > .elementor-widget-wrap > .elementor-section')];
    if (inner.length >= 2 && el.tagName !== 'HEADER' && el.tagName !== 'FOOTER') sections.push(...inner.filter(visible));
    else sections.push(el);
  }
  // add stray content not inside any section (rare) – handled by fallback "body" section
  const inSection = (node) => sections.some((s) => s.contains(node));

  // ---- block extraction (reading order) ----------------------------------
  const BLOCK_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'BLOCKQUOTE', 'IMG', 'PICTURE', 'VIDEO', 'IFRAME', 'FORM', 'A', 'BUTTON', 'SVG', 'FIGCAPTION', 'TABLE', 'DL']);
  const handled = new WeakSet();
  function blocksOf(root) {
    const blocks = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === 1 && /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|LINK|META)$/.test(n.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const pushBg = (el) => {
      for (const u of bgUrls(el)) {
        if (blocks.some((b) => b.type === 'background' && b.src === u)) continue;
        addMedia({ kind: 'image', url: u, context: 'background' });
        const r = el.getBoundingClientRect();
        blocks.push({ type: 'background', src: u, width: Math.round(r.width), height: Math.round(r.height) });
      }
    };
    pushBg(root);
    let n;
    while ((n = walker.nextNode())) {
      if ([...(n.nodeType === 1 ? [n] : [])].some((e) => handled.has(e))) continue;
      let anc = n.parentElement; let skip = false;
      while (anc && anc !== root) { if (handled.has(anc)) { skip = true; break; } anc = anc.parentElement; }
      if (skip) continue;
      if (n.nodeType === 3) {
        // loose text inside div/span that isn't wrapped in a <p>
        const t = n.textContent.replace(/\s+/g, ' ').trim();
        const p = n.parentElement;
        if (t.length > 1 && p && !BLOCK_TAGS.has(p.tagName) && visible(p) && !p.closest('.screen-reader-text,.sr-only,.visually-hidden') && !p.closest('a,button,label,option,select,h1,h2,h3,h4,h5,h6,p,li,figcaption,blockquote,td,th,dt,dd')) {
          const last = blocks[blocks.length - 1];
          if (last && last.type === 'text' && last._el === p) last.text += ' ' + t;
          else blocks.push({ type: 'text', text: t, _el: p, tag: p.tagName.toLowerCase(), classes: p.className?.toString?.().slice(0, 120) });
        }
        continue;
      }
      const el = n;
      if (!visible(el) && !['IMG', 'VIDEO', 'SOURCE', 'IFRAME'].includes(el.tagName)) continue;
      if (el !== root) pushBg(el);
      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag)) {
        const t = text(el);
        if (t) blocks.push({ type: 'heading', level: Number(tag[1]), text: t });
        handled.add(el);
      } else if (tag === 'P' || tag === 'BLOCKQUOTE' || tag === 'FIGCAPTION') {
        const t = text(el);
        if (t) blocks.push({ type: tag === 'P' ? 'paragraph' : tag.toLowerCase(), text: t, html: el.innerHTML.trim().slice(0, 5000) });
        // images/links inside paragraphs still need collection
        el.querySelectorAll('img').forEach((img) => collectImg(img, blocks));
        el.querySelectorAll('a[href]').forEach((a) => { if (isButtonLike(a)) blocks.push(cta(a)); });
        handled.add(el);
      } else if (tag === 'UL' || tag === 'OL') {
        if (el.closest('nav') || el.querySelectorAll(':scope > li > a').length === el.children.length && el.children.length > 2 && el.closest('header,footer')) {
          blocks.push({ type: 'nav', items: navItems(el) });
        } else {
          const items = [...el.children].filter((li) => li.tagName === 'LI').map((li) => ({ text: text(li), href: li.querySelector('a[href]') ? abs(li.querySelector('a').getAttribute('href')) : null }));
          if (items.length) blocks.push({ type: 'list', ordered: tag === 'OL', items });
          el.querySelectorAll('img').forEach((img) => collectImg(img, blocks));
        }
        handled.add(el);
      } else if (tag === 'DL') {
        const items = [...el.querySelectorAll('dt')].map((dt) => ({ term: text(dt), description: dt.nextElementSibling ? text(dt.nextElementSibling) : '' }));
        blocks.push({ type: 'definition-list', items });
        handled.add(el);
      } else if (tag === 'TABLE') {
        const rows = [...el.rows].map((r) => [...r.cells].map((c) => text(c)));
        blocks.push({ type: 'table', rows });
        handled.add(el);
      } else if (tag === 'PICTURE') {
        const img = el.querySelector('img');
        let best = null;
        for (const s of el.querySelectorAll('source')) best = largestFromSrcset(s.getAttribute('srcset')) || best;
        if (img) collectImg(img, blocks, best);
        handled.add(el);
      } else if (tag === 'IMG') {
        collectImg(el, blocks);
        handled.add(el);
      } else if (tag === 'VIDEO') {
        const src = el.currentSrc || el.getAttribute('src') || el.querySelector('source')?.getAttribute('src');
        const sources = [...el.querySelectorAll('source')].map((s) => ({ src: abs(s.getAttribute('src')), type: s.type }));
        const url = abs(src);
        if (url) addMedia({ kind: 'video', url });
        for (const s of sources) if (s.src && s.src !== url) addMedia({ kind: 'video', url: s.src });
        const poster = el.getAttribute('poster') ? abs(el.getAttribute('poster')) : null;
        if (poster) addMedia({ kind: 'image', url: poster, context: 'poster' });
        const r = el.getBoundingClientRect();
        blocks.push({ type: 'video', src: url, sources, poster, autoplay: el.autoplay, loop: el.loop, muted: el.muted, width: Math.round(r.width), height: Math.round(r.height) });
        handled.add(el);
      } else if (tag === 'IFRAME') {
        const src = el.getAttribute('src') || el.getAttribute('data-src');
        const e = embedOf(src);
        if (e) blocks.push({ type: 'embed', ...e, title: el.title || null });
        else if (src && /maps\.google|google\.com\/maps/.test(src)) blocks.push({ type: 'map', src: abs(src) });
        else if (src) blocks.push({ type: 'iframe', src: abs(src) });
        handled.add(el);
      } else if (tag === 'svg' || tag === 'SVG') {
        const r = el.getBoundingClientRect();
        if (r.width >= 8 && r.width <= 400) {
          const markup = el.outerHTML;
          const isLogo = !!el.closest('[class*=logo],[id*=logo],a[href="/"]');
          blocks.push({ type: 'svg', markup, width: Math.round(r.width), height: Math.round(r.height), logo: isLogo, label: el.getAttribute('aria-label') || el.closest('[aria-label]')?.getAttribute('aria-label') || null });
          media.push({ kind: 'svg', inline: markup, logo: isLogo });
        }
        handled.add(el);
      } else if (tag === 'FORM') {
        const isUtility = el.matches('[role=search], .search-form, #commentform, .comment-form') || /wp-comments-post|\/search/.test(el.getAttribute('action') || '') || el.querySelector('input[type=search]');
        if (!isUtility) blocks.push(formBlock(el));
        handled.add(el);
      } else if (tag === 'A' || tag === 'BUTTON') {
        if (el.closest('nav')) { continue; }
        const t = text(el);
        const img = el.querySelector('img');
        if (img && !t) { collectImg(img, blocks, null, abs(el.getAttribute('href'))); handled.add(el); continue; }
        if (t && (isButtonLike(el) || tag === 'BUTTON')) { blocks.push(cta(el)); handled.add(el); }
        else if (t && t.length < 120) { blocks.push({ type: 'link', text: t, href: abs(el.getAttribute('href')) }); el.querySelectorAll('img').forEach((i) => collectImg(i, blocks)); handled.add(el); }
      } else if (tag === 'NAV') {
        blocks.push({ type: 'nav', label: el.getAttribute('aria-label'), items: navItems(el) });
        handled.add(el);
      }
    }
    for (const b of blocks) delete b._el;
    return blocks;
  }
  function isButtonLike(a) {
    const c = (a.className?.toString?.() || '') + ' ' + (a.getAttribute('role') || '');
    if (/btn|button|cta/i.test(c)) return true;
    const cs = getComputedStyle(a);
    const hasBox = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0;
    return hasBox && parseFloat(cs.paddingLeft) >= 10;
  }
  function cta(el) {
    const cs = getComputedStyle(el);
    return { type: 'button', text: text(el), href: el.getAttribute('href') ? abs(el.getAttribute('href')) : null, style: { background: cs.backgroundColor, color: cs.color, radius: cs.borderTopLeftRadius } };
  }
  function navItems(root) {
    const list = root.tagName === 'UL' || root.tagName === 'OL' ? root : root.querySelector('ul,ol');
    if (!list) return [...root.querySelectorAll('a[href]')].map((a) => ({ text: text(a), href: abs(a.getAttribute('href')) })).filter((i) => i.text);
    return [...list.children].filter((li) => li.tagName === 'LI').map((li) => {
      const a = li.querySelector(':scope > a, :scope > * > a, a');
      const sub = li.querySelector(':scope ul, :scope ol');
      return { text: a ? (a.textContent || '').trim().replace(/\s+/g, ' ') : text(li).split('\n')[0], href: a ? abs(a.getAttribute('href')) : null, children: sub ? navItems(sub) : [] };
    }).filter((i) => i.text);
  }
  function collectImg(img, blocks, preferred = null, link = null) {
    const best = preferred || largestFromSrcset(img.getAttribute('srcset') || img.getAttribute('data-srcset')) || abs(img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src'));
    if (!best) return;
    addMedia({ kind: best.match(/\.svg(\?|$)/i) ? 'svg' : 'image', url: best, alt: img.alt || '' });
    const r = img.getBoundingClientRect();
    const isLogo = !!img.closest('[class*=logo],[id*=logo]') || /logo/i.test(img.alt + ' ' + img.src + ' ' + img.className);
    const fig = img.closest('figure');
    blocks.push({ type: 'image', src: best, alt: img.alt || '', width: Math.round(r.width), height: Math.round(r.height), naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, caption: fig?.querySelector('figcaption') ? text(fig.querySelector('figcaption')) : null, link: link || (img.closest('a[href]') ? abs(img.closest('a').getAttribute('href')) : null), logo: isLogo });
  }
  function formBlock(form) {
    const fields = [...form.querySelectorAll('input, textarea, select')].filter((f) => !['hidden', 'submit', 'button', 'image', 'reset'].includes(f.type) && f.tabIndex !== -1 && visible(f) && f.getBoundingClientRect().width > 4 && !/honeypot|hp|bot|trap/i.test((f.name || '') + ' ' + f.className)).map((f) => {
      const id = f.id;
      const label = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || f.closest('label');
      return { tag: f.tagName.toLowerCase(), type: f.type || f.tagName.toLowerCase(), name: f.name || null, label: label ? text(label) : null, placeholder: f.placeholder || null, required: f.required, options: f.tagName === 'SELECT' ? [...f.options].map((o) => o.text) : undefined };
    });
    const submit = form.querySelector('[type=submit], button:not([type=button])');
    return { type: 'form', action: form.getAttribute('action') ? abs(form.getAttribute('action')) : null, method: (form.method || 'get').toLowerCase(), fields, submit: submit ? (text(submit) || submit.value || 'Submit') : 'Submit', emailOnly: fields.length === 1 && fields[0].type === 'email' };
  }

  function roleOf(el, r, i) {
    const cls = (el.className?.toString?.() || '') + ' ' + el.id;
    const top = r.top + scrollY;
    if (/announcement|topbar|top-bar|promo-bar|notice-bar/i.test(cls) || (top < 5 && r.height < 70 && !el.querySelector('nav, img, h1, h2') && el.tagName !== 'HEADER')) return 'announcement';
    if (el.matches('header, #masthead, .site-header, [role=banner]') || el.closest('header:not(article header), #masthead, [role=banner]')) return 'header';
    if (el.matches('footer, #colophon, .site-footer, [role=contentinfo]') || el.closest('footer:not(article footer), #colophon, [role=contentinfo]')) return 'footer';
    if (el.matches('aside') || el.closest('aside, .sidebar, .widget-area')) return 'aside';
    return 'content';
  }
  const out = [];
  sections.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({
      index: i,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: (el.className?.toString?.() || '').slice(0, 200),
      role: roleOf(el, r, i),
      box: { top: Math.round(r.top + scrollY), height: Math.round(r.height), width: Math.round(r.width) },
      style: { background: cs.backgroundColor, color: cs.color },
      blocks: blocksOf(el),
    });
  });
  // anything outside detected sections
  const orphan = document.createElement('div');
  const strays = [...document.querySelectorAll('main h1, main h2, main p, main img')].filter((e) => !inSection(e));
  if (strays.length) out.push({ index: out.length, tag: 'div', role: 'content', classes: 'orphans', box: {}, style: {}, blocks: strays.flatMap((e) => blocksOf(e.parentElement)).slice(0, 200) });

  // ---- brand signals ----------------------------------------------------
  const colorCount = {};
  const bump = (c, w) => { if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return; colorCount[c] = (colorCount[c] || 0) + w; };
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const area = Math.min(r.width * r.height, 400000) / 1000;
    bump(cs.backgroundColor, area);
    if (el.childNodes.length && [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) bump(cs.color, 5);
    if (el.matches('a, button, .btn, [class*=button]')) { bump(cs.backgroundColor, 40); bump(cs.color, 10); }
  }
  const fontOf = (sel) => { const el = document.querySelector(sel); return el ? { family: getComputedStyle(el).fontFamily, weight: getComputedStyle(el).fontWeight, size: getComputedStyle(el).fontSize, transform: getComputedStyle(el).textTransform, letterSpacing: getComputedStyle(el).letterSpacing } : null; };
  const fontFaces = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules || []) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        const src = rule.style.getPropertyValue('src');
        const urls = [...src.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => new URL(m[1], sheet.href || location.href).href);
        fontFaces.push({ family: rule.style.getPropertyValue('font-family').replace(/["']/g, ''), weight: rule.style.getPropertyValue('font-weight'), style: rule.style.getPropertyValue('font-style'), urls, sheet: sheet.href });
      }
    }
  }
  const icons = [...document.querySelectorAll('link[rel*=icon]')].map((l) => ({ rel: l.rel, sizes: l.sizes?.toString() || null, href: abs(l.getAttribute('href')) }));
  for (const ic of icons) addMedia({ kind: ic.href?.endsWith('.svg') ? 'svg' : 'image', url: ic.href, context: 'favicon' });
  const ogImage = meta('meta[property="og:image"]');
  if (ogImage) addMedia({ kind: 'image', url: abs(ogImage), context: 'og' });
  const logoImg = document.querySelector('header [class*=logo] img, header img[alt*=logo i], header a[href="/"] img, [class*=logo] img, .custom-logo');
  const logoSvg = document.querySelector('header [class*=logo] svg, header a[href="/"] svg');

  return {
    url: location.href,
    title: document.title,
    lang: document.documentElement.lang || null,
    meta: {
      description: meta('meta[name="description"]'),
      canonical: document.querySelector('link[rel=canonical]')?.href || null,
      robots: meta('meta[name="robots"]'),
      og: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')].map((m) => [m.getAttribute('property').slice(3), m.content])),
      twitter: Object.fromEntries([...document.querySelectorAll('meta[name^="twitter:"]')].map((m) => [m.getAttribute('name').slice(8), m.content])),
    },
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean),
    sections: out,
    links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    media,
    brand: {
      colors: Object.entries(colorCount).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([c, w]) => ({ color: c, weight: Math.round(w) })),
      fonts: { h1: fontOf('h1'), h2: fontOf('h2'), h3: fontOf('h3'), body: fontOf('p') || fontOf('body'), button: fontOf('button, .btn, a[class*=button]'), nav: fontOf('nav a') },
      fontFaces,
      icons,
      logo: logoImg ? { kind: 'image', src: largestFromSrcset(logoImg.getAttribute('srcset')) || abs(logoImg.currentSrc || logoImg.src), alt: logoImg.alt } : logoSvg ? { kind: 'svg', markup: logoSvg.outerHTML } : null,
      themeColor: meta('meta[name="theme-color"]'),
    },
  };
}

// ---------------------------------------------------------------------------
// Media download + dedupe
// ---------------------------------------------------------------------------
const mediaIndex = new Map(); // url -> {file, hash, ...}
const hashIndex = new Map(); // sha256 -> file
const usedNames = new Set();
const failures = [];
const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf', 'application/font-woff2': 'woff2', 'application/font-woff': 'woff', 'application/x-font-ttf': 'ttf' };
function folderFor(kind, ext) {
  if (kind === 'font' || /^(woff2?|ttf|otf|eot)$/.test(ext)) return 'fonts';
  if (ext === 'svg') return 'svg';
  if (kind === 'video' || /^(mp4|webm|mov|m4v)$/.test(ext)) return 'videos';
  return 'images';
}
async function saveBuffer(buf, { url, kind, contentType, hint }) {
  const hash = createHash('sha256').update(buf).digest('hex');
  if (hashIndex.has(hash)) return hashIndex.get(hash);
  let ext = EXT_BY_TYPE[(contentType || '').split(';')[0].trim()] || (url ? (new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1] || '').toLowerCase() : '') || 'bin';
  if (ext === 'jpeg') ext = 'jpg';
  const folder = folderFor(kind, ext);
  let base = cleanName(hint || (url ? path.basename(new URL(url).pathname) : 'file'));
  let name = `${base}.${ext}`;
  if (usedNames.has(`${folder}/${name}`)) name = `${base}-${hash.slice(0, 8)}.${ext}`;
  usedNames.add(`${folder}/${name}`);
  await fs.mkdir(path.join(OUT, 'media', folder), { recursive: true });
  await fs.writeFile(path.join(OUT, 'media', folder, name), buf);
  const rec = { file: `media/${folder}/${name}`, sha256: hash, bytes: buf.length, contentType: contentType || null, source: url || null };
  hashIndex.set(hash, rec);
  return rec;
}
async function downloadMedia(api, m) {
  if (mediaIndex.has(m.url)) return mediaIndex.get(m.url);
  try {
    const rec = await withRetry(`media ${m.url}`, async () => {
      const r = await api.get(m.url, { timeout: 60000, headers: { Referer: BASE.toString() } });
      if (!r.ok()) throw new Error(`HTTP ${r.status()}`);
      return saveBuffer(await r.body(), { url: m.url, kind: m.kind, contentType: r.headers()['content-type'] });
    });
    mediaIndex.set(m.url, rec);
    return rec;
  } catch (e) {
    failures.push({ type: 'media', url: m.url, error: e.message });
    mediaIndex.set(m.url, null);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page rendering
// ---------------------------------------------------------------------------
async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight * 0.6));
    let last = -1;
    for (let i = 0; i < 400; i++) {
      window.scrollBy(0, step);
      await new Promise((r) => setTimeout(r, 120));
      const y = scrollY + innerHeight;
      if (y >= document.documentElement.scrollHeight - 2) {
        if (last === document.documentElement.scrollHeight) break;
        last = document.documentElement.scrollHeight;
        await new Promise((r) => setTimeout(r, 600)); // let infinite/lazy loaders append
      }
    }
    // force lazy attributes
    document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager'));
    document.querySelectorAll('[data-src]').forEach((e) => { if (e.tagName === 'IMG' && !e.src) e.src = e.dataset.src; });
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // reveal on-scroll animated elements and collapsed accordions/tabs so hidden copy is captured
  await page.addStyleTag({ content: '.elementor-invisible,[data-aos],.aos-init{visibility:visible!important;opacity:1!important;transform:none!important}' +
    '.elementor-tab-content,.e-n-accordion-item>[role=region],[class*=accordion] [class*=content],[class*=accordion] [class*=panel],[class*=faq] [class*=answer],[role=tabpanel]{display:block!important;visibility:visible!important;height:auto!important;max-height:none!important;opacity:1!important;overflow:visible!important}' }).catch(() => {});
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; })).catch(() => {});
}

async function renderPage(context, url) {
  const page = await context.newPage();
  const fontResponses = [];
  page.on('response', (r) => {
    const ct = r.headers()['content-type'] || '';
    if (/font|woff|ttf|otf/.test(ct) || /\.(woff2?|ttf|otf)(\?|$)/.test(r.url())) fontResponses.push(r.url());
  });
  try {
    const resp = await withRetry(`page ${url}`, () => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }));
    const status = resp?.status() ?? 0;
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    // dismiss cookie banners (best effort)
    for (const sel of ['#onetrust-accept-btn-handler', 'button:has-text("Accept all")', 'button:has-text("Accept")', 'button:has-text("Godkänn")', '[aria-label*=cookie i] button']) {
      const b = page.locator(sel).first();
      if (await b.isVisible().catch(() => false)) { await b.click({ timeout: 2000 }).catch(() => {}); break; }
    }
    await autoScroll(page);
    const data = await page.evaluate(extractInPage);
    data.status = status;
    data.finalUrl = page.url();
    data.fontRequests = [...new Set(fontResponses)];
    return { page, data };
  } catch (e) {
    await page.close();
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const report = { base: BASE.toString(), startedAt: new Date().toISOString(), sitemaps: [], robots: null, pages: [], failures };
  const api = await pwRequest.newContext({ userAgent: UA, ignoreHTTPSErrors: false });

  log(`Discovering URLs for ${BASE}`);
  const { urls: sitemapUrls, disallow } = await discoverFromSitemaps(api, report);
  log(`  sitemap URLs: ${sitemapUrls.size}`);
  const disallowed = (u) => { const p = new URL(u).pathname; return disallow.some((d) => d !== '/' && p.startsWith(d.replace(/\*.*$/, ''))); };

  const queue = [normalizeUrl(BASE.toString()), ...sitemapUrls].filter(Boolean);
  const seen = new Set(queue);
  const browser = await chromium.launch({ executablePath: EXEC, args: ['--disable-dev-shm-usage'] });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, deviceScaleFactor: 1 });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA.replace('X11; Linux x86_64', 'iPhone; CPU iPhone OS 18_0 like Mac OS X') + ' Mobile', isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  const pages = [];
  const finalSeen = new Set();
  const fontSources = new Map();
  while (queue.length && pages.length < MAX_PAGES) {
    const url = queue.shift();
    if (disallowed(url)) { report.pages.push({ url, skipped: 'robots.txt disallow' }); continue; }
    log(`[${pages.length + 1}] ${url}`);
    let page, data;
    try {
      ({ page, data } = await renderPage(desktop, url));
    } catch (e) {
      failures.push({ type: 'page', url, error: e.message.split('\n')[0] });
      continue;
    }
    const finalNorm = normalizeUrl(data.finalUrl) || url;
    if (finalSeen.has(finalNorm)) { await page.close(); continue; } // redirect/alias of a page we already have
    finalSeen.add(finalNorm);
    if (data.status >= 400) { failures.push({ type: 'page', url, error: `HTTP ${data.status}` }); await page.close(); continue; }

    // enqueue internal links
    for (const href of data.links) {
      const n = normalizeUrl(href, data.finalUrl);
      if (n && !seen.has(n)) { seen.add(n); queue.push(n); }
    }

    const slug = slugFor(finalNorm || url);
    // screenshots
    const shots = {};
    if (SCREENSHOTS) {
      try {
        await fs.mkdir(path.join(OUT, 'screenshots', 'desktop'), { recursive: true });
        await page.screenshot({ path: path.join(OUT, 'screenshots', 'desktop', `${slug}.png`), fullPage: true });
        shots.desktop = `screenshots/desktop/${slug}.png`;
      } catch (e) { failures.push({ type: 'screenshot', url, error: e.message }); }
      try {
        const { page: mpage } = await renderPage(mobile, url);
        await fs.mkdir(path.join(OUT, 'screenshots', 'mobile'), { recursive: true });
        await mpage.screenshot({ path: path.join(OUT, 'screenshots', 'mobile', `${slug}.png`), fullPage: true });
        shots.mobile = `screenshots/mobile/${slug}.png`;
        await mpage.close();
      } catch (e) { failures.push({ type: 'screenshot-mobile', url, error: e.message }); }
    }
    await page.close();

    // media
    for (const m of data.media) {
      if (m.inline) {
        const rec = await saveBuffer(Buffer.from(m.inline), { kind: 'svg', contentType: 'image/svg+xml', hint: m.logo ? 'logo' : 'icon' });
        m.local = rec.file;
        continue;
      }
      const rec = await downloadMedia(api, m);
      m.local = rec ? rec.file : null;
    }
    for (const ff of data.brand.fontFaces) {
      for (const u of ff.urls) {
        if (fontSources.has(u)) continue;
        const licensed = /fonts\.(gstatic|googleapis)\.com|fontsource|bunny\.net/.test(u);
        fontSources.set(u, { family: ff.family, weight: ff.weight, style: ff.style, licenseNote: licensed ? 'Google Fonts / OFL – redistributable' : 'Unknown licence – verify before redistributing (not bundled in theme)' });
        const rec = await downloadMedia(api, { kind: 'font', url: u });
        fontSources.get(u).local = rec?.file || null;
      }
    }
    const urlToLocal = (u) => (u ? mediaIndex.get(u)?.file || null : null);
    for (const s of data.sections) for (const b of s.blocks) {
      if (b.src && !b.local) b.local = urlToLocal(b.src);
      if (b.poster) b.posterLocal = urlToLocal(b.poster);
      if (b.type === 'svg') { const rec = hashIndex.get(createHash('sha256').update(Buffer.from(b.markup)).digest('hex')); b.local = rec?.file || null; delete b.markup; }
      if (b.sources) for (const s2 of b.sources) s2.local = urlToLocal(s2.src);
    }

    pages.push({
      url: finalNorm || url,
      slug,
      path: new URL(finalNorm || url).pathname,
      title: data.title,
      lang: data.lang,
      meta: data.meta,
      jsonLd: data.jsonLd,
      screenshots: shots,
      sections: data.sections,
      media: data.media.map((m) => ({ kind: m.kind, url: m.url || null, local: m.local, alt: m.alt, context: m.context })),
      brand: data.brand,
    });
    report.pages.push({ url, slug, sections: data.sections.length, media: data.media.length });
  }
  await browser.close();

  // ---- brand.json (aggregated over pages) -------------------------------
  const agg = {};
  for (const p of pages) for (const c of p.brand.colors) agg[c.color] = (agg[c.color] || 0) + c.weight;
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const sat = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
  const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const ranked = Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([c, w]) => ({ color: c, hex: toHex(parse(c)), weight: w, saturation: +sat(parse(c)).toFixed(2), alpha: parse(c)[3] ?? 1 }));
  const accent = ranked.find((c) => c.saturation > 0.35 && c.alpha > 0.9) || null;
  const home = pages[0];
  const brand = {
    detectedAt: new Date().toISOString(),
    accent: accent ? accent.hex : null,
    themeColor: home?.brand.themeColor || null,
    palette: ranked.slice(0, 20),
    fonts: home?.brand.fonts || null,
    fontFiles: [...fontSources.entries()].map(([url, v]) => ({ url, ...v })),
    logo: home?.brand.logo ? { ...home.brand.logo, local: home.brand.logo.src ? mediaIndex.get(home.brand.logo.src)?.file || null : null } : null,
    icons: home?.brand.icons?.map((i) => ({ ...i, local: mediaIndex.get(i.href)?.file || null })) || [],
  };
  for (const p of pages) delete p.brand;

  // ---- write outputs ------------------------------------------------------
  await fs.writeFile(path.join(OUT, 'content.json'), JSON.stringify({ source: BASE.toString(), scrapedAt: new Date().toISOString(), pageCount: pages.length, pages }, null, 2));
  await fs.writeFile(path.join(OUT, 'brand.json'), JSON.stringify(brand, null, 2));
  const all = [...hashIndex.values()];
  const byFolder = all.reduce((a, r) => { const f = r.file.split('/')[1]; a[f] = a[f] || { count: 0, bytes: 0 }; a[f].count++; a[f].bytes += r.bytes; return a; }, {});
  const mb = (b) => (b / 1048576).toFixed(2) + ' MB';
  const md = [
    `# Modafie crawl report`,
    ``,
    `- Source: ${BASE}`,
    `- Started: ${report.startedAt}`,
    `- Finished: ${new Date().toISOString()}`,
    `- Sitemaps read: ${report.sitemaps.length ? report.sitemaps.join(', ') : 'none found'}`,
    `- Pages crawled: **${pages.length}** (URLs discovered: ${seen.size})`,
    `- Unique media files: **${all.length}** (${mb(all.reduce((s, r) => s + r.bytes, 0))})`,
    ...Object.entries(byFolder).map(([f, v]) => `  - ${f}: ${v.count} files, ${mb(v.bytes)}`),
    `- Detected accent colour: ${brand.accent || 'none'}`,
    ``,
    `## Pages`,
    ``,
    `| # | Slug | Title | Sections | Media refs |`,
    `|---|------|-------|----------|-----------|`,
    ...pages.map((p, i) => `| ${i + 1} | ${p.slug} | ${(p.title || '').replace(/\|/g, '\\|')} | ${p.sections.length} | ${p.media.length} |`),
    ``,
    `## Failures (${failures.length})`,
    ``,
    ...(failures.length ? failures.map((f) => `- [${f.type}] ${f.url}: ${f.error}`) : ['None.']),
    ``,
    `## Skipped`,
    ``,
    ...(report.pages.filter((p) => p.skipped).map((p) => `- ${p.url}: ${p.skipped}`).concat(['(robots.txt disallow rules are respected)'])),
    ``,
  ].join('\n');
  await fs.writeFile(path.join(OUT, 'report.md'), md);
  await api.dispose();
  log(`Done: ${pages.length} pages, ${all.length} media files, ${failures.length} failures → ${OUT}`);
}

main().catch(async (e) => {
  console.error(e);
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'report.md'), `# Modafie crawl report\n\nCrawl aborted: ${e.message}\n\nFailures so far:\n\n${failures.map((f) => `- [${f.type}] ${f.url}: ${f.error}`).join('\n') || 'none'}\n`);
  process.exit(1);
});
