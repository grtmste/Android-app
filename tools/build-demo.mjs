#!/usr/bin/env node
/**
 * Build the theme's one-click demo package (theme/modafie/demo/) from either:
 *   - scrape/content.json + scrape/brand.json + scrape/media (real modafie.io content), or
 *   - tools/placeholder/site.mjs (placeholder content, used when no crawl is available).
 *
 * Writes:
 *   theme/modafie/demo/manifest.json   pages, media, templates, menus, settings
 *   theme/modafie/demo/kit.json        Elementor Kit (global colours, fonts, theme style)
 *   theme/modafie/demo/pages/*.json    Elementor _elementor_data per page
 *   theme/modafie/demo/templates/*.json  every section as a reusable template + Site Footer
 *   theme/modafie/demo/media/*         media files referenced above
 *   design/page-mapping.md             which pattern each section was mapped to
 *
 * Usage: node build-demo.mjs [--placeholder] [--accent #RRGGBB] [--scrape dir] [--out dir] [--mapping file.md]
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resetIds, container, unit, box } from './lib/elementor.mjs';
import { PATTERNS, siteFooter } from './lib/patterns.mjs';
import { buildKit } from './lib/kit.mjs';
import { specFromScrape } from './lib/scrape-to-spec.mjs';
import { placeholderSite } from './placeholder/site.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n) => (args.includes(`--${n}`) ? path.resolve(args[args.indexOf(`--${n}`) + 1]) : null);
const THEME = path.join(ROOT, 'theme/modafie');
const DEMO = argVal('out') || path.join(THEME, 'demo');
const SCRAPE = argVal('scrape') || path.join(ROOT, 'scrape');
const MAPPING_DOC = argVal('mapping') || path.join(ROOT, 'design/page-mapping.md');
const DEFAULT_ACCENT = '#FF5A1F';

async function readJson(p) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return null; }
}

async function main() {
  const content = args.includes('--placeholder') ? null : await readJson(path.join(SCRAPE, 'content.json'));
  const brand = await readJson(path.join(SCRAPE, 'brand.json'));
  const useScrape = content && content.pages && content.pages.length > 0;
  const accentArg = args.includes('--accent') ? args[args.indexOf('--accent') + 1] : null;
  const accent = accentArg || (useScrape && brand?.accent) || DEFAULT_ACCENT;

  let spec;
  let mediaRoot;
  if (useScrape) {
    spec = specFromScrape(content, brand);
    mediaRoot = SCRAPE; // spec media keys map to scrape-relative paths via spec.mediaFiles
    console.log(`Building from crawl: ${content.pages.length} pages from ${content.source}`);
  } else {
    spec = placeholderSite;
    mediaRoot = path.join(__dirname, '.cache/placeholder-media');
    await fs.rm(mediaRoot, { recursive: true, force: true });
    execFileSync('python3', ['-I', path.join(__dirname, 'placeholder/make_images.py'), mediaRoot, accent], { stdio: 'inherit' });
    console.log('No crawl found: building PLACEHOLDER demo content.');
  }

  await fs.rm(DEMO, { recursive: true, force: true });
  for (const d of ['pages', 'templates', 'media']) await fs.mkdir(path.join(DEMO, d), { recursive: true });

  // --------------------------------------------------------------- pages
  const usedMedia = new Set();
  const altFor = {};
  const collect = (obj) => {
    const s = JSON.stringify(obj);
    for (const m of s.matchAll(/\{\{mf:media-(?:url|id):([^}]+)\}\}/g)) usedMedia.add(m[1]);
    // Elementor renders the attachment's own alt text, so carry the alt used in the layout.
    for (const m of s.matchAll(/"url":"\{\{mf:media-url:([^}]+)\}\}","id":"[^"]*","size":"","alt":"([^"]+)"/g)) altFor[m[1]] = altFor[m[1]] || m[2];
  };
  const manifestPages = [];
  const templates = [];
  const mapping = [];
  const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  spec.pages.forEach((page, pi) => {
    resetIds(`page:${page.slug}`);
    const elements = [];
    const rows = [];
    page.sections.forEach((sec, si) => {
      const fn = PATTERNS[sec.pattern];
      if (!fn) throw new Error(`Unknown pattern ${sec.pattern}`);
      const el = fn(sec);
      if (sec.anchor) el.settings._element_id = sec.anchor;
      elements.push(el);
      rows.push(`| ${si + 1} | ${sec.pattern} | ${(sec.heading || sec.items?.[0] || '').toString().replace(/\|/g, '/').slice(0, 60)} | ${sec.origin || '—'} |`);
      // reusable template (fresh IDs so editing a template never collides with the page)
      resetIds(`tpl:${page.slug}:${si}`);
      const tplEl = fn(sec);
      const key = `${page.slug}-${si + 1}-${sec.pattern}`.replace(/[^a-z0-9-]/g, '-');
      templates.push({ key, title: `${page.title} — ${si + 1}. ${titleCase(sec.pattern)}`, type: 'container', category: 'Modafie', file: `templates/${key}.json`, data: [tplEl] });
      resetIds(`page:${page.slug}:after:${si}`);
    });
    collect(elements);
    manifestPages.push({
      slug: page.slug,
      title: page.title,
      description: page.description || '',
      front: !!page.front,
      posts: !!page.posts,
      parent: page.parent || null,
      menu_order: pi,
      template: 'elementor_header_footer',
      settings: { hide_title: 'yes' },
      file: `pages/${page.slug}.json`,
      fallback_html: fallbackHtml(page),
      thumbnail: page.sections.find((s) => s.image)?.image || null,
      _elements: elements,
    });
    mapping.push({ page, rows });
  });

  // footer template
  resetIds('tpl:site-footer');
  const footer = siteFooter(spec.footer);
  templates.push({ key: 'site-footer', title: 'Site Footer', type: 'container', category: 'Modafie', file: 'templates/site-footer.json', data: [footer] });
  collect(footer);
  collect(spec.menus);
  if (spec.site.logo) usedMedia.add(spec.site.logo);
  if (spec.site.icon) usedMedia.add(spec.site.icon);

  // --------------------------------------------------------------- media
  const media = [];
  for (const key of [...usedMedia].sort()) {
    const rel = spec.mediaFiles?.[key] || key;
    const src = path.join(mediaRoot, rel);
    if (!existsSync(src)) { console.warn(`  ! missing media ${key} (${src})`); continue; }
    await fs.copyFile(src, path.join(DEMO, 'media', key));
    const meta = spec.mediaMeta?.[key] || {};
    media.push({ key, file: `media/${key}`, title: meta.title || key.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '), alt: meta.alt || altFor[key] || '' });
  }

  // --------------------------------------------------------------- write
  for (const p of manifestPages) {
    await fs.writeFile(path.join(DEMO, p.file), JSON.stringify(p._elements));
    delete p._elements;
  }
  for (const t of templates) {
    await fs.writeFile(path.join(DEMO, t.file), JSON.stringify(t.data));
    delete t.data;
  }
  await fs.writeFile(path.join(DEMO, 'kit.json'), JSON.stringify(buildKit({ accent }), null, 1));

  const menus = [
    { name: 'Modafie Primary', location: 'primary', items: spec.menus.primary || [] },
    { name: 'Modafie Utility', location: 'utility', items: spec.menus.utility || [] },
    { name: 'Modafie Footer', location: 'footer', items: spec.menus.footer || [] },
    { name: 'Modafie Social', location: 'social', items: spec.menus.social || [] },
  ].filter((m) => m.items.length);

  const pkg = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf8'));
  const manifest = {
    version: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    generator: `${pkg.name} build-demo`,
    source: useScrape ? `${content.source} (crawled ${content.scrapedAt})` : 'placeholder',
    accent,
    site: { blogname: spec.site.name, blogdescription: spec.site.tagline || '', logo: spec.site.logo || null, icon: spec.site.icon || null },
    media,
    kit: 'kit.json',
    pages: manifestPages,
    templates,
    footer_template: 'site-footer',
    menus,
    customizer: {
      modafie_announcement_enabled: (spec.announcement || []).length > 0,
      modafie_announcement_items: (spec.announcement || []).map((a) => (a.url ? `${a.text} | ${a.url}` : a.text)).join('\n'),
      modafie_announcement_style: (spec.announcement || []).length > 1 ? 'rotate' : 'static',
      modafie_header_behavior: 'smart',
    },
  };
  await fs.writeFile(path.join(DEMO, 'manifest.json'), JSON.stringify(manifest, null, 1));

  // --------------------------------------------------------------- mapping doc
  const md = [
    '# Page → pattern mapping',
    '',
    `Generated by \`tools/build-demo.mjs\` on ${new Date().toISOString()} from **${manifest.source}**.`,
    'Pattern IDs refer to `design/design-system.md` §6. To change a mapping, edit `tools/mapping-overrides.json` (scraped builds) and re-run the build.',
    '',
    ...mapping.flatMap(({ page, rows }) => [`## ${page.title} (\`/${page.front ? '' : page.slug + '/'}\`)`, '', '| # | Pattern | First heading / text | Source section |', '|---|---|---|---|', ...rows, '']),
    '## Global',
    '',
    `- Announcement bar (P1): ${(spec.announcement || []).length} message(s)`,
    `- Header (P2/P3): menus ${menus.map((m) => `${m.location} (${m.items.length})`).join(', ')}`,
    '- Footer (P15): Elementor template “Site Footer”',
    '',
  ].join('\n');
  await fs.writeFile(MAPPING_DOC, md);

  const size = (await Promise.all(media.map((m) => fs.stat(path.join(DEMO, m.file))))).reduce((s, st) => s + st.size, 0);
  console.log(`Demo package: ${manifestPages.length} pages, ${templates.length} templates, ${media.length} media (${(size / 1048576).toFixed(1)} MB), accent ${accent}`);
}

/** Plain HTML fallback (post_content) so text stays searchable and visible without Elementor. */
function fallbackHtml(page) {
  const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const out = [];
  for (const s of page.sections) {
    if (s.heading) out.push(`<h2>${esc(s.heading)}</h2>`);
    if (s.text) out.push(/<\w/.test(s.text) ? s.text : s.text.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join(''));
    for (const it of s.items || []) {
      if (typeof it === 'string') out.push(`<p>${esc(it)}</p>`);
      else if (it.q) out.push(`<h3>${esc(it.q)}</h3>${it.a}`);
      else if (it.title || it.label) out.push(`<h3>${esc(it.title || it.label)}</h3>${it.text ? `<p>${esc(it.text)}</p>` : ''}`);
    }
  }
  return out.join('\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
