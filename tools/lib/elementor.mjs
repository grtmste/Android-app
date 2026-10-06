/**
 * Tiny factory for Elementor (free) JSON: containers + core widgets.
 * Output matches what Elementor 3.16+ / 4.x saves in `_elementor_data`.
 */
import { createHash } from 'node:crypto';

let seed = 'modafie';
let counter = 0;
/** Deterministic element IDs per document, so re-imports keep stable IDs. */
export function resetIds(docKey) {
  seed = docKey;
  counter = 0;
}
export function eid() {
  counter++;
  return createHash('md5').update(`${seed}:${counter}`).digest('hex').slice(0, 7);
}

/* ------------------------------------------------------------------ helpers */
export const px = (size) => ({ unit: 'px', size, sizes: [] });
export const unit = (u, size) => ({ unit: u, size, sizes: [] });
export const box = (t, r = t, b = t, l = r, u = 'px') => ({ unit: u, top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: t === r && r === b && b === l });
export const gap = (size, u = 'px') => ({ column: String(size), row: String(size), isLinked: true, unit: u, size });
export const media = (key, alt = '') => (key ? { url: `{{mf:media-url:${key}}}`, id: `{{mf:media-id:${key}}}`, size: '', alt, source: 'library' } : { url: '', id: '', size: '' });
export const link = (url, external = false) => ({ url: url || '', is_external: external ? 'on' : '', nofollow: '', custom_attributes: '' });
export const color = (id) => `globals/colors?id=${id}`;
export const typo = (id) => `globals/typography?id=${id}`;

/** Elementor entrance animation settings (container uses `animation`, widgets `_animation`). */
export function anim(kind, name, delay = 0) {
  if (!name) return {};
  return kind === 'container'
    ? { animation: name, animation_delay: delay, animation_duration: '' }
    : { _animation: name, _animation_delay: delay, _animation_duration: '' };
}

/* --------------------------------------------------------------- elements */
export function container(settings = {}, elements = [], isInner = false) {
  return {
    id: eid(),
    elType: 'container',
    isInner,
    settings: { content_width: 'boxed', ...settings },
    elements,
  };
}

export function widget(widgetType, settings = {}) {
  return { id: eid(), elType: 'widget', widgetType, isInner: false, settings, elements: [] };
}

export function heading(title, { tag = 'h2', typography = 'mfh2', colorId = 'primary', align, cls = '', animation, delay = 0, link: href, size } = {}) {
  const s = {
    title,
    header_size: tag,
    __globals__: { typography_typography: typo(typography), title_color: color(colorId) },
    ...anim('widget', animation, delay),
  };
  if (align) Object.assign(s, typeof align === 'object' ? align : { align });
  if (cls) s._css_classes = cls;
  if (href) s.link = link(href);
  if (size) s.size = size;
  return widget('heading', s);
}

export function text(html, { typography = 'text', colorId = 'text', align, cls = '', animation, delay = 0, maxWidth } = {}) {
  const s = {
    editor: html,
    __globals__: { typography_typography: typo(typography), text_color: color(colorId) },
    ...anim('widget', animation, delay),
  };
  if (align) Object.assign(s, typeof align === 'object' ? align : { align });
  if (cls) s._css_classes = cls;
  if (maxWidth) { s._element_width = 'initial'; s._element_custom_width = px(maxWidth); }
  return widget('text-editor', s);
}

export function button(label, href, { variant = 'primary', align, cls = '', animation, delay = 0, icon = false, size = 'md' } = {}) {
  const variants = {
    primary: { __globals__: { button_text_color: color('mfwhite'), background_color: color('primary'), hover_color: color('mfwhite'), button_background_hover_color: color('mfmuted') } },
    light: { __globals__: { button_text_color: color('primary'), background_color: color('mfwhite'), hover_color: color('mfwhite'), button_background_hover_color: color('primary') } },
    outline: {
      border_border: 'solid', border_width: box(1.5), __globals__: { button_text_color: color('primary'), border_color: color('primary'), hover_color: color('mfwhite'), button_background_hover_color: color('primary'), button_hover_border_color: color('primary') },
      background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    },
    'outline-light': {
      border_border: 'solid', border_width: box(1.5), __globals__: { button_text_color: color('mfwhite'), border_color: color('mfwhite'), hover_color: color('primary'), button_background_hover_color: color('mfwhite'), button_hover_border_color: color('mfwhite') },
      background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    },
  };
  const v = variants[variant] || variants.primary;
  const s = {
    text: label,
    link: link(href, /^https?:\/\//.test(href || '') && !String(href).includes('{{mf:')),
    size,
    background_background: 'classic',
    button_background_hover_background: 'classic',
    border_radius: box(999),
    text_padding: box(16, 32, 16, 32),
    ...v,
    __globals__: { typography_typography: typo('mfbutton'), ...v.__globals__ },
    _css_classes: ['mf-btn-fill', variant === 'light' ? 'mf-btn-fill--light' : '', cls].filter(Boolean).join(' '),
    ...anim('widget', animation, delay),
  };
  // Hover fill is drawn by .mf-btn-fill (theme CSS); keep Elementor's hover bg in sync for editor preview.
  if (icon) Object.assign(s, { selected_icon: { value: 'fas fa-arrow-right', library: 'fa-solid' }, icon_align: 'row-reverse', icon_indent: px(8) });
  if (align) Object.assign(s, typeof align === 'object' ? align : { align });
  return widget('button', s);
}

export function image(key, { alt = '', size = 'large', href, cls = '', animation, delay = 0, ratio, caption } = {}) {
  const s = {
    image: media(key, alt),
    image_size: size,
    ...anim('widget', animation, delay),
    _css_classes: [cls, ratio ? `mf-ratio-${ratio}` : ''].filter(Boolean).join(' '),
  };
  if (href) Object.assign(s, { link_to: 'custom', link: link(href) });
  if (caption) Object.assign(s, { caption_source: 'custom', caption });
  return widget('image', s);
}

export function video({ youtube, vimeo, hosted, poster, autoplay = false, animation, delay = 0 } = {}) {
  const s = { ...anim('widget', animation, delay), lazy_load: 'yes', yt_privacy: 'yes', aspect_ratio: '169' };
  if (youtube) Object.assign(s, { video_type: 'youtube', youtube_url: youtube });
  else if (vimeo) Object.assign(s, { video_type: 'vimeo', vimeo_url: vimeo });
  else if (hosted) Object.assign(s, { video_type: 'hosted', hosted_url: media(hosted), controls: 'yes' });
  if (autoplay) Object.assign(s, { autoplay: 'yes', mute: 'yes', loop: 'yes' });
  if (poster) Object.assign(s, { show_image_overlay: 'yes', image_overlay: media(poster) });
  return widget('video', s);
}

export function imageCarousel(keys, { show = 4, showTablet = 2, showMobile = 1, animation, delay = 0 } = {}) {
  return widget('image-carousel', {
    carousel: keys.map((k) => ({ id: `{{mf:media-id:${k}}}`, url: `{{mf:media-url:${k}}}` })),
    thumbnail_size: 'large',
    slides_to_show: String(show),
    slides_to_show_tablet: String(showTablet),
    slides_to_show_mobile: String(showMobile),
    navigation: 'both',
    image_spacing: 'custom',
    image_spacing_custom: px(12),
    autoplay: 'no',
    infinite: 'yes',
    speed: 600,
    lazyload: 'yes',
    ...anim('widget', animation, delay),
  });
}

export function iconList(items, { inline = false, animation, delay = 0 } = {}) {
  return widget('icon-list', {
    view: inline ? 'inline' : 'traditional',
    icon_list: items.map((it) => ({
      _id: eid(),
      text: it.text,
      selected_icon: { value: it.icon || 'fas fa-check', library: 'fa-solid' },
      link: link(it.href || ''),
    })),
    space_between: px(12),
    icon_size: px(16),
    __globals__: { icon_color: color('primary'), text_color: color('text'), icon_typography_typography: typo('text') },
    ...anim('widget', animation, delay),
  });
}

export function html(markup, { cls = '', animation, delay = 0 } = {}) {
  return widget('html', { html: markup, _css_classes: cls, ...anim('widget', animation, delay) });
}

export function spacer(h) {
  return widget('spacer', { space: px(h) });
}

export function divider() {
  return widget('divider', { __globals__: { color: color('mfborder') }, weight: px(1) });
}

/** Nested Accordion (free, container-based). */
export function accordion(items, { animation, delay = 0 } = {}) {
  const el = widget('nested-accordion', {
    items: items.map((it) => ({ _id: eid(), item_title: it.q })),
    title_tag: 'h3',
    faq_schema: 'yes',
    accordion_item_title_space_between: px(0),
    accordion_item_title_distance_from_content: px(0),
    __globals__: { title_typography_typography: typo('secondary'), normal_title_color: color('primary') },
    accordion_border_normal_border: 'none',
    ...anim('widget', animation, delay),
  });
  el.elements = items.map((it) =>
    container(
      { content_width: 'full', padding: box(0, 0, 24, 0), _title: it.q },
      [text(it.a)],
      true,
    ),
  );
  return el;
}
