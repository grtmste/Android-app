/**
 * Design-system patterns (design/design-system.md §6) → Elementor container trees.
 * Each pattern returns ONE top-level container, which is also exported as a reusable template.
 */
import {
  container, heading, text, button, image, video, imageCarousel, iconList, html, accordion,
  px, unit, box, gap, media, color, typo, anim,
} from './elementor.mjs';

const SECTION_PAD = { padding: box(96, 40, 96, 40), padding_tablet: box(64, 24, 64, 24), padding_mobile: box(48, 16, 48, 16) };
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const para = (t) => (t ? (/<\w/.test(t) ? t : t.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')) : '');

function section(settings, elements, cls = '') {
  return container({ html_tag: 'section', ...SECTION_PAD, flex_direction: 'column', flex_gap: gap(32), css_classes: cls, ...settings }, elements);
}
function row(elements, settings = {}) {
  return container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', flex_gap: gap(12), flex_align_items: 'center', padding: box(0), ...settings }, elements, true);
}
function buttons(list = [], { dark = false, delay = 300, align } = {}) {
  if (!list.length) return null;
  return row(
    list.map((b, i) =>
      button(b.text, b.href, {
        variant: b.variant || (dark ? (i === 0 ? 'light' : 'outline-light') : i === 0 ? 'primary' : 'outline'),
        animation: 'fadeInUp',
        delay: delay + i * 100,
        icon: b.icon,
      }),
    ),
    align ? { flex_justify_content: align } : {},
  );
}
function sectionHeader({ eyebrow, heading: h, link: l, dark = false }) {
  const left = container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(8), padding: box(0), width: unit('%', 70), width_mobile: unit('%', 100) }, [
    eyebrow ? text(`<p>${esc(eyebrow)}</p>`, { typography: 'accent', colorId: dark ? 'mfwhite' : 'secondary', animation: 'fadeIn' }) : null,
    h ? heading(h, { tag: 'h2', typography: 'mfh2', colorId: dark ? 'mfwhite' : 'primary', animation: 'fadeInUp', cls: 'mf-reveal' }) : null,
  ].filter(Boolean), true);
  const items = [left];
  if (l) items.push(button(l.text, l.href, { variant: dark ? 'outline-light' : 'outline', animation: 'fadeIn', delay: 200, size: 'sm' }));
  return row(items, { flex_justify_content: 'space-between', flex_align_items: 'flex-end', flex_wrap: 'wrap', flex_gap: gap(16) });
}

/* ------------------------------------------------------------------ P4 hero */
export function hero(d) {
  const height = { full: 92, large: 80, medium: 64, small: 52 }[d.height || 'full'];
  const s = {
    content_width: 'full',
    html_tag: 'section',
    min_height: unit('vh', height),
    min_height_mobile: unit('vh', Math.min(height, 86)),
    flex_direction: 'column',
    flex_justify_content: d.align === 'center' ? 'center' : 'flex-end',
    flex_align_items: d.align === 'center' ? 'center' : 'flex-start',
    flex_gap: gap(20),
    padding: box(80, 40, 72, 40),
    padding_tablet: box(64, 24, 56, 24),
    padding_mobile: box(48, 16, 40, 16),
    background_overlay_background: 'gradient',
    background_overlay_color: 'rgba(0,0,0,0.05)',
    background_overlay_color_stop: unit('%', 30),
    background_overlay_color_b: 'rgba(0,0,0,0.6)',
    background_overlay_color_b_stop: unit('%', 100),
    background_overlay_gradient_angle: unit('deg', 180),
    css_classes: ['mf-hero', d.image && !d.video ? 'mf-hero-zoom' : ''].filter(Boolean).join(' '),
    __globals__: { background_color: color('primary') },
  };
  if (d.video) {
    Object.assign(s, {
      background_background: 'video',
      background_video_link: d.video.startsWith('http') ? d.video : `{{mf:media-url:${d.video}}}`,
      background_play_on_mobile: 'yes',
      background_play_once: '',
      background_video_fallback: media(d.image || d.poster),
    });
  } else {
    Object.assign(s, {
      background_background: 'classic',
      background_image: media(d.image),
      background_position: d.position || 'center center',
      background_size: 'cover',
      background_repeat: 'no-repeat',
    });
    if (d.imageMobile) Object.assign(s, { background_image_mobile: media(d.imageMobile), background_position_mobile: 'center center', background_size_mobile: 'cover' });
  }
  const center = d.align === 'center';
  const kids = [
    d.eyebrow ? text(`<p>${esc(d.eyebrow)}</p>`, { typography: 'accent', colorId: 'mfwhite', animation: 'fadeIn', align: center ? 'center' : undefined }) : null,
    heading(d.heading, { tag: 'h1', typography: 'mfdisplay', colorId: 'mfwhite', cls: 'mf-reveal', align: center ? 'center' : undefined }),
    d.text ? text(para(d.text), { typography: 'mflead', colorId: 'mfwhite', animation: 'fadeInUp', delay: 200, maxWidth: 620, align: center ? 'center' : undefined }) : null,
    buttons(d.buttons, { dark: true, delay: 350, align: center ? 'center' : undefined }),
  ].filter(Boolean);
  return container(s, [container({ content_width: 'boxed', flex_direction: 'column', flex_gap: gap(16), padding: box(0), flex_align_items: center ? 'center' : 'flex-start' }, kids, true)]);
}

/* -------------------------------------------------------------- P5 marquee */
export function marquee(d) {
  const items = d.items || [d.text];
  return container(
    {
      content_width: 'full',
      html_tag: 'section',
      padding: box(18, 0, 18, 0),
      background_background: 'classic',
      __globals__: { background_color: color(d.dark === false ? 'mfsurface' : 'primary') },
      css_classes: 'mf-marquee-band',
    },
    [heading(items.join('  •  '), { tag: 'p', typography: 'mfh2', colorId: d.dark === false ? 'primary' : 'mfwhite', cls: `mf-marquee${d.speed ? ' mf-marquee--' + d.speed : ''}` })],
  );
}

/* --------------------------------------------------------- P7 category tiles */
export function tiles(d) {
  const n = d.items.length;
  const grid = container(
    {
      content_width: 'full',
      container_type: 'grid',
      grid_columns_grid: unit('fr', Math.min(n, 4)),
      grid_columns_grid_tablet: unit('fr', Math.min(n, 2)),
      grid_columns_grid_mobile: unit('fr', 1),
      grid_rows_grid: unit('fr', 1),
      grid_gaps: { column: '12', row: '12', isLinked: true, unit: 'px' },
      grid_auto_flow: 'row',
      padding: box(0),
    },
    d.items.map((it, i) =>
      container(
        {
          content_width: 'full',
          min_height: unit('px', n <= 2 ? 640 : 560),
          min_height_tablet: unit('px', 480),
          min_height_mobile: unit('px', 440),
          flex_direction: 'column',
          flex_justify_content: 'flex-end',
          flex_align_items: 'flex-start',
          flex_gap: gap(16),
          padding: box(28, 28, 28, 28),
          padding_mobile: box(20, 20, 20, 20),
          background_background: 'classic',
          background_image: media(it.image, it.label),
          background_position: 'center center',
          background_size: 'cover',
          css_classes: 'mf-tile mf-hover-zoom',
          ...anim('container', 'fadeInUp', i * 100),
        },
        [
          heading(it.label, { tag: 'h3', typography: 'secondary', colorId: 'mfwhite', link: it.href }),
          it.button ? button(it.button, it.href, { variant: 'light', size: 'sm' }) : null,
        ].filter(Boolean),
        true,
      ),
    ),
    true,
  );
  return section({}, [d.heading ? sectionHeader(d) : null, grid].filter(Boolean), 'mf-tiles');
}

/* ------------------------------------------------------------ P6 rail/cards */
export function rail(d) {
  const track = container(
    {
      content_width: 'full',
      flex_direction: 'row',
      flex_wrap: 'nowrap',
      flex_gap: gap(16),
      flex_gap_mobile: gap(10),
      padding: box(0),
      css_classes: 'mf-carousel',
    },
    d.items.map((it, i) =>
      container(
        {
          content_width: 'full',
          width: unit('%', 23.5),
          width_tablet: unit('%', 38),
          width_mobile: unit('%', 72),
          flex_direction: 'column',
          flex_gap: gap(6),
          padding: box(0),
          css_classes: 'mf-card-item',
          // Only the first visible cards animate; off-screen cards in the rail must never stay hidden.
          ...(i < 4 ? anim('container', 'fadeInUp', i * 100) : {}),
        },
        [
          image(it.image, { alt: it.title, href: it.href, ratio: '4x5', cls: 'mf-hover-zoom', size: 'large' }),
          it.badge ? text(`<p>${esc(it.badge)}</p>`, { typography: 'accent', colorId: 'primary' }) : null,
          heading(it.title, { tag: 'h3', typography: 'mfcard', colorId: 'primary', link: it.href }),
          it.meta ? text(`<p>${esc(it.meta)}</p>`, { typography: 'mfsmall', colorId: 'secondary' }) : null,
        ].filter(Boolean),
        true,
      ),
    ),
    true,
  );
  return section({ flex_gap: gap(24) }, [sectionHeader(d), track], 'mf-rail');
}

/* ------------------------------------------------------- P8 split image/text */
export function split(d) {
  const dark = !!d.dark;
  const media_ = container(
    { content_width: 'full', width: unit('%', 50), width_tablet: unit('%', 100), padding: box(0), css_classes: 'mf-split__media' },
    [d.video ? video({ youtube: d.video.youtube, vimeo: d.video.vimeo, hosted: d.video.hosted, poster: d.image }) : image(d.image, { alt: d.imageAlt || d.heading, ratio: d.ratio || '4x5', cls: 'mf-parallax', animation: 'fadeIn', size: 'full' })],
    true,
  );
  const copy = container(
    {
      content_width: 'full',
      width: unit('%', 50),
      width_tablet: unit('%', 100),
      flex_direction: 'column',
      flex_justify_content: 'center',
      flex_gap: gap(20),
      padding: box(48, 64, 48, 64),
      padding_tablet: box(40, 24, 8, 24),
      padding_mobile: box(32, 16, 0, 16),
    },
    [
      d.eyebrow ? text(`<p>${esc(d.eyebrow)}</p>`, { typography: 'accent', colorId: dark ? 'mfwhite' : 'secondary', animation: 'fadeIn' }) : null,
      heading(d.heading, { tag: 'h2', typography: 'mfh2', colorId: dark ? 'mfwhite' : 'primary', cls: 'mf-reveal' }),
      d.text ? text(para(d.text), { colorId: dark ? 'mfwhite' : 'text', animation: 'fadeInUp', delay: 150, maxWidth: 560 }) : null,
      d.list ? iconList(d.list.map((t) => ({ text: t })), { animation: 'fadeInUp', delay: 200 }) : null,
      buttons(d.buttons, { dark, delay: 250 }),
    ].filter(Boolean),
    true,
  );
  return container(
    {
      content_width: 'full',
      html_tag: 'section',
      flex_direction: d.reverse ? 'row-reverse' : 'row',
      flex_direction_tablet: 'column',
      flex_wrap: 'nowrap',
      flex_gap: gap(0),
      padding: box(0),
      background_background: 'classic',
      __globals__: { background_color: color(dark ? 'primary' : d.surface ? 'mfsurface' : 'mfwhite') },
      css_classes: 'mf-split',
    },
    [media_, copy],
  );
}

/* --------------------------------------------------------- P9 editorial image */
export function editorial(d) {
  return container(
    {
      content_width: 'full',
      html_tag: 'section',
      min_height: unit('vh', 78),
      min_height_mobile: unit('vh', 64),
      flex_direction: 'column',
      flex_justify_content: d.align === 'center' ? 'center' : 'flex-end',
      flex_align_items: d.align === 'center' ? 'center' : 'flex-start',
      padding: box(72, 40, 72, 40),
      padding_mobile: box(40, 16, 40, 16),
      background_background: 'classic',
      background_image: media(d.image, d.heading),
      background_position: 'center center',
      background_size: 'cover',
      background_overlay_background: 'classic',
      background_overlay_color: '#000000',
      background_overlay_opacity: unit('px', 0.3),
      css_classes: 'mf-editorial mf-parallax',
    },
    [
      container({ content_width: 'boxed', flex_direction: 'column', flex_gap: gap(16), padding: box(0), flex_align_items: d.align === 'center' ? 'center' : 'flex-start' }, [
        d.eyebrow ? text(`<p>${esc(d.eyebrow)}</p>`, { typography: 'accent', colorId: 'mfwhite', animation: 'fadeIn' }) : null,
        d.heading ? heading(d.heading, { tag: 'h2', typography: 'mfdisplay', colorId: 'mfwhite', cls: 'mf-reveal', align: d.align === 'center' ? 'center' : undefined }) : null,
        d.text ? text(para(d.text), { typography: 'mflead', colorId: 'mfwhite', animation: 'fadeInUp', delay: 200, maxWidth: 600, align: d.align === 'center' ? 'center' : undefined }) : null,
        buttons(d.buttons, { dark: true, delay: 300, align: d.align === 'center' ? 'center' : undefined }),
      ].filter(Boolean), true),
    ],
  );
}

/* -------------------------------------------------------- P10 feature strip */
export function features(d) {
  const n = d.items.length;
  return section(
    { __globals__: { background_color: color(d.surface ? 'mfsurface' : 'mfwhite') }, background_background: 'classic' },
    [
      d.heading ? sectionHeader(d) : null,
      container(
        {
          content_width: 'full',
          container_type: 'grid',
          grid_columns_grid: unit('fr', Math.min(n, 4)),
          grid_columns_grid_tablet: unit('fr', 2),
          grid_columns_grid_mobile: unit('fr', 1),
          grid_rows_grid: unit('fr', 1),
          grid_gaps: { column: '32', row: '32', isLinked: true, unit: 'px' },
          padding: box(0),
        },
        d.items.map((it, i) =>
          container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(10), padding: box(0), ...anim('container', 'fadeInUp', i * 100) }, [
            it.number ? text(`<p>${esc(it.number)}</p>`, { typography: 'mfdisplay', colorId: 'accent' }) : null,
            heading(it.title, { tag: 'h3', typography: 'secondary', colorId: 'primary' }),
            it.text ? text(para(it.text), { colorId: 'secondary' }) : null,
          ].filter(Boolean), true),
        ),
        true,
      ),
    ],
    'mf-features',
  );
}

/* ---------------------------------------------------------- P11 text block */
export function textBlock(d) {
  const center = d.align !== 'left';
  return section(
    {
      flex_align_items: center ? 'center' : 'flex-start',
      boxed_width: unit('px', 880),
      flex_gap: gap(20),
      background_background: 'classic',
      __globals__: { background_color: color(d.dark ? 'primary' : d.surface ? 'mfsurface' : 'mfwhite') },
      ...(d.compact ? { padding: box(128, 40, 48, 40), padding_tablet: box(96, 24, 40, 24), padding_mobile: box(72, 16, 32, 16) } : {}),
    },
    [
      d.eyebrow ? text(`<p>${esc(d.eyebrow)}</p>`, { typography: 'accent', colorId: d.dark ? 'mfwhite' : 'secondary', animation: 'fadeIn', align: center ? 'center' : undefined }) : null,
      d.heading ? heading(d.heading, { tag: d.h1 ? 'h1' : 'h2', typography: d.h1 ? 'primary' : 'mfh2', colorId: d.dark ? 'mfwhite' : 'primary', cls: 'mf-reveal', align: center ? 'center' : undefined }) : null,
      d.text ? text(para(d.text), { typography: d.lead ? 'mflead' : 'text', colorId: d.dark ? 'mfwhite' : 'text', animation: 'fadeInUp', delay: 150, align: center ? 'center' : undefined }) : null,
      buttons(d.buttons, { dark: d.dark, delay: 250, align: center ? 'center' : undefined }),
    ].filter(Boolean),
    'mf-text-block',
  );
}

/* ------------------------------------------------------------------ P12 FAQ */
export function faq(d) {
  return section({ boxed_width: unit('px', 960), flex_gap: gap(24) }, [sectionHeader(d), accordion(d.items, { animation: 'fadeInUp' })], 'mf-faq');
}

/* ----------------------------------------------------------- P13 newsletter */
export function newsletter(d) {
  const form = `<form class="mf-form mf-form--inline mf-form--dark" method="post" action="{{mf:admin-post}}">
  <input type="hidden" name="action" value="modafie_form">
  <input type="hidden" name="mf_form_type" value="newsletter">
  <label class="screen-reader-text" for="mf-nl-email">${esc(d.placeholder || 'Email address')}</label>
  <input id="mf-nl-email" type="email" name="mf_email" placeholder="${esc(d.placeholder || 'Email address')}" required autocomplete="email">
  <button type="submit">${esc(d.button || 'Sign up')}</button>
</form>${d.consent ? `\n<p class="mf-consent" style="margin-top:12px;font-size:12px;opacity:.7">${esc(d.consent)}</p>` : ''}`;
  return section(
    { flex_align_items: 'center', boxed_width: unit('px', 760), flex_gap: gap(20), background_background: 'classic', __globals__: { background_color: color('primary') } },
    [
      heading(d.heading, { tag: 'h2', typography: 'mfh2', colorId: 'mfwhite', cls: 'mf-reveal', align: 'center' }),
      d.text ? text(para(d.text), { colorId: 'mfwhite', animation: 'fadeInUp', delay: 150, align: 'center' }) : null,
      html(form, { animation: 'fadeInUp', delay: 250 }),
    ].filter(Boolean),
    'mf-newsletter',
  );
}

/* -------------------------------------------------------------- P14 contact */
export function contact(d) {
  const fields = (d.fields || [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'message', label: 'Message', type: 'textarea', required: true },
  ]).map((f) => {
    const id = `mf-c-${f.name}`;
    const req = f.required ? ' required' : '';
    const input = f.type === 'textarea'
      ? `<textarea id="${id}" name="mf_${f.name}"${req}></textarea>`
      : f.type === 'select'
        ? `<select id="${id}" name="mf_${f.name}"${req}>${(f.options || []).map((o) => `<option>${esc(o)}</option>`).join('')}</select>`
        : `<input id="${id}" type="${f.type || 'text'}" name="mf_${f.name}"${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}${req}${f.type === 'email' ? ' autocomplete="email"' : ''}>`;
    return `  <div class="mf-form__field"><label for="${id}">${esc(f.label)}</label>${input}</div>`;
  });
  const form = `<form class="mf-form" method="post" action="{{mf:admin-post}}">
  <input type="hidden" name="action" value="modafie_form">
  <input type="hidden" name="mf_form_type" value="contact">
${fields.join('\n')}
  <div><button type="submit">${esc(d.submit || 'Send message')}</button></div>
</form>`;
  return section(
    { flex_direction: 'row', flex_direction_tablet: 'column', flex_gap: gap(64), flex_wrap: 'nowrap' },
    [
      container({ content_width: 'full', width: unit('%', 40), width_tablet: unit('%', 100), flex_direction: 'column', flex_gap: gap(20), padding: box(0) }, [
        d.eyebrow ? text(`<p>${esc(d.eyebrow)}</p>`, { typography: 'accent', colorId: 'secondary', animation: 'fadeIn' }) : null,
        heading(d.heading, { tag: 'h2', typography: 'mfh2', cls: 'mf-reveal' }),
        d.text ? text(para(d.text), { animation: 'fadeInUp', delay: 150 }) : null,
        d.details?.length ? iconList(d.details.map((x) => ({ text: x.text, href: x.href, icon: x.icon })), { animation: 'fadeInUp', delay: 200 }) : null,
      ].filter(Boolean), true),
      container({ content_width: 'full', width: unit('%', 60), width_tablet: unit('%', 100), padding: box(0) }, [html(form, { animation: 'fadeInUp', delay: 200 })], true),
    ],
    'mf-contact',
  );
}

/* ---------------------------------------------------------------- P16 video */
export function videoBlock(d) {
  return section({ flex_gap: gap(24) }, [d.heading ? sectionHeader(d) : null, video({ youtube: d.youtube, vimeo: d.vimeo, hosted: d.hosted, poster: d.poster, animation: 'fadeIn' })].filter(Boolean), 'mf-video');
}

/* ------------------------------------------------------ gallery (carousel) */
export function gallery(d) {
  return section({ flex_gap: gap(24) }, [d.heading ? sectionHeader(d) : null, imageCarousel(d.images, { animation: 'fadeIn' })].filter(Boolean), 'mf-gallery');
}

/* -------------------------------------------------------- P15 site footer */
export function siteFooter(d) {
  const cols = d.columns.map((c, i) =>
    container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(0), ...anim('container', 'fadeIn', i * 80) }, [
      heading(c.title, { tag: 'h2', typography: 'accent', colorId: 'primary' }),
      iconList(c.links.map((l) => ({ text: l.text, href: l.href, icon: '' })).map((x) => ({ ...x, icon: 'fas fa-minus' }))),
    ], true),
  );
  // Remove icons from footer link lists (cleaner look) – keep the widget editable.
  for (const col of cols) {
    const list = col.elements[1];
    list.settings.icon_list = list.settings.icon_list.map((it) => ({ ...it, selected_icon: { value: '', library: '' } }));
    list.settings.space_between = px(10);
    list.settings.__globals__ = { text_color: color('text'), icon_typography_typography: typo('mfsmall') };
  }
  return container(
    { content_width: 'boxed', html_tag: 'div', flex_direction: 'column', flex_gap: gap(48), padding: box(72, 40, 48, 40), padding_mobile: box(48, 16, 32, 16), background_background: 'classic', __globals__: { background_color: color('mfsurface') }, css_classes: 'mf-site-footer' },
    [
      container({ content_width: 'full', flex_direction: 'row', flex_direction_mobile: 'column', flex_justify_content: 'space-between', flex_align_items: 'flex-start', flex_gap: gap(32), padding: box(0) }, [
        container({ content_width: 'full', width: unit('%', 40), width_mobile: unit('%', 100), flex_direction: 'column', flex_gap: gap(16), padding: box(0) }, [
          heading(d.brand, { tag: 'p', typography: 'mfh2', colorId: 'primary' }),
          d.text ? text(para(d.text), { colorId: 'secondary' }) : null,
          d.newsletter ? html(`<form class="mf-form mf-form--inline" method="post" action="{{mf:admin-post}}">
  <input type="hidden" name="action" value="modafie_form">
  <input type="hidden" name="mf_form_type" value="newsletter">
  <label class="screen-reader-text" for="mf-footer-email">Email address</label>
  <input id="mf-footer-email" type="email" name="mf_email" placeholder="${esc(d.newsletter.placeholder || 'Email address')}" required autocomplete="email">
  <button type="submit">${esc(d.newsletter.button || 'Sign up')}</button>
</form>`) : null,
        ].filter(Boolean), true),
        container({ content_width: 'full', width: unit('%', 55), width_mobile: unit('%', 100), container_type: 'grid', grid_columns_grid: unit('fr', Math.min(cols.length, 4)), grid_columns_grid_tablet: unit('fr', Math.min(cols.length, 3)), grid_columns_grid_mobile: unit('fr', 2), grid_rows_grid: unit('fr', 1), grid_gaps: { column: '24', row: '32', isLinked: false, unit: 'px' }, padding: box(0) }, cols, true),
      ], true),
    ],
  );
}

export const PATTERNS = { hero, marquee, tiles, rail, split, editorial, features, text: textBlock, faq, newsletter, contact, video: videoBlock, gallery };
