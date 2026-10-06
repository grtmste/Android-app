# Modafie design system

Style direction: athletic e-commerce editorial, using the layout and interaction *patterns* popularised by
gymshark.com. Nothing is copied from Gymshark: no logo, imagery, copy, icons, proprietary fonts or brand
name. Every visual asset is original or comes from modafie.io.

> **Source note.** This session's network policy blocked live access to gymshark.com (and modafie.io),
> so I couldn't take screenshots or inspect the DOM here. The patterns below are written from
> documented, publicly observable conventions of that site (the generic e-commerce UX vocabulary: promo bar,
> sticky header, mega menu, product rails, etc.) and are expressed purely as tokens and layout rules.
> `tools/scraper/crawl.mjs` reads modafie's real brand colours and fonts (`site.brand`, `site.fonts` in
> `scrape/content.json`), and `tools/demo/build-demo.mjs` writes the detected accent into the Elementor Kit
> automatically. Re-run both once the hosts are reachable.

All tokens below exist in three synchronised places:

| Layer | File | Editable by |
|---|---|---|
| CSS custom properties | `theme/modafie/assets/css/tokens.css` | developer |
| Block editor / `theme.json` palette, font sizes, spacing | `theme/modafie/theme.json` | Site Editor → Styles |
| **Elementor Kit** (Global Colors, Global Fonts, buttons, container width, breakpoints) | `theme/modafie/demo/kit.json` → imported into the active kit | **Elementor → Site Settings** (primary) |

The theme CSS reads Elementor's global variables (`--e-global-color-primary`, …) first and falls back to
its own tokens, so a change in **Site Settings → Global Colors / Global Fonts** updates the header, footer,
buttons and animations site-wide.

---

## 1. Typography

| Role | Family (Google Fonts, OFL, self-hosted in `assets/fonts/`) | Weight | Transform |
|---|---|---|---|
| Display / headings | **Barlow Condensed** | 700, 800 | UPPERCASE, tracking −0.01em |
| Body / UI | **Inter** (variable) | 400–700 | none |
| Eyebrow / labels / buttons | Inter | 700 | UPPERCASE, tracking +0.08–0.12em |

These fonts are condensed, heavy and set in capitals for headlines, with a neutral grotesque for body copy.
That matches the "sport editorial" feel without using a proprietary typeface. They are registered with Elementor as a custom
font group (`Modafie`), so Elementor does **not** call Google's CDN. They are preloaded and use `font-display: swap`.

### Type scale (desktop → mobile, `clamp()` fluid between 390 px and 1440 px)

| Token | Elementor Global Font | Size | Line height | Notes |
|---|---|---|---|---|
| `--mf-fs-display` | *Display* (custom) | 120 → 56 px | 0.88 | hero only |
| `--mf-fs-h1` | **Primary** | 80 → 44 px | 0.92 | page titles |
| `--mf-fs-h2` | *Heading 2* (custom) | 56 → 34 px | 0.95 | section titles |
| `--mf-fs-h3` | **Secondary** | 32 → 24 px | 1.0 | card/split titles |
| `--mf-fs-h4` | *Heading 4* (custom) | 22 → 18 px | 1.1 | |
| `--mf-fs-body` | **Text** | 16 px | 1.6 | max 68ch measure |
| `--mf-fs-small` | *Small* (custom) | 13 px | 1.5 | meta, captions |
| `--mf-fs-eyebrow` | *Eyebrow* (custom) | 12 px | 1.2 | 700, +0.12em, caps |
| `--mf-fs-button` | **Accent** | 14 px | 1 | 700, +0.06em, caps |

## 2. Colour

Mostly monochrome, with a single accent taken from modafie's brand.

| Token | Hex | Elementor Global Color | Use |
|---|---|---|---|
| `--mf-black` | `#0B0B0B` | **Primary** | text, primary buttons, announcement bar |
| `--mf-grey-700` | `#4A4A4A` | **Secondary** | secondary text |
| `--mf-ink` | `#141414` | **Text** | body copy |
| `--mf-accent` | `#3B5BFF` *(placeholder; replaced by `site.brand.accent` from the scrape)* | **Accent** | links on hover, button fill-slide, focus ring, badges |
| `--mf-white` | `#FFFFFF` | White | backgrounds, inverted text |
| `--mf-grey-50` | `#F6F6F6` | Surface | card/image backgrounds, footer |
| `--mf-grey-200` | `#E3E3E3` | Line | dividers, input borders |
| `--mf-grey-500` | `#8C8C8C` | Muted | meta text, placeholders |
| `--mf-grey-900` | `#1C1C1C` | Dark surface | dark sections |
| `--mf-success` / `--mf-error` | `#1F8A4C` / `#D92D20` | – | form states |

Contrast: body `#141414` on white is 18.9:1, and grey-700 on white is 8.9:1. Accent buttons use white text only when
the accent's contrast is ≥ 4.5:1. The build script checks this and switches to black text otherwise.

## 3. Spacing, grid, breakpoints

* **Spacing scale (4 px base):** `4, 8, 12, 16, 24, 32, 48, 64, 96, 128` → `--mf-space-1 … --mf-space-10`.
* **Section rhythm:** padding-block 96 px desktop / 72 px tablet / 56 px mobile. Full-bleed media sections have 0 padding.
* **Container:** max 1440 px content (Elementor *Content Width* 1440). Side gutters 40 / 24 / 16 px.
* **Grid:** 12 columns, gap 16 px (cards 8 px on mobile). Card rails show 4 / 2.4 / 1.3 items (desktop / tablet / mobile),
  so the partial next card signals "swipe".
* **Breakpoints** (Elementor defaults kept for editor compatibility): mobile ≤ 767, tablet ≤ 1024, desktop ≥ 1025,
  wide ≥ 1440.

## 4. Components

### Buttons (`elementor-button` + theme CSS; set in Kit → Buttons)
* Pill: `border-radius: 999px`, height 52 px (44 on mobile), padding 0 32 px, Inter 700 14 px caps.
* **Primary:** black background, white text. On hover, an accent fill slides in from left (`::before` scaleX), 400 ms expo-out.
* **Inverted** (`mf-btn-light` class or *white* style on dark media): white background, black text. Hover fills black.
* **Outline** (`mf-btn-outline`): 2 px current-colour border, transparent background. Hover fills.
* **Text link** (`mf-link`): caps, underline that draws in from left on hover.
* Focus: 3 px accent outline with 3 px offset (never removed).

### Cards
* Product/feature card: image in a 4:5 ratio on `grey-50`, 0 radius. Title in Inter 600 15 px, meta in grey-500 13 px, 12 px gap.
  Hover zooms the image to 1.06 over 800 ms (`mf-zoom`), and a second image cross-fades in if present.
* Category tile: full image (3:4 desktop, 4:5 mobile) with a bottom-left Barlow Condensed 800 caps label and a pill button.
  A gradient scrim (`rgba(0,0,0,.45)` → transparent) keeps text legible.

### Forms
Inputs are 52 px tall, have a 1 px grey-200 border, 0 radius, and a black border on focus. The newsletter form puts the input and button in a single row, stacking on mobile.

## 5. Layout patterns

| # | Pattern | Description | Elementor build |
|---|---|---|---|
| P1 | **Announcement bar** | 36 px black strip, white 12 px caps text, auto-scrolling marquee or rotating messages | Customizer text, rendered by theme header; or `Modafie Marquee` widget |
| P2 | **Sticky minimal header** | white, 64 px (56 mobile). Logo left, primary nav centre, utility icons right. Hides on scroll down, reappears on scroll up, shrinks after 80 px | theme `header.php` (or any Elementor template chosen in Customizer) |
| P3 | **Mega menu** | full-width white panel under header. Columns of links (child items) plus up to 2 featured image tiles | WP menu: add CSS class `mf-mega` to a top-level item, with image via item description |
| P4 | **Full-bleed hero** | 100svh (min 560 px). Background image or muted autoplay video, bottom-left headline in display size, eyebrow, 1–2 pill CTAs. Slow zoom + line-mask reveal | Container (bg image/video) › Heading (`mf-reveal`) › Text › Buttons. Container class `mf-hero` |
| P5 | **Marquee / ticker strip** | infinite horizontal text loop, separator glyphs | `Modafie Marquee` widget, or class `mf-marquee` on any Heading |
| P6 | **Horizontal card carousel** | heading + "View all" link row, then a draggable, scroll-snapping rail of cards | Container class `mf-carousel` with child card containers (Image + Heading + Text) |
| P7 | **Category tiles** | 2–4 tall image tiles with label + CTA | Container (grid) › containers with bg image, class `mf-tile` |
| P8 | **Split image / text** | 50/50 image and copy, alternating sides. Image parallax | Container (row) › Image (`mf-parallax`) + Container (Heading, Text, Button) |
| P9 | **Editorial full-bleed image** | 80–100vh image, large overlaid statement, parallax | Container bg image class `mf-parallax-bg` › Heading |
| P10 | **Feature/value row** | 3–4 icon boxes, centred | Icon Box widgets (or Image Box for raster icons) |
| P11 | **Statement / quote** | one oversized sentence, centred, lots of air | Heading (h2, display) or Testimonial |
| P12 | **Editorial grid** | journal/article cards, 3-up | Container grid › Image + Heading + Text |
| P13 | **FAQ** | accordion | Nested Accordion (free) |
| P14 | **Newsletter block** | dark or grey band, headline + inline email form | Heading + `Modafie Form` widget (newsletter preset) |
| P15 | **Contact** | split: details (Icon List) + form | Icon List + `Modafie Form` widget (contact preset) |
| P16 | **Multi-column footer** | grey-50, 4 link columns + newsletter, bottom bar with © and socials | Elementor template "Modafie Footer" (default), falling back to registered menus/widget areas |

## 6. Motion

* Easing: `--mf-ease: cubic-bezier(.16,1,.3,1)` (expo-out). Durations 200 (UI), 400 (buttons), 800 (reveals), 1200 (hero).
* Entrance: Elementor *Entrance Animation* per widget (`fadeInUp` for text, `fadeIn` for images, `zoomIn` for tiles),
  staggered in 100 ms steps (`_animation_delay` 0/100/200/300). These stay editable in each widget's **Advanced → Motion Effects**.
* Theme classes (Advanced → CSS Classes): `mf-reveal`, `mf-hero`, `mf-parallax`, `mf-parallax-bg`, `mf-marquee`, `mf-zoom`,
  `mf-carousel`, `mf-tile`, `mf-btn-*`, `mf-link`. They are documented in the README.
* `prefers-reduced-motion: reduce` disables parallax, marquee motion, zoom and reveals, so content shows immediately.
* CLS-safe: reveals use `clip-path`/`transform` only, all media has width/height or aspect-ratio, and fonts use metric-compatible fallbacks.

## 7. Page and section mapping

### 7.1 Automatic mapping rules (`tools/demo/build-demo.mjs`)

Each scraped section (see `content.json → pages[].sections[]`) is classified from its `hints` and blocks:

| Condition (first match wins) | Pattern |
|---|---|
| section index 0 **and** (background image/video **or** cover image) **and** has heading | P4 hero |
| has a `form` with an email field and ≤ 2 other fields | P14 newsletter |
| has a `form` with more fields | P15 contact |
| ≥ 3 cards (image followed by heading) | P6 carousel (≥ 5 cards) or P7 tiles (3–4 cards with links) / P12 grid (cards with paragraphs) |
| background image and ≤ 25 words | P9 editorial full-bleed |
| exactly 1 image + heading/paragraphs | P8 split (alternating side) |
| ≥ 3 SVG/icons each followed by heading | P10 feature row |
| quote block, or single heading ≤ 20 words with no media | P11 statement |
| question-like headings (`?`) followed by paragraphs, ≥ 3 | P13 FAQ |
| video/embed only | P4-style video band (Video widget) |
| anything else | generic text section (Heading/Text Editor/Button/Image in source order) |

Every text block, link and media file in a section ends up in a widget. Nothing is dropped. Unknown block types fall back
to Text Editor so the copy remains editable. The verification script (`tools/test/verify.mjs`) compares the rendered
WordPress pages against `content.json` and reports any missing text or media.

### 7.2 Mapping for the current demo build

The seed in `scrape/content.json` is a **placeholder** (`"source": "placeholder"`) because modafie.io couldn't be reached
from the build environment. It has the same structure and runs through the same rules:

| Page | Sections → patterns |
|---|---|
| Home `/` | Hero (P4) · Marquee (P5) · New-in carousel (P6) · Category tiles (P7) · Split story (P8) · Editorial image (P9) · Values row (P10) · Statement (P11) · Newsletter (P14) |
| About `/about` | Page hero (P4, 70vh) · Statement (P11) · Split ×2 alternating (P8) · Values row (P10) · Editorial image (P9) |
| Collections `/collections` | Page hero (P4) · Category tiles (P7) · Carousel (P6) · Newsletter (P14) |
| Journal `/journal` | Page title band · Editorial grid (P12) |
| FAQ `/faq` | Page title band · FAQ (P13) · Contact CTA (P11) |
| Contact `/contact` | Page title band · Contact split (P15) |
| Privacy `/privacy-policy` | generic text |
| Header / footer (all pages) | P1 + P2 + P3 / P16 |
