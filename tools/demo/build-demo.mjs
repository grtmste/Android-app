#!/usr/bin/env node
/**
 * Converts scrape/content.json into the theme's one-click demo package:
 *
 *   theme/modafie/demo/manifest.json      pages, media, templates, menus, theme mods
 *   theme/modafie/demo/kit.json           Elementor Site Settings (global colours, fonts, buttons, layout)
 *   theme/modafie/demo/pages/<slug>.json  Elementor data (standard widgets + Modafie Form/Marquee)
 *   theme/modafie/demo/templates/*.json   every section as a reusable Elementor template
 *   theme/modafie/demo/media/...          media files referenced by the pages
 *
 * Media and internal links are written as tokens the importer resolves on the target site:
 *   {{mf-media:<key>:url}}  {{mf-media:<key>:id}}  {{mf-page:<slug>}}  {{mf-home}}
 *
 * Usage: node demo/build-demo.mjs --scrape ../scrape --theme ../theme/modafie
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const SCRAPE = path.resolve(opt('scrape', '../scrape'));
const THEME = path.resolve(opt('theme', '../theme/modafie'));
const DEMO = path.join(THEME, 'demo');

const content = JSON.parse(await fs.readFile(path.join(SCRAPE, 'content.json'), 'utf8'));
const BASE = new URL(content.site.base);
const HOSTS = new Set([BASE.hostname, BASE.hostname.replace(/^www\./, ''), 'www.' + BASE.hostname.replace(/^www\./, '')]);
const pageSlugs = new Set(content.pages.map((p) => p.slug));
const usedMedia = new Set();
const altFor = new Map();
const report = { pages: [], warnings: [] };

// ------------------------------------------------------------------ helpers
let idCounter = 0;
const idFor = (seed) => crypto.createHash('sha1').update(`${seed}|${idCounter++}`).digest('hex').slice(0, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const px = (size, unit = 'px') => ({ unit, size, sizes: [] });
const box = (t, r, b, l, unit = 'px') => ({ unit, top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: false });
const gap = (n) => ({ unit: 'px', size: n, column: String(n), row: String(n), isLinked: true });
const G = (id) => `globals/colors?id=${id}`;
const T = (id) => `globals/typography?id=${id}`;

function slugForUrl(href) {
  try {
    const u = new URL(href, BASE);
    if (!HOSTS.has(u.hostname)) return null;
    let p = decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, '').replace(/\.(html?|php)$/i, '').toLowerCase().replace(/[^a-z0-9/_-]+/g, '-').replace(/\//g, '--');
    return p || 'home';
  } catch { return null; }
}
/** Rewrite a scraped URL into an importer token (internal) or keep it (external). */
function link(href) {
  if (!href) return '';
  if (/^(mailto|tel):/i.test(href)) return href;
  let u;
  try { u = new URL(href, BASE); } catch { return href; }
  if (!HOSTS.has(u.hostname)) return u.href;
  const slug = slugForUrl(u.href);
  const hash = u.hash || '';
  if (slug === 'home') return `{{mf-home}}/${hash}`;
  if (pageSlugs.has(slug)) return `{{mf-page:${slug}}}${hash}`;
  return `{{mf-home}}${u.pathname}${u.search}${hash}`;
}
const linkObj = (href) => ({ url: link(href), is_external: href && !slugForUrl(href) && /^https?:/.test(href) ? 'on' : '', nofollow: '', custom_attributes: '' });
const rewriteHtml = (html) => String(html || '').replace(/href="([^"]*)"/g, (_, h) => `href="${esc(link(h))}"`);

function media(mediaId, alt = '') {
  const rec = mediaId && content.media[mediaId];
  if (!rec) return null;
  usedMedia.add(mediaId);
  if (alt && !altFor.has(mediaId)) altFor.set(mediaId, alt);
  return { url: `{{mf-media:${mediaId}:url}}`, id: `{{mf-media:${mediaId}:id}}`, alt: alt || rec.alt || '', source: 'library', size: '' };
}

// ------------------------------------------------------------------ element factories
function container(settings = {}, elements = [], isInner = false) {
  return { id: idFor('c'), elType: 'container', isInner, settings: { container_type: 'flex', content_width: 'boxed', flex_direction: 'column', ...settings }, elements };
}
function widget(widgetType, settings = {}) {
  return { id: idFor(widgetType), elType: 'widget', widgetType, isInner: false, settings, elements: [] };
}
const anim = (name, delay = 0, prefix = '_') => (name ? { [`${prefix}animation`]: name, [`${prefix}animation_delay`]: delay } : {});

function heading(text, { tag = 'h2', typo = null, color = null, align = null, href = null, classes = '', motion = '', animation = null, delay = 0, extra = {} } = {}) {
  const s = { title: esc(text), header_size: tag, ...extra };
  const g = {};
  if (typo) g.typography_typography = T(typo);
  if (color) g.title_color = G(color);
  if (Object.keys(g).length) s.__globals__ = g;
  if (align) { s.align = align; s.title_align = align; }
  if (href) s.link = linkObj(href);
  if (classes) s._css_classes = classes;
  if (motion) s.mf_motion = motion;
  Object.assign(s, anim(animation, delay));
  return widget('heading', s);
}
function text(html, { color = null, align = null, classes = '', animation = null, delay = 0, typo = 'text', extra = {} } = {}) {
  const s = { editor: html.startsWith('<') ? html : `<p>${html}</p>`, ...extra };
  const g = { typography_typography: T(typo) };
  if (color) g.text_color = G(color);
  s.__globals__ = g;
  if (align) { s.align = align; s.text_align = align; }
  if (classes) s._css_classes = classes;
  Object.assign(s, anim(animation, delay));
  return widget('text-editor', s);
}
function button(label, href, { variant = 'dark', align = null, animation = null, delay = 0, size = 'md' } = {}) {
  const s = { text: esc(label), link: linkObj(href), size, ...anim(animation, delay) };
  if (align) s.align = align;
  if (variant === 'light') { s.background_background = 'classic'; s.__globals__ = { background_color: G('mfwhite'), button_text_color: G('primary'), button_background_hover_color: G('mfwhite'), hover_color: G('mfwhite') }; s._css_classes = 'mf-btn-light'; }
  if (variant === 'outline-light') { s.background_background = 'classic'; s.background_color = 'rgba(0,0,0,0)'; s.border_border = 'solid'; s.border_width = box(2, 2, 2, 2); s.__globals__ = { button_text_color: G('mfwhite'), border_color: G('mfwhite') }; s._css_classes = 'mf-btn-outline-light'; }
  if (variant === 'outline') { s.background_background = 'classic'; s.background_color = 'rgba(0,0,0,0)'; s.border_border = 'solid'; s.border_width = box(2, 2, 2, 2); s.__globals__ = { button_text_color: G('primary'), border_color: G('primary') }; s._css_classes = 'mf-btn-outline'; }
  return widget('button', s);
}
function image(mediaId, alt, { href = null, height = null, heightMobile = null, classes = '', motion = '', animation = null, delay = 0, size = 'large' } = {}) {
  const img = media(mediaId, alt);
  if (!img) return null;
  const s = { image: img, image_size: size, width: px(100, '%'), ...anim(animation, delay) };
  if (height) { s.height = height; s['object-fit'] = 'cover'; s.object_fit = 'cover'; }
  if (heightMobile) s.height_mobile = heightMobile;
  if (href) { s.link_to = 'custom'; s.link = linkObj(href); }
  if (classes) s._css_classes = classes;
  if (motion) s.mf_motion = motion;
  return widget('image', s);
}
function iconList(items, { color = null, inline = false } = {}) {
  const s = {
    icon_list: items.map((it) => ({ _id: idFor('li'), text: esc(typeof it === 'string' ? it : it.text), selected_icon: { value: '', library: '' }, ...(it.href ? { link: linkObj(it.href) } : {}) })),
    view: inline ? 'inline' : 'traditional',
    space_between: px(8),
  };
  if (color) s.__globals__ = { text_color: G(color) };
  return widget('icon-list', s);
}
function videoWidget(b) {
  if (b.type === 'embed' && b.provider === 'youtube') return widget('video', { video_type: 'youtube', youtube_url: b.url, controls: 'yes', modestbranding: 'yes', lazy_load: 'yes' });
  if (b.type === 'embed' && b.provider === 'vimeo') return widget('video', { video_type: 'vimeo', vimeo_url: b.url, lazy_load: 'yes' });
  if (b.type === 'embed') return widget('html', { html: `<iframe src="${esc(b.url)}" loading="lazy" style="width:100%;aspect-ratio:16/9;border:0" allowfullscreen></iframe>` });
  const v = media(b.mediaId);
  if (!v) return null;
  const s = { video_type: 'hosted', hosted_url: v, controls: 'yes', autoplay: b.autoplay ? 'yes' : '', mute: b.muted ? 'yes' : '', loop: b.loop ? 'yes' : '', play_on_mobile: b.autoplay ? 'yes' : '' };
  const poster = media(b.posterMediaId);
  if (poster) { s.show_image_overlay = 'yes'; s.image_overlay = poster; }
  return widget('video', s);
}
function formWidget(b, { inline = false, onDark = false, name = 'Form' } = {}) {
  const fields = (b.fields || []).map((f, i) => ({
    _id: idFor('f'),
    field_type: ['email', 'tel', 'textarea', 'checkbox'].includes(f.type) ? f.type : (f.tag === 'select' ? 'select' : (f.tag === 'textarea' ? 'textarea' : 'text')),
    field_label: f.label || f.placeholder || f.name || `Field ${i + 1}`,
    field_name: (f.name || f.label || `field_${i + 1}`).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 40),
    placeholder: f.placeholder || '',
    required: f.required ? 'yes' : '',
    width: !inline && b.fields.length > 3 && ['text', 'email', 'tel'].includes(f.type) ? '50' : '100',
    field_options: (f.options || []).join('\n'),
  }));
  return widget('mf-form', {
    form_name: name, layout: inline ? 'inline' : 'stacked', fields, show_labels: inline ? '' : 'yes',
    submit_text: b.submit || 'Send', success_message: inline ? 'Thanks for signing up!' : 'Thanks, we will get back to you soon.',
    ...(onDark ? { _css_classes: 'mf-on-dark' } : {}),
  });
}

/** Generic block → widget (used for leftovers and generic sections; nothing is ever dropped). */
function blockWidget(b, ctx = {}) {
  switch (b.type) {
    case 'heading': return heading(b.text, { tag: `h${Math.min(Math.max(b.level, 1), 6)}`, href: b.link, color: ctx.dark ? 'mfwhite' : null, animation: 'fadeInUp' });
    case 'paragraph': return b.role === 'eyebrow' ? text(esc(b.text), { classes: 'mf-eyebrow', typo: 'mfeyebrow', color: ctx.dark ? 'mfwhite' : 'secondary' }) : text(`<p>${rewriteHtml(b.html || esc(b.text))}</p>`, { color: ctx.dark ? 'mfwhite' : null, animation: 'fadeIn' });
    case 'link': return heading(b.text, { tag: 'span', href: b.href, classes: 'mf-link' });
    case 'button': return button(b.text, b.href, { variant: ctx.dark ? 'light' : 'dark', animation: 'fadeInUp', delay: 100 });
    case 'list': return b.items.some((i) => i && i.href) ? iconList(b.items, { color: ctx.dark ? 'mfwhite' : null }) : text(`<${b.ordered ? 'ol' : 'ul'}>${b.items.map((i) => `<li>${typeof i === 'string' ? esc(i) : (i.html ? rewriteHtml(i.html) : esc(i.text))}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`);
    case 'image': return image(b.mediaId, b.alt, { href: b.link, classes: 'mf-zoom', animation: 'fadeIn' });
    case 'svg': return image(b.mediaId, '', { size: 'full', extra: {} });
    case 'video': case 'embed': return videoWidget(b);
    case 'quote': return heading(b.text, { tag: 'h2', typo: 'mfstatement', align: 'center', motion: 'reveal' });
    case 'form': return formWidget(b);
    case 'table': return text(`<table>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`);
    case 'map': return widget('html', { html: `<iframe src="${esc(b.url)}" loading="lazy" style="width:100%;height:420px;border:0"></iframe>` });
    default:
      if (b.text) return text(esc(b.text));
      report.warnings.push(`Unhandled block type ${b.type}`);
      return null;
  }
}
const compact = (arr) => arr.filter(Boolean);

// ------------------------------------------------------------------ section analysis
function cardsOf(blocks, allowBare = false) {
  // A card = image followed by a heading (and optionally eyebrow/paragraph/button) before the next image.
  const cards = [];
  let cur = null;
  for (const b of blocks) {
    if (b.type === 'image' && b.role !== 'background') { cur = { image: b, rest: [] }; cards.push(cur); continue; }
    if (cur) cur.rest.push(b);
  }
  return allowBare ? cards : cards.filter((c) => c.rest.some((b) => b.type === 'heading'));
}
function classify(section, index, page) {
  if (section.pattern && builders[section.pattern]) return section.pattern;
  const B = section.blocks;
  const has = (t) => B.some((b) => b.type === t);
  const count = (t) => B.filter((b) => b.type === t).length;
  const words = B.filter((b) => ['heading', 'paragraph'].includes(b.type)).map((b) => b.text).join(' ').split(/\s+/).filter(Boolean).length;
  const bg = section.background || {};
  const form = B.find((b) => b.type === 'form');
  const cards = cardsOf(B);
  const bgImgBlock = B.find((b) => b.type === 'image' && b.role === 'background');
  const contentImages = B.filter((b) => b.type === 'image' && b.role !== 'background');

  if ((section.classes || []).includes('marquee') || (B.length === 1 && B[0].type === 'paragraph' && /[✦•|·]/.test(B[0].text) && B[0].text.length < 300)) return 'marquee';
  if (index === 0 && (bg.mediaId || bg.videoMediaId) && has('heading')) return 'hero';
  if (form) return form.fields.length <= 2 && form.fields.some((f) => f.type === 'email') ? 'newsletter' : 'contact';
  if (cards.length >= 3) {
    if (cards.length >= 5) return 'carousel';
    if (cards.some((c) => c.rest.some((b) => b.type === 'paragraph' && b.text.length > 60))) return 'grid';
    return cards.length <= 4 && cards.some((c) => c.rest.some((b) => b.type === 'button') || c.image.link) ? 'tiles' : 'grid';
  }
  if ((bg.mediaId || bgImgBlock) && words <= 25) return 'editorial';
  if (contentImages.length === 1 && (has('heading') || has('paragraph')) && count('svg') === 0) return 'split';
  if (bgImgBlock && contentImages.length === 0 && has('heading')) return 'split';
  const svgFeatures = B.filter((b, i) => b.type === 'svg' && B[i + 1] && B[i + 1].type === 'heading').length;
  if (svgFeatures >= 3) return 'features';
  if (has('quote') && B.length <= 3) return 'statement';
  const questions = B.filter((b) => b.type === 'heading' && /\?\s*$/.test(b.text)).length;
  if (questions >= 3) return 'faq';
  if (index === 0 && has('heading') && !contentImages.length && words < 60 && B.length <= 3) return 'title';
  if (B.length <= 3 && count('heading') === 1 && !has('paragraph') && !contentImages.length && words <= 20 && !has('button')) return 'statement';
  if (B.length <= 3 && count('heading') === 1 && has('button') && !contentImages.length) return 'cta';
  if ((has('video') || has('embed')) && B.filter((b) => !['video', 'embed'].includes(b.type)).length <= 2) return 'video';
  return 'generic';
}

// ------------------------------------------------------------------ pattern builders
const SECTION_PAD = { padding: box(96, 40, 96, 40), padding_tablet: box(72, 24, 72, 24), padding_mobile: box(56, 16, 56, 16) };
const sectionBase = (extra = {}) => ({ html_tag: 'section', ...SECTION_PAD, ...extra });

function takeHeaderRow(blocks, { dark = false, center = false } = {}) {
  // Leading eyebrow / one heading / one intro paragraph / "view all" link, before the first image or card.
  const out = [];
  let headings = 0;
  let paras = 0;
  while (blocks.length) {
    const b = blocks[0];
    if (b.type === 'paragraph' && b.role === 'eyebrow' && !headings) { out.push(blocks.shift()); continue; }
    if (b.type === 'heading' && !headings) { headings++; out.push(blocks.shift()); continue; }
    if (b.type === 'paragraph' && headings && !paras) { paras++; out.push(blocks.shift()); continue; }
    if (b.type === 'link') { out.push(blocks.shift()); continue; }
    break;
  }
  const head = [];
  let viewAll = null;
  for (const b of out) {
    if (b.type === 'heading') head.push(heading(b.text, { tag: 'h2', color: dark ? 'mfwhite' : null, align: center ? 'center' : null, motion: 'reveal', href: b.link }));
    else if (b.type === 'link') viewAll = heading(b.text, { tag: 'span', href: b.href, classes: 'mf-link' });
    else head.push(b.role === 'eyebrow' ? blockWidget(b, { dark }) : text(`<p>${rewriteHtml(b.html || esc(b.text))}</p>`, { color: dark ? 'mfwhite' : 'secondary', align: center ? 'center' : null, animation: 'fadeIn', delay: 150 }));
  }
  // "View all" link right after the header
  if (!viewAll && blocks[0] && blocks[0].type === 'link') { const b = blocks.shift(); viewAll = heading(b.text, { tag: 'span', href: b.href, classes: 'mf-link' }); }
  if (!head.length && !viewAll) return null;
  return container({ content_width: 'full', flex_direction: 'row', flex_direction_mobile: 'column', flex_justify_content: center ? 'center' : 'space-between', flex_align_items: center ? 'center' : 'flex-end', flex_align_items_mobile: 'flex-start', flex_gap: gap(16), padding: box(0, 0, 32, 0), padding_mobile: box(0, 0, 24, 0), flex_wrap: 'nowrap' },
    compact([container({ content_width: 'full', flex_gap: gap(8), width: px(70, '%'), width_mobile: px(100, '%'), padding: box(0, 0, 0, 0), ...(center ? { flex_align_items: 'center' } : {}) }, head, true), viewAll]), true);
}

const builders = {
  hero(section, ctx) {
    const B = [...section.blocks];
    const bg = section.background || {};
    const isHome = ctx.page.slug === 'home';
    const kids = [];
    let btnIndex = 0;
    let delay = 200;
    for (const b of B) {
      if (b.type === 'heading') kids.push(heading(b.text, { tag: kids.some((k) => k.widgetType === 'heading' && k.settings.header_size === 'h1') ? 'h2' : 'h1', typo: isHome && b.text.length <= 24 ? 'mfdisplay' : 'primary', color: 'mfwhite', motion: 'reveal' }));
      else if (b.type === 'paragraph' && b.role === 'eyebrow') kids.push(text(esc(b.text), { classes: 'mf-eyebrow', typo: 'mfeyebrow', color: 'mfwhite', animation: 'fadeIn' }));
      else if (b.type === 'paragraph') kids.push(text(`<p>${rewriteHtml(b.html || esc(b.text))}</p>`, { color: 'mfwhite', animation: 'fadeInUp', delay: (delay += 150), extra: { _element_width: 'initial', _element_custom_width: px(560), _element_custom_width_mobile: px(100, '%') } }));
      else if (b.type === 'button') { kids.push({ btn: button(b.text, b.href, { variant: btnIndex++ === 0 ? 'light' : 'outline-light', animation: 'fadeInUp', delay: (delay += 100) }) }); }
      else if (b.type === 'image' && b.role === 'background') continue;
      else kids.push(blockWidget(b, { dark: true }));
    }
    // group consecutive buttons into a row
    const children = [];
    for (const k of kids) {
      if (k && k.btn) {
        const last = children[children.length - 1];
        if (last && last.__btnRow) last.elements.push(k.btn);
        else { const row = container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', flex_gap: gap(12), padding: box(16, 0, 0, 0) }, [k.btn], true); row.__btnRow = true; children.push(row); }
      } else if (k) children.push(k);
    }
    children.forEach((c) => delete c.__btnRow);
    const s = sectionBase({
      content_width: 'boxed', flex_justify_content: 'flex-end', flex_align_items: 'flex-start', flex_gap: gap(16),
      min_height: px(isHome ? 100 : 72, 'vh'), min_height_mobile: px(isHome ? 88 : 60, 'vh'),
      padding: box(120, 40, 96, 40), padding_tablet: box(96, 24, 72, 24), padding_mobile: box(96, 16, 48, 16),
      background_background: 'classic', background_position: 'center center', background_size: 'cover', background_repeat: 'no-repeat',
      background_overlay_background: 'gradient', background_overlay_color: 'rgba(0,0,0,0.05)', background_overlay_color_b: 'rgba(0,0,0,0.6)', background_overlay_gradient_angle: px(180, 'deg'),
      mf_motion: 'hero', __globals__: { background_color: G('mfdark') },
    });
    const img = media(bg.mediaId);
    if (img) s.background_image = img;
    if (bg.videoMediaId && media(bg.videoMediaId)) { s.background_background = 'video'; s.background_video_link = `{{mf-media:${bg.videoMediaId}:url}}`; s.background_play_on_mobile = 'yes'; if (img) s.background_video_fallback = img; }
    return container(s, children);
  },

  marquee(section) {
    const txt = section.blocks.map((b) => b.text || '').join(' ✦ ');
    const items = txt.split(/\s*[✦•|·]\s*/).filter(Boolean).map((t) => ({ _id: idFor('m'), text: esc(t) }));
    const v = section.variant || 'dark';
    // dark: white on black · accent: brand-colour wordmark on white · small: thin black ticker on white
    const colors = { dark: ['primary', 'mfwhite'], accent: ['mfwhite', 'accent'], small: ['mfwhite', 'primary'] }[v] || ['primary', 'mfwhite'];
    const settings = { items, separator: v === 'dark' ? '✦' : '', speed: v === 'small' ? 40 : 70, direction: v === 'small' ? 'right' : 'left', pause_on_hover: 'yes', padding: box(v === 'small' ? 10 : 20, 0, v === 'small' ? 10 : 20, 0, 'px'),
      gap: px(v === 'dark' ? 48 : 20), __globals__: { color: G(colors[1]), separator_color: G('accent'), typography_typography: T('primary') } };
    // Local typography only applies without a global font reference, so these variants use custom typography.
    if (v !== 'dark') delete settings.__globals__.typography_typography;
    if (v === 'accent') Object.assign(settings, { typography_typography: 'custom', typography_font_family: 'Barlow Condensed', typography_font_weight: '800', typography_font_style: 'italic', typography_text_transform: 'uppercase', typography_font_size: px(36), typography_font_size_mobile: px(26), typography_line_height: px(1.1, 'em') });
    if (v === 'small') Object.assign(settings, { typography_typography: 'custom', typography_font_family: 'Barlow Condensed', typography_font_weight: '800', typography_font_style: 'italic', typography_text_transform: 'uppercase', typography_font_size: px(14), typography_letter_spacing: px(1), typography_line_height: px(1.2, 'em') });
    return container({ html_tag: 'section', content_width: 'full', padding: box(0, 0, 0, 0), background_background: 'classic', __globals__: { background_color: G(colors[0]) } }, [widget('mf-marquee', settings)]);
  },

  wideimage(section) {
    const kids = section.blocks.map((b) => (b.type === 'image' ? image(b.mediaId, b.alt, { height: px(80, 'vh'), heightMobile: px(60, 'vh'), size: 'full', motion: 'parallax', animation: 'fadeIn' }) : blockWidget(b)));
    return container(sectionBase({ flex_gap: gap(16), padding: box(24, 40, 24, 40), padding_tablet: box(16, 24, 16, 24), padding_mobile: box(8, 16, 8, 16) }), compact(kids));
  },

  carousel(section, ctx) {
    const B = [...section.blocks];
    const head = takeHeaderRow(B);
    const cards = cardsOf(B, true);
    const consumed = new Set();
    const slides = cards.map((c, i) => {
      consumed.add(c.image);
      const parts = [image(c.image.mediaId, c.image.alt, { href: c.image.link, size: 'large' })];
      for (const b of c.rest) {
        consumed.add(b);
        if (b.type === 'heading') parts.push(heading(b.text, { tag: 'h3', typo: 'mfcardtitle', href: b.link || c.image.link }));
        else if (b.type === 'paragraph') parts.push(text(esc(b.text), { color: 'mfmuted', typo: 'mfsmall' }));
        else parts.push(blockWidget(b));
      }
      return container({ content_width: 'full', flex_gap: gap(12), padding: box(0, 0, 0, 0), css_classes: 'mf-card-item mf-zoom', ...anim(i < 4 ? 'fadeInUp' : null, i * 100, '') }, compact(parts), true);
    });
    const leftovers = B.filter((b) => !consumed.has(b)).map((b) => blockWidget(b));
    const rail = container({ content_width: 'full', padding: box(0, 40, 0, 40), padding_tablet: box(0, 24, 0, 24), padding_mobile: box(0, 16, 0, 16), mf_motion: 'carousel', flex_direction: 'row', flex_wrap: 'nowrap', flex_gap: gap(16) }, slides, true);
    return container(sectionBase({ content_width: 'full', padding: box(96, 0, 96, 0), padding_tablet: box(72, 0, 72, 0), padding_mobile: box(56, 0, 56, 0), flex_gap: gap(0) }),
      compact([head && { ...head, settings: { ...head.settings, padding: box(0, 40, 32, 40), padding_tablet: box(0, 24, 24, 24), padding_mobile: box(0, 16, 24, 16) } }, rail, ...leftovers]));
  },

  tiles(section) {
    const B = [...section.blocks];
    const head = takeHeaderRow(B);
    const cards = cardsOf(B);
    const consumed = new Set();
    const tiles = cards.map((c, i) => {
      consumed.add(c.image);
      const kids = [];
      for (const b of c.rest) {
        consumed.add(b);
        if (b.type === 'heading') kids.push(heading(b.text, { tag: 'h3', color: 'mfwhite', typo: 'primary', extra: { typography_font_size: px(40), typography_font_size_mobile: px(32) } }));
        else if (b.type === 'button') kids.push(button(b.text, b.href, { variant: 'light', size: 'sm' }));
        else kids.push(blockWidget(b, { dark: true }));
      }
      if (!c.rest.some((b) => b.type === 'button') && c.image.link) kids.push(button('Explore', c.image.link, { variant: 'light', size: 'sm' }));
      const img = media(c.image.mediaId, c.image.alt);
      return container({
        content_width: 'full', flex_justify_content: 'flex-end', flex_align_items: 'flex-start', flex_gap: gap(16),
        min_height: px(640), min_height_tablet: px(520), min_height_mobile: px(460), padding: box(32, 32, 32, 32), padding_mobile: box(24, 24, 24, 24),
        background_background: 'classic', background_image: img, background_position: 'center center', background_size: 'cover', mf_motion: 'tile',
        __globals__: { background_color: G('mfdark') }, ...anim('fadeInUp', i * 120, ''),
      }, kids, true);
    });
    const grid = container({ container_type: 'grid', content_width: 'full', grid_columns_grid: px(Math.min(tiles.length, 4), 'fr'), grid_columns_grid_tablet: px(Math.min(tiles.length, 2), 'fr'), grid_columns_grid_mobile: px(1, 'fr'), grid_rows_grid: px(1, 'fr'), grid_gaps: gap(16), padding: box(0, 0, 0, 0) }, tiles, true);
    const leftovers = B.filter((b) => !consumed.has(b)).map((b) => blockWidget(b));
    return container(sectionBase({ flex_gap: gap(0) }), compact([head, grid, ...leftovers]));
  },

  grid(section) {
    const B = [...section.blocks];
    const head = takeHeaderRow(B);
    const cards = cardsOf(B);
    const consumed = new Set();
    const items = cards.map((c, i) => {
      consumed.add(c.image);
      const parts = [image(c.image.mediaId, c.image.alt, { href: c.image.link })];
      for (const b of c.rest) {
        consumed.add(b);
        if (b.type === 'heading') parts.push(heading(b.text, { tag: head ? 'h3' : 'h2', href: b.link || c.image.link, extra: { typography_font_size: px(28), typography_font_size_mobile: px(24) } }));
        else if (b.type === 'paragraph' && b.role === 'eyebrow') parts.push(text(esc(b.text), { classes: 'mf-eyebrow', typo: 'mfeyebrow', color: 'secondary' }));
        else if (b.type === 'paragraph') parts.push(text(`<p>${rewriteHtml(b.html || esc(b.text))}</p>`, { color: 'secondary' }));
        else parts.push(blockWidget(b));
      }
      return container({ content_width: 'full', flex_gap: gap(12), padding: box(0, 0, 0, 0), css_classes: 'mf-card-item mf-card-item--landscape mf-zoom', ...anim('fadeInUp', i * 100, '') }, compact(parts), true);
    });
    const grid = container({ container_type: 'grid', content_width: 'full', grid_columns_grid: px(3, 'fr'), grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'), grid_rows_grid: px(1, 'fr'), grid_gaps: { unit: 'px', column: '16', row: '48', isLinked: false }, padding: box(0, 0, 0, 0) }, items, true);
    const leftovers = B.filter((b) => !consumed.has(b)).map((b) => blockWidget(b));
    return container(sectionBase({ flex_gap: gap(0) }), compact([head, grid, ...leftovers]));
  },

  split(section, ctx) {
    const B = [...section.blocks];
    const img = B.find((b) => b.type === 'image');
    const reverse = section.reverse !== undefined ? !!section.reverse : ctx.splitCount++ % 2 === 1;
    const textKids = [];
    for (const b of B) {
      if (b === img) continue;
      if (b.type === 'heading') textKids.push(heading(b.text, { tag: 'h2', motion: 'reveal', href: b.link }));
      else if (b.type === 'button') textKids.push(button(b.text, b.href, { animation: 'fadeInUp', delay: 200 }));
      else textKids.push(blockWidget(b));
    }
    // merge consecutive paragraph widgets into one Text Editor
    const merged = [];
    for (const w of textKids) {
      const prev = merged[merged.length - 1];
      if (w && prev && w.widgetType === 'text-editor' && prev.widgetType === 'text-editor' && !w.settings._css_classes && !prev.settings._css_classes) prev.settings.editor += w.settings.editor;
      else if (w) merged.push(w);
    }
    const imgWidget = img ? image(img.mediaId, img.alt, { height: px(86, 'vh'), heightMobile: px(64, 'vh'), motion: 'parallax', size: 'full' }) : null;
    return container(sectionBase({ content_width: 'full', flex_direction: reverse ? 'row-reverse' : 'row', flex_direction_mobile: 'column', flex_gap: gap(0), flex_align_items: 'stretch', padding: box(0, 0, 0, 0), padding_tablet: box(0, 0, 0, 0), padding_mobile: box(0, 0, 0, 0) }), compact([
      container({ content_width: 'full', width: px(50, '%'), width_mobile: px(100, '%'), padding: box(0, 0, 0, 0), css_classes: 'mf-split-media' }, compact([imgWidget]), true),
      container({ content_width: 'full', width: px(50, '%'), width_mobile: px(100, '%'), flex_justify_content: 'center', flex_gap: gap(20), padding: box(80, 96, 80, 96), padding_tablet: box(56, 40, 56, 40), padding_mobile: box(48, 16, 56, 16), ...anim('fadeIn', 0, '') }, merged, true),
    ]));
  },

  editorial(section) {
    const B = [...section.blocks];
    const bgBlock = B.find((b) => b.type === 'image' && b.role === 'background');
    const bgId = (section.background && section.background.mediaId) || (bgBlock && bgBlock.mediaId);
    const kids = [];
    for (const b of B) {
      if (b === bgBlock) continue;
      const left = section.variant === 'left';
      if (b.type === 'heading') kids.push(heading(b.text, { tag: 'h2', typo: left ? 'mfh2' : 'mfdisplay', color: 'mfwhite', align: left ? null : 'center', motion: 'reveal', extra: left ? { _element_width: 'initial', _element_custom_width: px(760), _element_custom_width_mobile: px(100, '%') } : {} }));
      else if (b.type === 'button') kids.push(button(b.text, b.href, { variant: 'light', animation: 'fadeInUp', delay: 300 }));
      else if (b.type === 'paragraph' && b.role !== 'eyebrow') kids.push(text(`<p>${rewriteHtml(b.html || esc(b.text))}</p>`, { color: 'mfwhite', align: left ? null : 'center', animation: 'fadeIn', delay: 200, extra: { _element_width: 'initial', _element_custom_width: px(620), _element_custom_width_mobile: px(100, '%') } }));
      else kids.push(blockWidget(b, { dark: true }));
    }
    const leftAligned = section.variant === 'left';
    const s = sectionBase({ content_width: 'boxed', flex_justify_content: leftAligned ? 'flex-end' : 'center', flex_align_items: leftAligned ? 'flex-start' : 'center', flex_gap: gap(leftAligned ? 16 : 24), min_height: px(90, 'vh'), min_height_mobile: px(70, 'vh'),
      background_background: 'classic', background_position: 'center center', background_size: 'cover', background_overlay_background: 'classic', background_overlay_color: '#000000', background_overlay_opacity: px(0.35), mf_motion: 'parallax-bg', mf_parallax_speed: px(0.25), __globals__: { background_color: G('mfdark') } });
    const img = media(bgId);
    if (img) s.background_image = img;
    return container(s, kids);
  },

  features(section) {
    const B = [...section.blocks];
    const head = takeHeaderRow(B, { center: true });
    const items = [];
    const consumed = new Set();
    B.forEach((b, i) => {
      if (b.type !== 'svg' || !B[i + 1] || B[i + 1].type !== 'heading') return;
      const desc = B[i + 2] && B[i + 2].type === 'paragraph' ? B[i + 2] : null;
      [b, B[i + 1], desc].forEach((x) => x && consumed.add(x));
      const icon = media(b.mediaId);
      items.push(widget('icon-box', {
        selected_icon: icon ? { value: { url: icon.url, id: icon.id }, library: 'svg' } : { value: '', library: '' },
        title_text: esc(B[i + 1].text), description_text: desc ? esc(desc.text) : '', title_size: 'h3', position: 'top', icon_space: px(20), primary_color: '#0B0B0B',
        _css_classes: 'mf-feature', __globals__: { primary_color: G('primary'), title_typography_typography: T('mfh4'), description_typography_typography: T('text'), description_color: G('secondary') },
        ...anim('fadeInUp', items.length * 100),
      }));
    });
    const grid = container({ container_type: 'grid', content_width: 'full', grid_columns_grid: px(Math.min(items.length, 4), 'fr'), grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'), grid_rows_grid: px(1, 'fr'), grid_gaps: { unit: 'px', column: '32', row: '48', isLinked: false }, padding: box(16, 0, 0, 0) }, items, true);
    const leftovers = B.filter((b) => !consumed.has(b)).map((b) => blockWidget(b));
    return container(sectionBase({ flex_gap: gap(0), background_background: 'classic', __globals__: { background_color: G('mfsurface') } }), compact([head, grid, ...leftovers]));
  },

  statement(section) {
    const kids = section.blocks.map((b) => (b.type === 'quote' || b.type === 'heading'
      ? heading(b.text, { tag: 'h2', typo: b.text.length > 90 ? 'mfh2' : 'mfstatement', align: 'center', motion: 'reveal', href: b.link })
      : blockWidget(b)));
    return container(sectionBase({ flex_align_items: 'center', flex_gap: gap(24), padding: box(128, 40, 128, 40), padding_mobile: box(80, 16, 80, 16), boxed_width: px(1100) }), compact(kids));
  },

  cta(section) {
    const dark = section.variant === 'dark';
    const kids = [];
    let row = null;
    let bi = 0;
    for (const b of section.blocks) {
      if (b.type === 'button') {
        const btn = button(b.text, b.href, { variant: dark ? (bi++ ? 'outline-light' : 'light') : (bi++ ? 'outline' : 'dark'), animation: 'fadeInUp', delay: 150 + bi * 80 });
        if (!row) { row = container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', flex_justify_content: 'center', flex_gap: gap(12), padding: box(8, 0, 0, 0) }, [], true); kids.push(row); }
        row.elements.push(btn);
        continue;
      }
      row = null;
      if (b.type === 'heading') kids.push(heading(b.text, { tag: 'h2', align: 'center', motion: 'reveal', color: dark ? 'mfwhite' : null }));
      else if (b.type === 'paragraph') kids.push(text(`<p>${rewriteHtml(b.html || esc(b.text))}</p>`, { align: 'center', color: dark ? 'mfwhite' : 'secondary', animation: 'fadeIn', delay: 100 }));
      else kids.push(blockWidget(b, { dark }));
    }
    return container(sectionBase({ flex_align_items: 'center', flex_gap: gap(20), boxed_width: px(1000), background_background: 'classic', __globals__: { background_color: G(dark ? 'primary' : 'mfsurface') } }), compact(kids));
  },

  title(section) {
    const kids = section.blocks.map((b) => (b.type === 'heading' ? heading(b.text, { tag: `h${b.level || 1}`, motion: 'reveal' }) : b.type === 'paragraph' && b.role !== 'eyebrow' ? text(`<p>${rewriteHtml(b.html || esc(b.text))}</p>`, { color: 'secondary', animation: 'fadeIn', delay: 200, extra: { _element_width: 'initial', _element_custom_width: px(640), _element_custom_width_mobile: px(100, '%') } }) : blockWidget(b)));
    return container(sectionBase({ flex_gap: gap(16), padding: box(120, 40, 48, 40), padding_tablet: box(96, 24, 40, 24), padding_mobile: box(72, 16, 32, 16) }), compact(kids));
  },

  faq(section) {
    const B = [...section.blocks];
    const pre = [];
    while (B.length && !(B[0].type === 'heading' && /\?\s*$/.test(B[0].text))) pre.push(B.shift());
    const items = [];
    const children = [];
    let cur = null;
    for (const b of B) {
      if (b.type === 'heading' && /\?\s*$/.test(b.text)) { cur = { title: b.text, blocks: [] }; items.push(cur); continue; }
      if (cur) cur.blocks.push(b); else pre.push(b);
    }
    for (const it of items) {
      children.push(container({ _title: it.title, content_width: 'full', padding: box(0, 0, 24, 0) }, compact(it.blocks.map((b) => blockWidget(b))), true));
    }
    const acc = { id: idFor('acc'), elType: 'widget', widgetType: 'nested-accordion', isInner: false, elements: children,
      settings: { items: items.map((it) => ({ _id: idFor('ai'), item_title: esc(it.title), element_css_id: '' })), default_state: 'all_collapsed', max_items_expended: 'one', title_tag: pre.some((b) => b.type === 'heading') ? 'h3' : 'h2', faq_schema: 'yes', _css_classes: 'mf-faq',
        __globals__: { title_typography_typography: T('mfh4'), normal_title_color: G('primary') } } };
    return container(sectionBase({ boxed_width: px(960), flex_gap: gap(16), padding: box(32, 40, 96, 40) }), compact([...pre.map((b) => blockWidget(b)), acc]));
  },

  newsletter(section) {
    const B = [...section.blocks];
    const form = B.find((b) => b.type === 'form');
    const left = B.filter((b) => b !== form).map((b) => (b.type === 'heading' ? heading(b.text, { tag: 'h2', color: 'mfwhite', motion: 'reveal' }) : blockWidget(b, { dark: true })));
    return container(sectionBase({ flex_direction: 'row', flex_direction_tablet: 'column', flex_justify_content: 'space-between', flex_align_items: 'center', flex_align_items_tablet: 'flex-start', flex_gap: gap(40), background_background: 'classic', __globals__: { background_color: G('primary') } }), [
      container({ content_width: 'full', width: px(45, '%'), width_tablet: px(100, '%'), flex_gap: gap(12), padding: box(0, 0, 0, 0) }, compact(left), true),
      container({ content_width: 'full', width: px(50, '%'), width_tablet: px(100, '%'), padding: box(0, 0, 0, 0), ...anim('fadeInUp', 200, '') }, [formWidget(form, { inline: true, onDark: true, name: 'Newsletter' })], true),
    ]);
  },

  contact(section) {
    const B = [...section.blocks];
    const form = B.find((b) => b.type === 'form');
    const contactish = (b) => b.items.some((i) => typeof i === 'string' && (/@/.test(i) || /^\+?[\d\s()-]{7,}$/.test(i)));
    const left = B.filter((b) => b !== form).map((b) => (b.type === 'list' && contactish(b) ? iconList(b.items.map((i) => (typeof i === 'string' && /@/.test(i) ? { text: i, href: `mailto:${i}` } : typeof i === 'string' && /^\+?[\d\s()-]{7,}$/.test(i) ? { text: i, href: `tel:${i.replace(/[^\d+]/g, '')}` } : i))) : b.type === 'heading' ? heading(b.text, { tag: 'h2', motion: 'reveal' }) : blockWidget(b)));
    return container(sectionBase({ flex_direction: 'row', flex_direction_tablet: 'column', flex_gap: gap(64), flex_align_items: 'flex-start', padding: box(48, 40, 120, 40) }), [
      container({ content_width: 'full', width: px(40, '%'), width_tablet: px(100, '%'), flex_gap: gap(20), padding: box(0, 0, 0, 0) }, compact(left), true),
      container({ content_width: 'full', width: px(60, '%'), width_tablet: px(100, '%'), padding: box(40, 40, 40, 40), padding_mobile: box(24, 16, 24, 16), background_background: 'classic', __globals__: { background_color: G('mfsurface') }, ...anim('fadeInUp', 150, '') }, [formWidget(form, { name: 'Contact' })], true),
    ]);
  },

  video(section) {
    return container(sectionBase({ flex_gap: gap(24) }), compact(section.blocks.map((b) => blockWidget(b))));
  },

  generic(section) {
    const kids = [];
    for (const b of section.blocks) {
      const w = blockWidget(b);
      const prev = kids[kids.length - 1];
      if (w && prev && w.widgetType === 'text-editor' && prev.widgetType === 'text-editor' && !w.settings._css_classes && !prev.settings._css_classes) prev.settings.editor += w.settings.editor;
      else if (w) kids.push(w);
    }
    const bg = section.background || {};
    const s = sectionBase({ flex_gap: gap(20), boxed_width: px(section.hints && section.hints.images ? 1440 : 960) });
    const img = media(bg.mediaId);
    if (img) Object.assign(s, { background_background: 'classic', background_image: img, background_size: 'cover', background_position: 'center center' });
    return container(s, kids);
  },
};

const PATTERN_NAMES = { wideimage: 'Wide image', hero: 'Hero', marquee: 'Marquee strip', carousel: 'Card carousel', tiles: 'Category tiles', grid: 'Editorial grid', split: 'Split image/text', editorial: 'Editorial image', features: 'Feature row', statement: 'Statement', cta: 'Call to action', title: 'Page title', faq: 'FAQ', newsletter: 'Newsletter', contact: 'Contact', video: 'Video', generic: 'Content' };

// ------------------------------------------------------------------ kit
function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

function typo(id, title, family, weight, size, tablet, mobile, lh, extra = {}) {
  return {
    _id: id, title, typography_typography: 'custom', typography_font_family: family, typography_font_weight: String(weight),
    typography_font_size: px(size), typography_font_size_tablet: px(tablet), typography_font_size_mobile: px(mobile),
    typography_line_height: px(lh, 'em'), ...extra,
  };
}
function buildKit() {
  const detected = content.site.brand && content.site.brand.accent;
  const accent = /^#[0-9a-f]{6}$/i.test(detected || '') ? detected.toUpperCase() : '#3B5BFF';
  const accentText = contrast(accent, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#0B0B0B';
  const UP = { typography_text_transform: 'uppercase' };
  return {
    accent, accentText,
    kit: {
      system_colors: [
        { _id: 'primary', title: 'Primary', color: '#0B0B0B' },
        { _id: 'secondary', title: 'Secondary', color: '#4A4A4A' },
        { _id: 'text', title: 'Text', color: '#141414' },
        { _id: 'accent', title: 'Accent', color: accent },
      ],
      custom_colors: [
        { _id: 'mfwhite', title: 'White', color: '#FFFFFF' },
        { _id: 'mfsurface', title: 'Surface', color: '#F6F6F6' },
        { _id: 'mfline', title: 'Line', color: '#E3E3E3' },
        { _id: 'mfmuted', title: 'Muted', color: '#8C8C8C' },
        { _id: 'mfdark', title: 'Dark surface', color: '#1C1C1C' },
      ],
      system_typography: [
        typo('primary', 'Primary (H1)', 'Barlow Condensed', 800, 80, 60, 44, 0.92, UP),
        typo('secondary', 'Secondary (H3)', 'Barlow Condensed', 800, 32, 28, 24, 1, UP),
        typo('text', 'Text', 'Inter', 400, 16, 16, 16, 1.6),
        { ...typo('accent', 'Accent (buttons)', 'Inter', 700, 14, 14, 13, 1, UP), typography_letter_spacing: px(0.84) },
      ],
      custom_typography: [
        typo('mfdisplay', 'Display (hero)', 'Barlow Condensed', 800, 120, 88, 56, 0.88, UP),
        typo('mfh2', 'Heading 2', 'Barlow Condensed', 800, 56, 44, 34, 0.95, UP),
        typo('mfh4', 'Heading 4', 'Barlow Condensed', 700, 22, 20, 18, 1.1, UP),
        typo('mfstatement', 'Statement', 'Barlow Condensed', 800, 72, 56, 38, 0.95, UP),
        typo('mfcardtitle', 'Card title', 'Inter', 600, 15, 15, 14, 1.35),
        typo('mfsmall', 'Small', 'Inter', 400, 13, 13, 13, 1.5),
        { ...typo('mfeyebrow', 'Eyebrow', 'Inter', 700, 12, 12, 11, 1.2, UP), typography_letter_spacing: px(1.4) },
      ],
      // Theme style
      body_typography_typography: 'custom', __globals__: {
        body_color: G('text'), body_typography_typography: T('text'),
        link_normal_color: G('primary'), link_hover_color: G('accent'),
        h1_color: G('primary'), h1_typography_typography: T('primary'),
        h2_color: G('primary'), h2_typography_typography: T('mfh2'),
        h3_color: G('primary'), h3_typography_typography: T('secondary'),
        h4_color: G('primary'), h4_typography_typography: T('mfh4'),
        h5_color: G('primary'), h6_color: G('primary'),
        button_typography_typography: T('accent'), button_text_color: G('mfwhite'), button_background_color: G('primary'),
        button_hover_text_color: accentText === '#FFFFFF' ? G('mfwhite') : G('primary'), button_hover_background_color: G('primary'),
      },
      button_background_background: 'classic',
      button_hover_background_background: 'classic',
      button_border_radius: { unit: 'px', top: '999', right: '999', bottom: '999', left: '999', isLinked: true },
      button_padding: { unit: 'px', top: '18', right: '32', bottom: '18', left: '32', isLinked: false },
      button_padding_mobile: { unit: 'px', top: '15', right: '24', bottom: '15', left: '24', isLinked: false },
      button_border_border: 'solid', button_border_width: { unit: 'px', top: '2', right: '2', bottom: '2', left: '2', isLinked: true }, button_border_color: 'rgba(0,0,0,0)',
      // Layout
      container_width: px(1440), container_padding: { unit: 'px', top: '0', right: '40', bottom: '0', left: '40', isLinked: false },
      container_padding_tablet: { unit: 'px', top: '0', right: '24', bottom: '0', left: '24', isLinked: false },
      container_padding_mobile: { unit: 'px', top: '0', right: '16', bottom: '0', left: '16', isLinked: false },
      space_between_widgets: { unit: 'px', column: '20', row: '20', isLinked: true, size: 20 },
      viewport_md: 768, viewport_lg: 1025, viewport_mobile: 767, viewport_tablet: 1024,
      page_title_selector: 'h1.entry-title',
      default_generic_fonts: 'Sans-serif',
      site_name: content.site.title || 'Modafie',
      // Images & form fields
      image_hover_transition: px(0.6),
      form_field_border_radius: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true },
      lightbox_enable_counter: 'yes',
    },
  };
}

// ------------------------------------------------------------------ footer template
function footerTemplate() {
  const groups = (content.site.footer || []).filter((g) => g.links && g.links.length).slice(0, 4);
  const copy = (content.site.footerBlocks || []).filter((b) => b.type === 'paragraph').pop();
  const extraFooter = (content.site.footerBlocks || []).filter((b) => b !== copy && b.type === 'paragraph');
  const cols = groups.map((g) => container({ content_width: 'full', flex_gap: gap(16), padding: box(0, 0, 0, 0) }, compact([
    g.heading ? heading(g.heading, { tag: 'h2', typo: 'mfeyebrow', color: 'primary' }) : null,
    iconList(g.links.map((l) => ({ text: l.text, href: l.href })), { color: 'secondary' }),
  ]), true));
  cols.forEach((c) => { const w = c.elements[c.elements.length - 1]; w.settings._css_classes = 'mf-footer-links'; });
  const brand = container({ content_width: 'full', flex_gap: gap(16), padding: box(0, 0, 0, 0) }, compact([
    heading(content.site.title || 'Modafie', { tag: 'p', typo: 'mfh2', href: content.site.base }),
    ...extraFooter.map((b) => text(esc(b.text), { color: 'secondary' })),
  ]), true);
  const grid = container({ container_type: 'grid', content_width: 'full', grid_columns_grid: px(cols.length + 1, 'fr'), grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'), grid_rows_grid: px(1, 'fr'), grid_gaps: { unit: 'px', column: '32', row: '40', isLinked: false }, padding: box(0, 0, 64, 0) }, [brand, ...cols], true);
  const bottom = container({ content_width: 'full', flex_direction: 'row', flex_direction_mobile: 'column', flex_justify_content: 'space-between', flex_gap: gap(16), padding: box(24, 0, 0, 0), border_border: 'solid', border_width: box(1, 0, 0, 0), __globals__: { border_color: G('mfline') } }, [
    text(copy ? esc(copy.text) : `© ${new Date().getFullYear()} ${esc(content.site.title || 'Modafie')}`, { color: 'secondary', typo: 'mfsmall' }),
  ], true);
  return [container({ html_tag: 'footer', padding: box(96, 40, 32, 40), padding_tablet: box(72, 24, 32, 24), padding_mobile: box(56, 16, 24, 16), flex_gap: gap(0), background_background: 'classic', __globals__: { background_color: G('mfsurface') } }, [grid, bottom])];
}

// ------------------------------------------------------------------ menus
function menuItem(n) {
  const slug = slugForUrl(n.href);
  const item = { title: n.text };
  if (slug && pageSlugs.has(slug)) item.page = slug; else item.url = link(n.href) || '#';
  if (n.children && n.children.length) {
    item.children = n.children.map(menuItem);
    if (n.children.length >= 3) item.classes = 'mf-mega';
  }
  return item;
}
function buildMenus() {
  const nav = (content.site.nav || []).filter((n) => n.text && n.text.length < 40 && !/^(menu|close|search|cart|bag|account|log ?in)$/i.test(n.text));
  const navItems = nav.length ? nav.map(menuItem) : content.pages.filter((p) => p.slug !== 'home' && !/privacy|terms|cookie|legal/.test(p.slug)).slice(0, 6).map((p) => ({ title: (p.title || p.slug).split('|')[0].trim(), page: p.slug }));
  const footer = (content.site.footer || []).filter((g) => g.links.length).map((g) => ({ title: g.heading || 'Links', url: '#', children: g.links.map((l) => menuItem({ text: l.text, href: l.href })) }));
  const legalLinks = (content.site.footer || []).flatMap((g) => g.links).filter((l) => /privacy|terms|cookie|legal|imprint|impressum/i.test(l.href + l.text));
  const legal = legalLinks.length ? legalLinks.map((l) => menuItem({ text: l.text, href: l.href })) : content.pages.filter((p) => /privacy|terms|cookie/.test(p.slug)).map((p) => ({ title: (p.title || '').split('|')[0].trim(), page: p.slug }));
  const menus = { primary: { name: 'Modafie Primary', items: navItems } };
  if (footer.length) menus.footer = { name: 'Modafie Footer', items: footer };
  if (legal.length) menus.legal = { name: 'Modafie Legal', items: legal };
  return menus;
}

/** Strip active content from scraped SVGs so the importer accepts them (it re-checks). */
function sanitizeSvg(svg) {
  let out = String(svg)
    .replace(/<\?xml[^>]*>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<(script|foreignObject|iframe|embed|object)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<(script|foreignObject|iframe|embed|object)\b[^>]*\/>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '')
    .replace(/javascript:/gi, '');
  if (!/xmlns=/.test(out)) out = out.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return out.trim();
}

// ------------------------------------------------------------------ main
const titleOf = (p) => (p.title || p.slug).split(/\s[|–—-]\s/)[0].trim() || p.slug;
await fs.rm(DEMO, { recursive: true, force: true });
await fs.mkdir(path.join(DEMO, 'pages'), { recursive: true });
await fs.mkdir(path.join(DEMO, 'templates'), { recursive: true });

const manifest = {
  version: 1, generator: 'tools/demo/build-demo.mjs', generatedAt: new Date().toISOString(), source: content.source || 'live',
  site: { title: content.site.title || 'Modafie' },
  kit: 'kit.json',
  elementor_experiments: { container: 'active', 'nested-elements': 'active', e_font_icon_svg: 'active', e_optimized_markup: 'active', e_lazyload: 'active' },
  media: [], pages: [], templates: [], menus: {}, theme_mods: {}, footer_template: 'site-footer',
};

const templateHashes = new Map();
const writes = [];
const orderedPages = [...content.pages].sort((a, b) => (a.slug === 'home' ? -1 : b.slug === 'home' ? 1 : 0));
orderedPages.forEach((page, pi) => {
  const ctx = { page, splitCount: 0 };
  const elements = [];
  const patterns = [];
  page.sections.forEach((section, si) => {
    if (!section.blocks.length && !(section.background && section.background.mediaId)) return;
    const pattern = classify(section, si, page);
    patterns.push(pattern);
    const el = builders[pattern](section, ctx);
    if (!el.settings._title) el.settings._title = section.title || `${PATTERN_NAMES[pattern]}`;
    if (section.anchor) el.settings._element_id = section.anchor;
    if (section.boxed) el.settings.boxed_width = px(section.boxed);
    elements.push(el);
    // Reusable template (deduplicated by content)
    const hash = crypto.createHash('md5').update(JSON.stringify(el).replace(/"id":"[0-9a-f]{7}"/g, '')).digest('hex');
    if (!templateHashes.has(hash)) {
      const key = `${page.slug}-${si + 1}-${pattern}`.replace(/[^a-z0-9_-]/g, '-');
      templateHashes.set(hash, key);
      manifest.templates.push({ key, title: `Modafie · ${titleOf(page)} · ${PATTERN_NAMES[pattern]}`, file: `templates/${key}.json`, pattern });
      writes.push(fs.writeFile(path.join(DEMO, 'templates', `${key}.json`), JSON.stringify([el], null, 1)));
    }
  });
  manifest.pages.push({ slug: page.slug, title: titleOf(page), file: `pages/${page.slug}.json`, template: 'elementor_header_footer', isFront: page.slug === 'home', order: pi, meta: { description: (page.meta && page.meta.description) || '' }, sourceUrl: page.url });
  report.pages.push({ slug: page.slug, sections: patterns });
  writes.push(fs.writeFile(path.join(DEMO, 'pages', `${page.slug}.json`), JSON.stringify(elements, null, 1)));
});

// footer template + menus + kit
const footer = footerTemplate();
await fs.writeFile(path.join(DEMO, 'templates', 'site-footer.json'), JSON.stringify(footer, null, 1));
manifest.templates.unshift({ key: 'site-footer', title: 'Modafie · Site footer', file: 'templates/site-footer.json', pattern: 'footer' });
manifest.menus = buildMenus();
const { kit, accent } = buildKit();
await fs.writeFile(path.join(DEMO, 'kit.json'), JSON.stringify(kit, null, 1));

// announcement text: from a marquee-like strip on the home page if any
const home = content.pages.find((p) => p.slug === 'home');
const strip = home && home.sections.find((s) => (s.classes || []).includes('marquee'));
manifest.theme_mods = {
  modafie_announcement_enabled: true,
  modafie_announcement_text: strip ? strip.blocks.map((b) => b.text).join(' ✦ ').split(/\s*[✦•|·]\s*/).filter(Boolean).join('\n') : '',
  modafie_header_hide_on_scroll: true,
  modafie_header_transparent: false,
  modafie_header_cta_text: '',
  ...(content.site.theme_mods || {}),
};

// logo / favicon
const logoKey = content.site.logo && content.site.logo.mediaId;
const iconKey = content.site.favicon && content.site.favicon.mediaId;
if (logoKey && media(logoKey)) manifest.site.logo = logoKey;
if (iconKey && media(iconKey) && /png|jpe?g|webp/.test(content.media[iconKey].file)) manifest.site.icon = iconKey;

// media files
for (const key of usedMedia) {
  const rec = content.media[key];
  const rel = `media/${rec.file}`;
  await fs.mkdir(path.dirname(path.join(DEMO, rel)), { recursive: true });
  if (/\.svg$/i.test(rec.file)) await fs.writeFile(path.join(DEMO, rel), sanitizeSvg(await fs.readFile(path.join(SCRAPE, 'media', rec.file), 'utf8')));
  else await fs.copyFile(path.join(SCRAPE, 'media', rec.file), path.join(DEMO, rel));
  manifest.media.push({ key, file: rel, alt: rec.alt || altFor.get(key) || '', title: path.basename(rec.file).replace(/\.[a-z0-9]+$/i, '').replace(/-/g, ' '), bytes: rec.bytes });
}
const unused = Object.keys(content.media).filter((k) => !usedMedia.has(k));
for (const key of unused) report.warnings.push(`Media not placed on any page: ${content.media[key].file}`);

await fs.writeFile(path.join(DEMO, 'manifest.json'), JSON.stringify(manifest, null, 1));
await Promise.all(writes);
console.log(`Demo built from ${content.source} content: ${manifest.pages.length} pages, ${manifest.templates.length} templates, ${manifest.media.length} media, accent ${accent}`);
for (const p of report.pages) console.log(`  ${p.slug}: ${p.sections.join(' → ')}`);
for (const w of report.warnings) console.log(`  ! ${w}`);
