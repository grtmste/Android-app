/**
 * Map crawled modafie.io content (scrape/content.json) to the design-system patterns.
 * Rules follow design/design-system.md §8.1. Nothing is dropped: any heading, paragraph,
 * list, table or button that a pattern doesn't place itself is appended to that
 * section's text, so all crawled copy ends up in an editable widget.
 *
 * Optional overrides: tools/mapping-overrides.json
 *   { "<page-slug>": { "<section-index>": "split" | "skip" | ... } }
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERRIDES_FILE = path.join(__dirname, '..', 'mapping-overrides.json');
const SOCIAL = /(instagram|facebook|tiktok|youtube|youtu\.be|linkedin|pinterest|twitter|x\.com)/i;
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function specFromScrape(content, brand) {
  const overrides = existsSync(OVERRIDES_FILE) ? JSON.parse(readFileSync(OVERRIDES_FILE, 'utf8')) : {};
  const mediaFiles = {};
  const mediaMeta = {};
  const base = new URL(content.source);
  const usedKeys = new Map();

  /** Register a local scrape file → unique flat media key. */
  const mediaKey = (local, alt = '') => {
    if (!local) return null;
    if (usedKeys.has(local)) return usedKeys.get(local);
    let key = path.basename(local).toLowerCase();
    if (mediaFiles[key]) key = `${path.basename(path.dirname(local))}-${key}`;
    usedKeys.set(local, key);
    mediaFiles[key] = local;
    if (alt) mediaMeta[key] = { alt, title: alt };
    return key;
  };

  const slugOf = (url) => {
    try {
      const u = new URL(url, base);
      if (u.host.replace(/^www\./, '') !== base.host.replace(/^www\./, '')) return null;
      const p = u.pathname.replace(/^\/+|\/+$/g, '');
      return p ? p.replace(/\//g, '--').toLowerCase() : 'home';
    } catch { return null; }
  };
  const pageSlugs = new Set(content.pages.map((p) => (p.path === '/' ? 'home' : p.slug)));
  /** Internal links → importer tokens so they point at the new site. */
  const href = (url) => {
    if (!url) return '#';
    if (/^(mailto|tel):/.test(url)) return url;
    const s = slugOf(url);
    if (s && pageSlugs.has(s)) {
      const hash = new URL(url, base).hash;
      return (s === 'home' ? '{{mf:home-url}}' : `{{mf:page-url:${s}}}`) + hash;
    }
    return url;
  };

  const home = content.pages.find((p) => p.path === '/') || content.pages[0];
  const siteName = (home.meta?.og?.site_name || home.title.split(/[|–—-]/).pop() || 'Modafie').trim();
  const cleanTitle = (t) => (t || '').split(/\s[|–—-]\s/)[0].trim() || t;

  // ---------------------------------------------------------- header / menus
  const headerSec = home.sections.find((s) => s.role === 'header');
  const footerSec = [...home.sections].reverse().find((s) => s.role === 'footer');
  const navBlocks = (sec) => (sec ? sec.blocks.filter((b) => b.type === 'nav') : []);
  const toMenu = (items = []) =>
    items.filter((i) => i.text).map((i) => {
      const s = i.href ? slugOf(i.href) : null;
      const item = s && pageSlugs.has(s) ? { title: i.text, page: s } : { title: i.text, url: i.href ? href(i.href) : '#' };
      if (i.children?.length) {
        item.children = toMenu(i.children);
        if (i.children.some((c) => c.children?.length) || i.children.length > 6) item.classes = 'mf-mega';
      }
      return item;
    });
  const headerNavs = (headerSec ? headerSec.blocks.filter((b) => b.type === 'nav' || (b.type === 'list' && b.items.some((i) => i.href))) : []).sort((a, b) => b.items.length - a.items.length);
  const primary = toMenu(headerNavs[0]?.items || []);
  const utility = toMenu((headerNavs[1]?.items || []).slice(0, 4));

  // announcement: a dedicated top strip, else short texts in the header before the first nav
  const announcement = [];
  const annSec = home.sections.find((s) => s.role === 'announcement');
  if (annSec) {
    for (const b of annSec.blocks) {
      if (['text', 'paragraph', 'link', 'heading'].includes(b.type) && b.text && b.text.length < 140) announcement.push({ text: b.text, url: b.href ? href(b.href) : '' });
      if (b.type === 'list' || b.type === 'nav') for (const it of b.items) if (it.text) announcement.push({ text: it.text, url: it.href ? href(it.href) : '' });
    }
  } else if (headerSec) {
    for (const b of headerSec.blocks) {
      if (b.type === 'nav') break;
      if ((b.type === 'text' || b.type === 'paragraph' || b.type === 'link') && b.text && b.text.length < 90) announcement.push({ text: b.text, url: b.href ? href(b.href) : '' });
    }
  }

  // footer
  const footerLinks = [];
  const footerCols = [];
  let footerText = '';
  const social = [];
  if (footerSec) {
    let col = null;
    for (const b of footerSec.blocks) {
      if (b.type === 'heading') { col = { title: b.text, links: [] }; footerCols.push(col); continue; }
      const links = b.type === 'nav' || b.type === 'list' ? b.items : b.type === 'link' ? [b] : [];
      for (const l of links) {
        if (!l.text) continue;
        if (l.href && SOCIAL.test(l.href)) { social.push({ title: l.text, url: l.href }); continue; }
        const entry = { text: l.text, href: href(l.href) };
        // <nav> menus in a footer are usually the legal/bottom menu; lists under a heading are columns
        if (col && b.type !== 'nav') col.links.push(entry); else footerLinks.push(entry);
      }
      if ((b.type === 'paragraph' || b.type === 'text') && !footerText && b.text.length > 30 && !/©|copyright/i.test(b.text)) footerText = b.text;
      if (b.type === 'image' && b.link && SOCIAL.test(b.link)) social.push({ title: b.alt || 'Social', url: b.link });
      if (b.type === 'svg' && b.label && social.length === 0) { /* icon-only links are captured by links */ }
    }
  }
  if (!footerCols.length && footerLinks.length) footerCols.push({ title: 'Links', links: footerLinks.splice(0) });
  const newsletterForm = footerSec?.blocks.find((b) => b.type === 'form' && b.emailOnly);

  // ------------------------------------------------------------- page sections
  const pages = content.pages.map((p) => {
    const slug = p.path === '/' ? 'home' : p.slug;
    const ov = overrides[slug] || {};
    const contentSecs = p.sections.filter((s) => s.role === 'content' && s.blocks.length);
    const sections = [];
    contentSecs.forEach((sec, idx) => {
      const forced = ov[String(idx)];
      if (forced === 'skip') return;
      const s = classify(sec, idx, forced);
      if (s) sections.push({ ...s, origin: `#${sec.index} <${sec.tag}${sec.classes ? '.' + sec.classes.split(/\s+/)[0] : ''}>` });
    });
    if (!sections.length) sections.push({ pattern: 'text', h1: true, compact: true, heading: cleanTitle(p.title), text: p.meta?.description || '' });
    return {
      slug,
      title: cleanTitle(p.title) || slug,
      description: p.meta?.description || p.meta?.og?.description || '',
      front: p.path === '/',
      sections,
    };
  });

  function classify(sec, idx, forced) {
    const B = sec.blocks;
    const H = B.filter((b) => b.type === 'heading');
    const P = B.filter((b) => ['paragraph', 'text', 'blockquote', 'figcaption'].includes(b.type));
    const I = B.filter((b) => b.type === 'image' && !b.logo && b.local && (b.width || 0) >= 60);
    const BGall = B.filter((b) => b.type === 'background' && b.local && b.width >= 200);
    // The section's own background comes first; further backgrounds are card/tile images.
    const BG = BGall.length && B[0] === BGall[0] ? [BGall[0]] : BGall.length === 1 ? BGall : [];
    const tileBgs = BGall.filter((b) => !BG.includes(b));
    const V = B.filter((b) => b.type === 'video' || b.type === 'embed');
    const F = B.filter((b) => b.type === 'form');
    const BTN = B.filter((b) => b.type === 'button' && b.text).map((b) => ({ text: b.text, href: href(b.href) }));
    const L = B.filter((b) => ['list', 'table', 'definition-list'].includes(b.type));
    const topHeading = H.slice().sort((a, b) => a.level - b.level)[0];
    const heading = topHeading?.text || '';
    // all remaining copy → html (so no text is lost)
    const restHtml = (exclude = []) => B.filter((b) => !exclude.includes(b)).map((b) => {
      if (b.type === 'heading') return `<h${Math.max(3, b.level)}>${esc(b.text)}</h${Math.max(3, b.level)}>`;
      if (['paragraph', 'text', 'blockquote', 'figcaption'].includes(b.type)) return b.html && b.type === 'paragraph' ? `<p>${b.html}</p>` : `<p>${esc(b.text)}</p>`;
      if (b.type === 'list') return `<${b.ordered ? 'ol' : 'ul'}>${b.items.map((i) => `<li>${i.href ? `<a href="${esc(href(i.href))}">${esc(i.text)}</a>` : esc(i.text)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`;
      if (b.type === 'table') return `<table>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
      if (b.type === 'definition-list') return `<dl>${b.items.map((i) => `<dt>${esc(i.term)}</dt><dd>${esc(i.description)}</dd>`).join('')}</dl>`;
      if (b.type === 'link' && b.text) return `<p><a href="${esc(href(b.href))}">${esc(b.text)}</a></p>`;
      return '';
    }).filter(Boolean).join('\n');
    const eyebrowOf = () => { const first = B[0]; return first && first !== topHeading && ['text', 'paragraph'].includes(first.type) && first.text.length < 40 ? first : null; };

    let pattern = forced;
    if (!pattern) {
      if (F.length) pattern = F[0].emailOnly ? 'newsletter' : 'contact';
      else if (idx === 0 && (BG.length || (I[0] && I[0].width >= 900) || B.some((b) => b.type === 'video' && b.width >= 900)) && heading) pattern = 'hero';
      else if (V.some((v) => v.type === 'embed')) pattern = 'video';
      else if (I.length >= 5 && H.length + P.length >= I.length * 0.5) pattern = 'rail';
      else if (I.length >= 5) pattern = 'gallery';
      else if (I.length >= 2 && I.length <= 4 && (H.length >= I.length - 1 || B.some((b) => b.type === 'image' && b.link))) pattern = 'tiles';
      else if (!I.length && tileBgs.length >= 2 && tileBgs.length <= 6) pattern = 'tiles';
      else if (!I.length && !BG.length && H.length >= 3 && P.length >= 3) pattern = H.filter((h) => /\?\s*$/.test(h.text)).length >= H.length / 2 ? 'faq' : 'features';
      else if ((BG.length || I.length) && P.reduce((n, p) => n + p.text.length, 0) < 160 && (BG[0]?.width || I[0]?.width || 0) >= 1000) pattern = 'editorial';
      else if (I.length === 1 || BG.length === 1) pattern = 'split';
      else if (!I.length && !BG.length && H.length + P.length === 1 && (H[0] || P[0]).text.length < 120 && (sec.box?.height || 999) < 180) pattern = 'marquee';
      else pattern = 'text';
    }

    const eyebrow = eyebrowOf();
    switch (pattern) {
      case 'hero': {
        const vid = B.find((b) => b.type === 'video' && b.local);
        const img = BG[0] || I[0];
        const used = [topHeading, eyebrow, img, ...B.filter((b) => b.type === 'button'), vid].filter(Boolean);
        return { pattern, eyebrow: eyebrow?.text, heading, text: restHtml(used), image: mediaKey(img?.local, img?.alt) || mediaKey(vid?.posterLocal), video: vid ? mediaKey(vid.local) : undefined, buttons: BTN.slice(0, 2), height: 'full' };
      }
      case 'newsletter': {
        const f = F[0];
        return { pattern, heading: heading || 'Newsletter', text: restHtml([topHeading, f, ...B.filter((b) => b.type === 'button')]), placeholder: f.fields[0]?.placeholder || f.fields[0]?.label || 'Email address', button: f.submit };
      }
      case 'contact': {
        const f = F[0];
        const fields = f.fields.map((x, i) => ({ name: (x.name || x.label || `field_${i}`).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || `field_${i}`, label: x.label || x.placeholder || x.name || `Field ${i + 1}`, type: x.type === 'textarea' || x.tag === 'textarea' ? 'textarea' : x.tag === 'select' ? 'select' : x.type, required: x.required, placeholder: x.placeholder, options: x.options }));
        if (!fields.some((x) => x.type === 'email')) fields.unshift({ name: 'email', label: 'Email', type: 'email', required: true });
        fields.forEach((x) => { if (x.type === 'email') x.name = 'email'; });
        return { pattern, eyebrow: eyebrow?.text, heading: heading || 'Contact', text: restHtml([topHeading, eyebrow, f]), fields, submit: f.submit, details: [] };
      }
      case 'video': {
        const e = V.find((v) => v.type === 'embed');
        return { pattern, heading, text: restHtml([topHeading, e]), youtube: e.provider === 'youtube' ? e.url : undefined, vimeo: e.provider === 'vimeo' ? e.url : undefined };
      }
      case 'rail':
      case 'tiles': {
        // group: each image followed by headings/text until next image
        const items = [];
        let cur = null;
        const consumed = new Set();
        for (const b of B) {
          const isCardImg = (b.type === 'image' && !b.logo && b.local) || (b.type === 'background' && tileBgs.includes(b));
          if (isCardImg) { cur = { image: mediaKey(b.local, b.alt), href: b.link ? href(b.link) : '#', title: '', meta: '' }; items.push(cur); consumed.add(b); continue; }
          if (!cur) continue;
          if (!cur.title && (b.type === 'paragraph' || b.type === 'text') && b.text.length <= 14 && !cur.badge) { cur.badge = b.text; consumed.add(b); }
          else if (b.type === 'heading' && !cur.title) { cur.title = b.text; consumed.add(b); }
          else if ((b.type === 'paragraph' || b.type === 'text') && !cur.meta && b.text.length < 140) { cur.meta = b.text; consumed.add(b); }
          else if ((b.type === 'button' || b.type === 'link') && cur.href === '#') { cur.href = href(b.href); cur.button = b.text; consumed.add(b); }
        }
        const firstImg = B.findIndex((b) => consumed.has(b));
        const head = items.length && B.indexOf(topHeading) < firstImg ? topHeading : null;
        if (head) consumed.add(head);
        // a button before the first card is the section's "View all" link
        const viewAll = B.slice(0, firstImg).find((b) => b.type === 'button' || (b.type === 'link' && b.text && b.text.length < 30));
        if (viewAll) consumed.add(viewAll);
        const rest = restHtml([...consumed, eyebrow].filter(Boolean));
        if (pattern === 'tiles') return { pattern, eyebrow: eyebrow?.text, heading: head?.text, link: viewAll ? { text: viewAll.text, href: href(viewAll.href) } : undefined, text: rest, items: items.map((it) => ({ label: it.title || it.meta || it.button || '', image: it.image, href: it.href, button: it.button || '' })) };
        return { pattern, eyebrow: eyebrow?.text, heading: head?.text || '', link: viewAll ? { text: viewAll.text, href: href(viewAll.href) } : undefined, text: rest, items: items.map((it) => ({ ...it, title: it.title || it.meta || '', meta: it.title ? it.meta : '' })) };
      }
      case 'gallery':
        return { pattern, heading, text: restHtml([topHeading, ...I]), images: I.map((i) => mediaKey(i.local, i.alt)) };
      case 'faq':
      case 'features': {
        const items = [];
        let cur = null;
        const intro = [];
        for (const b of B) {
          if (b.type === 'heading' && b !== topHeading) { cur = { q: b.text, title: b.text, a: '', text: '' }; items.push(cur); continue; }
          if (b === topHeading) continue;
          if (!cur) { intro.push(b); continue; }
          const htmlPart = b.type === 'list' ? `<ul>${b.items.map((i) => `<li>${esc(i.text)}</li>`).join('')}</ul>` : ['paragraph', 'text', 'blockquote'].includes(b.type) ? `<p>${esc(b.text)}</p>` : b.type === 'button' || b.type === 'link' ? `<p><a href="${esc(href(b.href))}">${esc(b.text)}</a></p>` : '';
          cur.a += htmlPart;
          if (b.text) cur.text += (cur.text ? '\n\n' : '') + b.text;
        }
        const introRest = intro.filter((b) => b !== eyebrow && b.text);
        return { pattern, eyebrow: eyebrow?.text, heading: topHeading?.text || '', text: introRest.map((b) => `<p>${esc(b.text)}</p>`).join(''), items };
      }
      case 'editorial':
      case 'split': {
        const img = I[0] || BG[0];
        return { pattern, eyebrow: eyebrow?.text, heading, text: restHtml([topHeading, eyebrow, img, ...B.filter((b) => b.type === 'button' || b.type === 'background')]), image: mediaKey(img?.local, img?.alt), imageAlt: img?.alt, buttons: BTN.slice(0, 2), reverse: idx % 2 === 1 };
      }
      case 'marquee':
        return { pattern, items: [P[0].text] };
      default:
        return { pattern: 'text', eyebrow: eyebrow?.text, heading, h1: topHeading?.level === 1, text: restHtml([topHeading, eyebrow, ...B.filter((b) => b.type === 'button')]), buttons: BTN.slice(0, 2), align: P.reduce((n, p) => n + p.text.length, 0) > 600 ? 'left' : 'center' };
    }
  }

  // Patterns render `text` as HTML; the rail/tiles/features patterns need it surfaced too.
  for (const pg of pages) {
    const extra = [];
    for (const s of pg.sections) {
      if (['rail', 'tiles', 'gallery', 'video', 'faq', 'features'].includes(s.pattern) && s.text) {
        extra.push({ pattern: 'text', text: s.text, align: 'left', origin: s.origin + ' (overflow copy)' });
      }
    }
    if (extra.length) {
      // insert overflow copy right after its section
      const out = [];
      for (const s of pg.sections) {
        out.push(s);
        const x = extra.find((e) => e.origin.startsWith(s.origin) && ['rail', 'tiles', 'gallery', 'video', 'faq', 'features'].includes(s.pattern));
        if (x) out.push(x);
      }
      pg.sections = out;
    }
  }

  const logoKey = brand?.logo?.local ? mediaKey(brand.logo.local, siteName) : null;
  const icon = (brand?.icons || []).filter((i) => i.local && /\.(png|jpe?g)$/i.test(i.local)).sort((a, b) => parseInt(b.sizes || '0', 10) - parseInt(a.sizes || '0', 10))[0];
  const contentPages = pages.filter((p) => p.slug !== 'home').slice(0, 6);
  return {
    source: content.source,
    site: { name: siteName, tagline: '', logo: logoKey, icon: icon ? mediaKey(icon.local) : null },
    announcement,
    menus: {
      primary: primary.length ? primary : contentPages.map((p) => ({ title: p.title, page: p.slug })),
      utility,
      footer: footerLinks.slice(0, 6).map((l) => ({ title: l.text, url: l.href })),
      social: social.filter((s, i, a) => a.findIndex((x) => x.url === s.url) === i).map((s) => ({ title: s.title || s.url, url: s.url })),
    },
    footer: {
      brand: siteName,
      text: footerText,
      newsletter: newsletterForm ? { placeholder: newsletterForm.fields[0]?.placeholder || 'Email address', button: newsletterForm.submit } : null,
      columns: footerCols.length ? footerCols.slice(0, 4) : [{ title: 'Pages', links: contentPages.map((p) => ({ text: p.title, href: `{{mf:page-url:${p.slug}}}` })) }],
    },
    pages,
    mediaFiles,
    mediaMeta,
  };
}
