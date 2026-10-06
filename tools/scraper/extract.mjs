/**
 * Runs inside the rendered page (page.evaluate). Must be fully self-contained.
 * Returns structured, reading-order content plus every media reference.
 */
export function extractPage() {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
  const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const media = [];
  const mediaSeen = new Set();
  const addMedia = (m) => {
    if (!m.url && !m.svg) return;
    const key = m.kind + '|' + (m.url || m.svg);
    if (mediaSeen.has(key)) return;
    mediaSeen.add(key);
    media.push(m);
  };
  const isHidden = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0' && el.getAttribute('aria-hidden') === 'true') return true;
    const r = el.getBoundingClientRect();
    return r.width === 0 && r.height === 0 && cs.position !== 'absolute' && !el.querySelector('img,video,svg');
  };
  const largestFromSrcset = (srcset) => {
    if (!srcset) return null;
    let best = null; let bestW = -1;
    for (const part of srcset.split(/,\s+(?=[^,]+(?:\s|$))/)) {
      const [u, d] = part.trim().split(/\s+/);
      const w = d ? parseFloat(d) * (d.endsWith('x') ? 1000 : 1) : 1;
      if (u && w > bestW) { bestW = w; best = u; }
    }
    return best ? abs(best) : null;
  };
  const bgUrls = (el) => {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none') return [];
    return [...bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => abs(m[1])).filter(Boolean);
  };
  const imgSrc = (img) => {
    const pic = img.closest('picture');
    let best = largestFromSrcset(img.getAttribute('srcset') || img.dataset.srcset);
    if (pic) for (const s of pic.querySelectorAll('source')) { const c = largestFromSrcset(s.getAttribute('srcset') || s.dataset.srcset); if (c && !best) best = c; }
    return best || abs(img.currentSrc || img.getAttribute('src') || img.dataset.src || img.dataset.lazySrc || '');
  };
  const embedInfo = (src) => {
    if (!src) return null;
    let m = src.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{6,})/);
    if (m) return { provider: 'youtube', id: m[1], url: `https://www.youtube.com/watch?v=${m[1]}` };
    m = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return { provider: 'vimeo', id: m[1], url: `https://vimeo.com/${m[1]}` };
    if (/wistia|loom\.com|dailymotion|player\./.test(src)) return { provider: 'other', url: src };
    return null;
  };
  const inlineHtml = (el) => {
    const out = [];
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) out.push(c.textContent.replace(/[<>&]/g, (x) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[x])));
        else if (c.nodeType === 1) {
          const t = c.tagName.toLowerCase();
          if (t === 'br') out.push('<br>');
          else if (['strong', 'b', 'em', 'i', 'u'].includes(t)) { out.push(`<${t === 'b' ? 'strong' : t === 'i' ? 'em' : t}>`); walk(c); out.push(`</${t === 'b' ? 'strong' : t === 'i' ? 'em' : t}>`); }
          else if (t === 'a' && c.getAttribute('href')) { out.push(`<a href="${abs(c.getAttribute('href'))}">`); walk(c); out.push('</a>'); }
          else if (!['script', 'style', 'svg', 'noscript'].includes(t)) walk(c);
        }
      }
    };
    walk(el);
    return out.join('').replace(/\s+/g, ' ').trim();
  };
  const looksLikeButton = (a) => {
    if (a.tagName === 'BUTTON' || a.getAttribute('role') === 'button') return true;
    if (/\b(btn|button|cta)\b/i.test(a.className && a.className.baseVal === undefined ? a.className : '')) return true;
    const cs = getComputedStyle(a);
    const hasBg = cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
    const hasBorder = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
    const padded = parseFloat(cs.paddingLeft) >= 10 && parseFloat(cs.paddingTop) >= 5;
    return (hasBg || hasBorder) && padded && clean(a.textContent).length < 40;
  };
  const formInfo = (f) => ({
    type: 'form', action: f.getAttribute('action') ? abs(f.getAttribute('action')) : null, method: (f.getAttribute('method') || 'get').toLowerCase(),
    fields: [...f.querySelectorAll('input,select,textarea')].filter((i) => !['hidden', 'submit', 'button'].includes(i.type)).map((i) => {
      const id = i.id && f.querySelector(`label[for="${CSS.escape(i.id)}"]`);
      return {
        tag: i.tagName.toLowerCase(), type: i.type || i.tagName.toLowerCase(), name: i.name || i.id || '',
        label: clean((id && id.textContent) || (i.closest('label') && i.closest('label').textContent) || i.getAttribute('aria-label') || ''),
        placeholder: i.getAttribute('placeholder') || '', required: i.required,
        options: i.tagName === 'SELECT' ? [...i.options].map((o) => clean(o.textContent)) : undefined,
      };
    }),
    submit: clean((f.querySelector('[type=submit],button') || {}).textContent || (f.querySelector('[type=submit]') || {}).value || ''),
  });

  const CONTAINER_TAGS = new Set(['div', 'section', 'article', 'aside', 'main', 'header', 'footer', 'nav', 'body', 'figure', 'li']);
  // ---- block extraction in reading order
  function blocksOf(root, ctx = {}) {
    const blocks = [];
    const visit = (el, link) => {
      if (el.nodeType !== 1) return;
      const tag = el.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'template', 'link', 'meta'].includes(tag)) return;
      if (tag !== 'svg' && isHidden(el)) return;
      // background image on any non-root element
      if (el !== root) for (const u of bgUrls(el)) { addMedia({ kind: 'image', url: u, role: 'background' }); blocks.push({ type: 'image', src: u, alt: el.getAttribute('aria-label') || '', role: 'background', link }); }
      if (/^h[1-6]$/.test(tag) || el.getAttribute('role') === 'heading') {
        const text = clean(el.innerText);
        if (text) blocks.push({ type: 'heading', level: /^h[1-6]$/.test(tag) ? +tag[1] : +(el.getAttribute('aria-level') || 2), text, link: link || (el.querySelector('a[href]') && abs(el.querySelector('a[href]').getAttribute('href'))) || undefined });
        el.querySelectorAll('img').forEach((i) => visit(i, link));
        return;
      }
      if (tag === 'img') {
        const src = imgSrc(el);
        if (src && !/^data:image\/(gif|svg)/.test(src)) {
          const b = { type: 'image', src, alt: el.getAttribute('alt') || '', width: el.naturalWidth || undefined, height: el.naturalHeight || undefined, link };
          addMedia({ kind: 'image', url: src, alt: b.alt, width: b.width, height: b.height });
          const cur = abs(el.currentSrc || el.src); if (cur && cur !== src) addMedia({ kind: 'image', url: cur, alt: b.alt, variantOf: src });
          blocks.push(b);
        }
        return;
      }
      if (tag === 'picture') { const i = el.querySelector('img'); if (i) visit(i, link); return; }
      if (tag === 'video') {
        const src = abs(el.currentSrc || el.getAttribute('src') || (el.querySelector('source') || {}).src || '');
        const poster = el.getAttribute('poster') ? abs(el.getAttribute('poster')) : null;
        if (src) addMedia({ kind: 'video', url: src });
        el.querySelectorAll('source').forEach((s) => s.src && addMedia({ kind: 'video', url: abs(s.src) }));
        if (poster) addMedia({ kind: 'image', url: poster, role: 'poster' });
        blocks.push({ type: 'video', src, poster, autoplay: el.autoplay, loop: el.loop, muted: el.muted });
        return;
      }
      if (tag === 'iframe') {
        const e = embedInfo(el.src || el.dataset.src);
        if (e) { addMedia({ kind: 'embed', ...e }); blocks.push({ type: 'embed', ...e }); }
        else if (el.src && /maps\.google|google\.com\/maps/.test(el.src)) blocks.push({ type: 'map', url: el.src });
        return;
      }
      if (tag === 'svg') {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || el.closest('button,a') && r.width < 14) return;
        const svg = el.outerHTML.length < 60000 ? el.outerHTML : null;
        if (svg) {
          const hint = clean(el.getAttribute('aria-label') || (el.querySelector('title') || {}).textContent || el.closest('[class]')?.className?.toString().split(/\s+/)[0] || 'icon');
          addMedia({ kind: 'inline-svg', svg, url: null, hint });
          blocks.push({ type: 'svg', svg, width: Math.round(r.width), height: Math.round(r.height), link });
        }
        return;
      }
      if (tag === 'form') { blocks.push(formInfo(el)); return; }
      if (tag === 'ul' || tag === 'ol') {
        const items = [...el.children].filter((li) => !isHidden(li)).map((li) => {
          const a = li.querySelector(':scope > a[href]') || (li.children.length === 1 && li.querySelector('a[href]'));
          const hasMedia = li.querySelector('img,video,h1,h2,h3,h4,h5,h6,p,picture');
          if (hasMedia && li.querySelectorAll('*').length > 4) return { complex: true, blocks: blocksOf(li, { link }) };
          return a ? { text: clean(li.innerText), href: abs(a.getAttribute('href')) } : clean(li.innerText);
        }).filter((i) => i && (typeof i === 'string' ? i : i.complex ? i.blocks.length : i.text));
        if (items.some((i) => i.complex)) { items.forEach((i) => (i.complex ? blocks.push(...i.blocks) : blocks.push({ type: 'paragraph', text: typeof i === 'string' ? i : i.text, html: typeof i === 'string' ? i : `<a href="${i.href}">${i.text}</a>` }))); return; }
        if (items.length) blocks.push({ type: 'list', ordered: tag === 'ol', items });
        return;
      }
      if (tag === 'blockquote') { blocks.push({ type: 'quote', text: clean(el.innerText), html: inlineHtml(el) }); return; }
      if ((tag === 'a' && el.getAttribute('href')) || tag === 'button') {
        const href = tag === 'a' ? abs(el.getAttribute('href')) : null;
        const rich = el.querySelector('img,video,picture,h1,h2,h3,h4,h5,h6,p,div div');
        if (!rich && clean(el.innerText) && (tag === 'button' || looksLikeButton(el))) {
          if (tag === 'button' && el.closest('form')) return;
          blocks.push({ type: 'button', text: clean(el.innerText), href }); return;
        }
        if (!rich && clean(el.innerText)) { blocks.push({ type: 'link', text: clean(el.innerText), href }); return; }
        for (const c of el.childNodes) visit(c, href || link);
        if (!rich) el.querySelectorAll('svg').length && null;
        return;
      }
      if (tag === 'p' || tag === 'figcaption' || tag === 'address') {
        const text = clean(el.innerText);
        if (text) blocks.push({ type: 'paragraph', text, html: inlineHtml(el), link });
        el.querySelectorAll('img,svg').forEach((i) => visit(i, link));
        return;
      }
      if (tag === 'table') { blocks.push({ type: 'table', rows: [...el.rows].map((r) => [...r.cells].map((c) => clean(c.innerText))) }); return; }
      // generic container: emit direct text as a paragraph (div-soup builders), then recurse
      const direct = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
      const onlyInline = [...el.children].every((c) => ['span', 'strong', 'em', 'b', 'i', 'br', 'a', 'small', 'sup', 'sub', 'u', 'mark'].includes(c.tagName.toLowerCase()) && !c.querySelector('img,picture,video,svg,h1,h2,h3,h4,h5,h6,p,div,ul,ol') && !(c.tagName === 'A' && looksLikeButton(c)));
      if (clean(direct) && onlyInline) {
        const text = clean(el.innerText);
        const cs = getComputedStyle(el);
        const big = parseFloat(cs.fontSize) >= 28 || (parseFloat(cs.fontSize) >= 20 && parseInt(cs.fontWeight, 10) >= 600);
        if (big && text.length < 140) blocks.push({ type: 'heading', level: parseFloat(cs.fontSize) >= 40 ? 2 : 3, text, inferred: true, link });
        else blocks.push({ type: 'paragraph', text, html: inlineHtml(el), link });
        return;
      }
      if (onlyInline && el.children.length && clean(el.innerText)) {
        const a = el.querySelector('a[href]');
        if (el.children.length === 1 && a) return visit(a, link);
        blocks.push({ type: 'paragraph', text: clean(el.innerText), html: inlineHtml(el), link }); return;
      }
      for (const c of el.children) visit(c, link);
    };
    const roots = Array.isArray(root) ? root : [root];
    for (const r of roots) {
      for (const u of bgUrls(r)) addMedia({ kind: 'image', url: u, role: 'background' });
      if (CONTAINER_TAGS.has(r.tagName.toLowerCase())) for (const c of r.children) visit(c, ctx.link);
      else visit(r, ctx.link);
    }
    return blocks;
  }

  // ---- section detection
  const header = document.querySelector('header, [role=banner], #header, .header, #site-header');
  const footer = [...document.querySelectorAll('footer, [role=contentinfo], #footer, .footer, #site-footer')].pop();
  let main = document.querySelector('main, [role=main], #main, #content, .main-content') || document.body;
  // unwrap single-child wrappers
  const meaningful = (el) => [...el.children].filter((c) => !['script', 'style', 'noscript', 'link', 'template'].includes(c.tagName.toLowerCase()) && !isHidden(c) && c !== header && c !== footer && !c.contains(header) && !c.contains(footer));
  let guard = 0;
  while (guard++ < 12) {
    const kids = meaningful(main);
    if (kids.length !== 1) break;
    main = kids[0];
  }
  let roots = meaningful(main);
  if (main === document.body || roots.length < 2) {
    // fall back to tall, full-width-ish blocks
    roots = roots.length ? roots : [main];
  }
  // Split very tall wrappers that contain several <section> elements
  roots = roots.flatMap((r) => {
    const secs = r.querySelectorAll(':scope > section, :scope > div > section');
    return secs.length > 1 && !['section'].includes(r.tagName.toLowerCase()) ? [...secs] : [r];
  });
  const groups = [];
  for (const r of roots) {
    const isContainer = CONTAINER_TAGS.has(r.tagName.toLowerCase());
    const last = groups[groups.length - 1];
    if (!isContainer && last && last.virtual) last.els.push(r);
    else groups.push({ els: [r], virtual: !isContainer });
  }
  const rgb2hex = (c) => { const m = c && c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] < 0.05)) return null; return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join(''); };
  const sections = groups.map((g, i) => {
    const el = g.virtual ? (g.els.length === 1 ? g.els[0] : g.els[0].parentElement) : g.els[0];
    const r = g.virtual ? g.els.reduce((acc, e) => { const b = e.getBoundingClientRect(); return { top: Math.min(acc.top, b.top), bottom: Math.max(acc.bottom, b.bottom), width: Math.max(acc.width, b.width) }; }, { top: Infinity, bottom: -Infinity, width: 0 }) : el.getBoundingClientRect();
    if (g.virtual) r.height = r.bottom - r.top;
    const cs = getComputedStyle(g.virtual ? document.body : el);
    const bgImage = g.virtual ? null : bgUrls(el)[0] || null;
    let bgVideo = null;
    const v = g.virtual ? null : el.querySelector('video');
    if (v && v.getBoundingClientRect().width >= r.width * 0.8) bgVideo = abs(v.currentSrc || v.src || (v.querySelector('source') || {}).src);
    const blocks = blocksOf(g.virtual ? g.els : el);
    const firstImg = g.virtual ? null : el.querySelector('img');
    const coverImg = !bgImage && firstImg && firstImg.getBoundingClientRect().width >= r.width * 0.9 && firstImg.getBoundingClientRect().height >= r.height * 0.6 ? imgSrc(firstImg) : null;
    const xs = new Set([...el.querySelectorAll('h2,h3,h4,img,p')].map((n) => Math.round(n.getBoundingClientRect().left / 40)));
    return {
      index: i, tag: g.virtual ? 'group' : el.tagName.toLowerCase(), id: el.id || null,
      classes: (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 6),
      rect: { top: Math.round(r.top + scrollY), height: Math.round(r.height), width: Math.round(r.width) },
      background: { color: rgb2hex(cs.backgroundColor), image: bgImage || coverImg, video: bgVideo, textColor: rgb2hex(cs.color) },
      hints: {
        headings: blocks.filter((b) => b.type === 'heading').length,
        images: blocks.filter((b) => b.type === 'image').length,
        buttons: blocks.filter((b) => b.type === 'button').length,
        paragraphs: blocks.filter((b) => b.type === 'paragraph').length,
        forms: blocks.filter((b) => b.type === 'form').length,
        videos: blocks.filter((b) => b.type === 'video' || b.type === 'embed').length,
        columns: Math.min(xs.size, 6),
        textLength: clean(el.innerText).length,
      },
      blocks,
    };
  }).filter((s) => s.blocks.length || s.background.image || s.background.video);

  // ---- site chrome
  const navOf = (root) => {
    if (!root) return [];
    const top = root.querySelector('nav ul, [role=navigation] ul, ul') || root;
    const items = (ul) => [...ul.children].map((li) => {
      const a = li.querySelector(':scope > a, :scope > * > a, a');
      const sub = li.querySelector('ul');
      return a ? { text: clean(a.innerText || a.getAttribute('aria-label')), href: abs(a.getAttribute('href')), children: sub ? items(sub) : [] } : null;
    }).filter((x) => x && x.text);
    const list = top.tagName === 'UL' ? items(top) : [...root.querySelectorAll('a[href]')].map((a) => ({ text: clean(a.innerText), href: abs(a.getAttribute('href')), children: [] })).filter((x) => x.text);
    return list;
  };
  const footerLinks = footer ? [...footer.querySelectorAll('ul, nav')].map((ul) => {
    const prev = ul.previousElementSibling;
    return { heading: prev && /^H\d|P|DIV|SPAN$/.test(prev.tagName) ? clean(prev.innerText).slice(0, 60) : '', links: [...ul.querySelectorAll('a[href]')].map((a) => ({ text: clean(a.innerText || a.getAttribute('aria-label')), href: abs(a.getAttribute('href')) })) };
  }).filter((g) => g.links.length) : [];
  const footerBlocks = footer ? blocksOf(footer) : [];
  const headerBlocks = header ? blocksOf(header) : [];

  let logo = null;
  const logoEl = (header || document).querySelector('[class*=logo] img, img[alt*=logo i], a[href="/"] img, [class*=logo] svg, a[href="/"] svg, a[href="' + location.origin + '/"] img');
  if (logoEl) logo = logoEl.tagName.toLowerCase() === 'img' ? { src: imgSrc(logoEl), alt: logoEl.alt || '' } : { svg: logoEl.outerHTML };
  if (logo && logo.src) addMedia({ kind: 'image', url: logo.src, role: 'logo' });
  const icons = [...document.querySelectorAll('link[rel~=icon], link[rel=apple-touch-icon]')].map((l) => ({ href: abs(l.href), size: parseInt((l.sizes && l.sizes.value) || '0', 10) || (l.rel.includes('apple') ? 180 : 16) })).sort((a, b) => b.size - a.size);
  const favicon = icons[0] ? icons[0].href : abs('/favicon.ico');
  icons.forEach((i) => addMedia({ kind: 'image', url: i.href, role: 'icon' }));

  // ---- meta
  const metaContent = (sel) => (document.querySelector(sel) || {}).content || null;
  const og = {};
  document.querySelectorAll('meta[property^="og:"], meta[name^="og:"], meta[name^="twitter:"], meta[property^="twitter:"]').forEach((m) => { og[m.getAttribute('property') || m.getAttribute('name')] = m.content; });
  if (og['og:image']) addMedia({ kind: 'image', url: abs(og['og:image']), role: 'og' });

  // every element background + video posters (catch anything outside sections)
  document.querySelectorAll('body *').forEach((el) => { if (el.closest('svg')) return; for (const u of bgUrls(el)) addMedia({ kind: 'image', url: u, role: 'background' }); });
  document.querySelectorAll('img').forEach((i) => { const s = imgSrc(i); if (s) addMedia({ kind: 'image', url: s, alt: i.alt || '' }); });
  document.querySelectorAll('video').forEach((v) => { if (v.currentSrc) addMedia({ kind: 'video', url: abs(v.currentSrc) }); if (v.poster) addMedia({ kind: 'image', url: abs(v.poster), role: 'poster' }); });
  document.querySelectorAll('iframe').forEach((f) => { const e = embedInfo(f.src || f.dataset.src); if (e) addMedia({ kind: 'embed', ...e }); });

  // ---- brand colours & fonts
  const counts = {};
  const bump = (hex, usage, w = 1) => { if (!hex) return; const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); const sat = Math.max(r, g, b) - Math.min(r, g, b); counts[hex] ??= { hex, count: 0, usage: new Set(), chroma: sat }; counts[hex].count += w; counts[hex].usage.add(usage); };
  document.querySelectorAll('a, button, [class*=btn], [class*=button]').forEach((el) => { if (isHidden(el)) return; const cs = getComputedStyle(el); bump(rgb2hex(cs.backgroundColor), 'button-bg', 3); bump(rgb2hex(cs.color), 'link', 1); bump(rgb2hex(cs.borderTopColor), 'border', parseFloat(cs.borderTopWidth) ? 1 : 0); });
  document.querySelectorAll('h1,h2,h3').forEach((el) => bump(rgb2hex(getComputedStyle(el).color), 'heading', 2));
  sections.forEach((s) => bump(s.background.color, 'section-bg', 2));
  const palette = Object.values(counts).filter((c) => c.count > 0).map((c) => ({ ...c, usage: [...c.usage] })).sort((a, b) => b.count - a.count);
  const accent = (palette.find((c) => c.chroma > 40 && c.usage.includes('button-bg')) || palette.find((c) => c.chroma > 40) || {}).hex || metaContent('meta[name=theme-color]') || null;
  const ff = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).fontFamily : null; };
  const fonts = { heading: ff('h1') || ff('h2'), body: ff('p') || getComputedStyle(document.body).fontFamily, button: ff('button, .btn, [class*=button]'), loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/"/g, '')} ${f.weight} ${f.style}`).filter((v, i, a) => a.indexOf(v) === i) };

  return {
    title: document.title, lang: document.documentElement.lang || null,
    meta: { description: metaContent('meta[name=description]'), canonical: (document.querySelector('link[rel=canonical]') || {}).href || null, robots: metaContent('meta[name=robots]'), og },
    headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => !isHidden(h)).map((h) => ({ level: +h.tagName[1], text: clean(h.innerText) })).filter((h) => h.text),
    sections,
    header: headerBlocks, footer: footerBlocks,
    nav: navOf(header && (header.querySelector('nav') || header)), footerLinks,
    forms: [...document.querySelectorAll('form')].map(formInfo),
    links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && !/^(mailto|tel|javascript|#)/i.test(h)),
    media, logo, favicon,
    brand: { palette: palette.slice(0, 12), accent, themeColor: metaContent('meta[name=theme-color]') },
    fonts,
  };
}
