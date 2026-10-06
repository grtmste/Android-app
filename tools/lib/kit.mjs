/**
 * Elementor Kit settings = design-system tokens (design/design-system.md §2–§5).
 * Everything here is editable afterwards in Elementor → Site Settings.
 */
const px = (size) => ({ unit: 'px', size, sizes: [] });
const em = (size) => ({ unit: 'em', size, sizes: [] });
const box = (t, r, b, l) => ({ unit: 'px', top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: t === r && r === b && b === l });

function type(id, title, family, weight, size, { tablet, mobile, lh, ls, transform = 'none' } = {}) {
  const t = {
    _id: id,
    title,
    typography_typography: 'custom',
    typography_font_family: family,
    typography_font_weight: String(weight),
    typography_font_size: px(size),
    typography_text_transform: transform,
  };
  if (tablet) t.typography_font_size_tablet = px(tablet);
  if (mobile) t.typography_font_size_mobile = px(mobile);
  if (lh) t.typography_line_height = em(lh);
  if (ls !== undefined) t.typography_letter_spacing = em(ls);
  return t;
}

export function buildKit({ accent = '#FF5A1F' } = {}) {
  const D = 'Barlow Condensed';
  const B = 'Inter';
  const g = (id) => `globals/colors?id=${id}`;
  const t = (id) => `globals/typography?id=${id}`;
  return {
    system_colors: [
      { _id: 'primary', title: 'Primary', color: '#0B0B0B' },
      { _id: 'secondary', title: 'Secondary', color: '#6B6B6B' },
      { _id: 'text', title: 'Text', color: '#1A1A1A' },
      { _id: 'accent', title: 'Accent', color: accent.toUpperCase() },
    ],
    custom_colors: [
      { _id: 'mfwhite', title: 'White', color: '#FFFFFF' },
      { _id: 'mfsurface', title: 'Surface', color: '#F5F5F5' },
      { _id: 'mfborder', title: 'Border', color: '#E3E3E3' },
      { _id: 'mfmuted', title: 'Muted Dark', color: '#2B2B2B' },
    ],
    system_typography: [
      type('primary', 'Primary (H1)', D, 800, 88, { tablet: 64, mobile: 44, lh: 0.95, ls: -0.005, transform: 'uppercase' }),
      type('secondary', 'Secondary (H3 / tiles)', D, 700, 28, { tablet: 26, mobile: 22, lh: 1.05, transform: 'uppercase' }),
      type('text', 'Text (body)', B, 400, 16, { mobile: 15, lh: 1.6 }),
      type('accent', 'Accent (eyebrow / label)', B, 600, 12, { lh: 1.2, ls: 0.08, transform: 'uppercase' }),
    ],
    custom_typography: [
      type('mfdisplay', 'Display XL (hero)', D, 800, 136, { tablet: 88, mobile: 56, lh: 0.9, ls: -0.01, transform: 'uppercase' }),
      type('mfh2', 'Heading 2', D, 700, 56, { tablet: 44, mobile: 32, lh: 1, transform: 'uppercase' }),
      type('mflead', 'Lead', B, 400, 20, { tablet: 18, mobile: 17, lh: 1.5 }),
      type('mfbutton', 'Button', B, 700, 13, { lh: 1, ls: 0.06, transform: 'uppercase' }),
      type('mfcard', 'Card title', B, 600, 15, { lh: 1.35 }),
      type('mfsmall', 'Small', B, 400, 13, { lh: 1.5 }),
    ],
    default_generic_fonts: 'Sans-serif',

    // Theme Style → Typography
    body_typography_typography: 'custom',
    h1_typography_typography: 'custom',
    h2_typography_typography: 'custom',
    h3_typography_typography: 'custom',
    h4_typography_typography: 'custom',
    __globals__: {
      body_color: g('text'),
      body_typography_typography: t('text'),
      link_normal_color: g('primary'),
      link_hover_color: g('accent'),
      h1_color: g('primary'),
      h1_typography_typography: t('primary'),
      h2_color: g('primary'),
      h2_typography_typography: t('mfh2'),
      h3_color: g('primary'),
      h3_typography_typography: t('secondary'),
      h4_color: g('primary'),
      h4_typography_typography: t('secondary'),
      button_typography_typography: t('mfbutton'),
      button_text_color: g('mfwhite'),
      button_background_color: g('primary'),
      button_hover_text_color: g('mfwhite'),
      button_hover_background_color: g('mfmuted'),
      form_label_color: g('primary'),
      form_label_typography_typography: t('accent'),
      form_field_text_color: g('text'),
      form_field_typography_typography: t('text'),
      form_field_background_color: g('mfwhite'),
      form_field_border_color: g('mfborder'),
      body_background_color: g('mfwhite'),
    },
    // Theme Style → Buttons
    button_typography_typography: 'custom',
    button_background_background: 'classic',
    button_hover_background_background: 'classic',
    button_border_radius: box(999, 999, 999, 999),
    button_padding: box(16, 32, 16, 32),
    // Theme Style → Form fields
    form_field_border_border: 'solid',
    form_field_border_width: box(1, 1, 1, 1),
    form_field_border_radius: box(4, 4, 4, 4),
    form_field_padding: box(12, 16, 12, 16),
    // Background
    body_background_background: 'classic',
    // Layout
    container_width: px(1440),
    container_padding: { unit: 'px', top: '0', right: '40', bottom: '0', left: '40', isLinked: false },
    container_padding_tablet: { unit: 'px', top: '0', right: '24', bottom: '0', left: '24', isLinked: false },
    container_padding_mobile: { unit: 'px', top: '0', right: '16', bottom: '0', left: '16', isLinked: false },
    space_between_widgets: { column: '20', row: '20', isLinked: true, unit: 'px', size: 20 },
    page_title_selector: 'h1.entry-title, .mf-page-title',
    // Lightbox: monochrome
    lightbox_color: 'rgba(11,11,11,0.95)',
  };
}
