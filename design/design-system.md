# Modafie design system

This is the visual language for the `modafie` WordPress theme. It is inspired by the **layout, typography, spacing and motion patterns** of gymshark.com. Nothing is copied from it: no logo, imagery, copy, icons, proprietary fonts or brand name. All brand assets (logo, photography, copy, accent colour) come from modafie.io.

> **Source note.** The build environment's network policy blocked `www.gymshark.com` and `www.modafie.io`, so I couldn't run the planned live DOM and screenshot analysis. The patterns below come from Gymshark's well-documented public storefront conventions (announcement bar, sticky minimal header, mega menu, full-bleed hero, horizontal product rails, category tiles, editorial splits, newsletter, multi-column footer). The **accent colour is a placeholder** (`#FF5A1F`). `tools/build-demo.mjs` replaces it automatically with the accent that `tools/scrape.mjs` detects in `scrape/brand.json` once the crawl can run. Every token here is also an Elementor Global, so you can change it in **Site Settings** without touching code.

---

## 1. Principles

1. **Monochrome first.** Black, white and greys carry 95% of the UI. Colour comes from photography and one accent.
2. **Type as image.** Display headings are huge, heavy, condensed and uppercase. They work as graphic elements over imagery.
3. **Edge-to-edge imagery.** Heroes, category tiles and editorial blocks bleed to the viewport edge. UI chrome stays thin.
4. **Rails, not grids, for discovery.** Products and features scroll horizontally, so the next card always peeks in.
5. **Quiet motion.** Short, eased and purposeful: reveal on scroll, slow zoom, hover fills. It never blocks reading, and all of it is disabled under `prefers-reduced-motion`.

---

## 2. Colour

| Token | Elementor Global | Hex | Usage |
|---|---|---|---|
| `--mf-color-primary` | **Primary** (system) | `#0B0B0B` | Headings, primary buttons, header, icons |
| `--mf-color-secondary` | **Secondary** (system) | `#6B6B6B` | Meta text, captions, secondary labels (5.3:1 on white, 4.9:1 on Surface: passes AA) |
| `--mf-color-text` | **Text** (system) | `#1A1A1A` | Body copy |
| `--mf-color-accent` | **Accent** (system) | `#FF5A1F` *(placeholder → modafie brand)* | Sale/new badges, focus rings, links on hover, marquee highlight, underline fills |
| `--mf-color-white` | White (custom) | `#FFFFFF` | Page background, text on imagery |
| `--mf-color-surface` | Surface (custom) | `#F5F5F5` | Card and media backgrounds, footer, announcement bar (light) |
| `--mf-color-border` | Border (custom) | `#E3E3E3` | Dividers, input borders |
| `--mf-color-muted` | Muted Dark (custom) | `#2B2B2B` | Button hover fill, dark surfaces |
| `--mf-color-overlay` | Overlay (custom) | `#000000` @ 35% | Hero and tile overlays for text contrast |

Rules: only one accent. Text on imagery is always white over an overlay of at least 25%. Focus rings are 2px accent with a 2px offset.

---

## 3. Typography

Fonts are self-hosted in the theme from `@fontsource` (SIL Open Font License), so there are no Google requests and no GDPR or CLS surprises.

| Role | Elementor Global | Family | Weight | Size (desktop → mobile) | Line height | Case / tracking |
|---|---|---|---|---|---|---|
| Display XL (hero) | Display (custom) | **Barlow Condensed** | 800 | `clamp(56px, 9vw, 136px)` | 0.9 | UPPERCASE, -0.01em |
| H1 | **Primary** (system) | Barlow Condensed | 800 | `clamp(44px, 6vw, 88px)` | 0.95 | UPPERCASE |
| H2 | Heading 2 (custom) | Barlow Condensed | 700 | `clamp(32px, 4vw, 56px)` | 1.0 | UPPERCASE |
| H3 / card titles | **Secondary** (system) | Barlow Condensed | 700 | 28 → 22px | 1.05 | UPPERCASE |
| Body | **Text** (system) | **Inter** | 400 | 16 → 15px | 1.6 | Normal |
| Lead | Lead (custom) | Inter | 400 | 20 → 17px | 1.5 | Normal |
| Eyebrow / label | **Accent** (system) | Inter | 600 | 12px | 1.2 | UPPERCASE, +0.08em |
| Button | Button (custom) | Inter | 700 | 13px | 1 | UPPERCASE, +0.06em |
| Small / legal | Small (custom) | Inter | 400 | 13px | 1.5 | Normal |

Fallback stacks: `"Barlow Condensed", "Arial Narrow", Impact, sans-serif` and `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Alternative display face: **Archivo Black** (a single heavy weight; swap it in under Site Settings → Global Fonts).

---

## 4. Spacing, grid and breakpoints

**Spacing scale (4px base):** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128` → `--mf-space-1 … --mf-space-10`.

| | Mobile (≤767) | Tablet (768–1024) | Desktop (≥1025) |
|---|---|---|---|
| Page gutter | 16px | 24px | 40px |
| Section padding (block) | 48px | 64px | 96px |
| Grid columns | 4 | 8 | 12 |
| Grid gap | 12px | 16px | 24px |
| Card rail visible cards | 1.6 | 2.6 | 4.3 |

- **Containers:** max width 1440px (`container_width` in the Kit); text measure 720px; wide content 1200px.
- **Breakpoints:** these match Elementor's defaults (mobile 767, tablet 1024) plus a 1440px design width. Test widths are 390 / 768 / 1440.

---

## 5. Components

### Buttons
| Variant | Fill | Text | Border | Hover |
|---|---|---|---|---|
| Primary (Kit default) | Primary `#0B0B0B` | White | none | Fill slides to Muted `#2B2B2B` (`.mf-btn-fill`) |
| Light (on imagery) | White | Primary | none | Fill slides to Primary, text turns white |
| Outline | transparent | Primary | 1.5px Primary | Fill slides in from the left |
| Text link | none | Primary | underline 1px | Underline thickens to 2px in Accent |

Geometry: height 48px (padding 16/32), radius **999px (pill)**, Button global font. The minimum touch target is 44×44.

### Cards
- **Product/feature card:** 4:5 image on a Surface background, then title (H3 global at 18px), meta (Secondary, 13px) and optional price/CTA. No border or shadow. On hover the image zooms 1.05 (`.mf-hover-zoom`).
- **Category tile:** full-bleed 3:4 image, bottom-left uppercase label (H3 white) and a pill button. Overlay gradient from 0 to 45% black at the bottom.
- **Editorial card:** 16:9 image, eyebrow, H3 and two-line excerpt.

### Form fields
Height 48px, 1px Border, radius 4px, Inter 15px. Focus shows a 2px Primary border plus the accent ring. Labels are 12px uppercase eyebrow.

---

## 6. Layout patterns

| ID | Pattern | Structure | Elementor build | Motion |
|---|---|---|---|---|
| P1 | **Announcement bar** | 36px strip with short centered messages, rotating or marquee | Theme (Customizer → *Modafie Header*) or any container with `.mf-marquee` | Marquee or fade rotate |
| P2 | **Sticky minimal header** | Logo left, primary nav centred, utility icons right; 64px tall, shrinks to 56 | Theme `header.php` with WP menus (Primary/Utility), overridable by an Elementor template | Hides on scroll down, shows on scroll up |
| P3 | **Mega menu** | Full-width panel of 3–5 link columns plus a promo image | Primary-menu items with the CSS class `mf-mega` (Appearance → Menus) | Fade/slide 200ms |
| P4 | **Full-bleed hero** | 88–100vh, image or video background, overlay, headline bottom-left, 1–2 pill CTAs | Container (`.mf-hero .mf-hero-zoom`) → Heading (`.mf-reveal`) + Text + Buttons | Line-mask text reveal, slow 12s zoom |
| P5 | **Marquee/ticker** | One-line uppercase display text looping | Heading widget with `.mf-marquee` | Infinite marquee, pauses on hover |
| P6 | **Horizontal rail (carousel)** | Section title and a "View all" link, then a horizontally scrolling row of cards | Container `.mf-carousel` (flex row, nowrap) of card containers; or the Image Carousel widget for galleries | Drag with momentum, snap; staggered fadeInUp |
| P7 | **Category tiles** | 2–4 tall image tiles with label and CTA | Container grid (2/4 cols) of tile containers with background image + overlay | zoomIn entrance, hover zoom |
| P8 | **Split image/text** | 50/50, image bleeds to edge, text column with eyebrow, H2, copy, CTA; alternates sides | Container row: Image (`.mf-parallax`) + text container | fadeInUp on the text, parallax on the image |
| P9 | **Editorial imagery** | Full-width image (21:9) with an overlaid or below-image caption | Container with background image `.mf-parallax`, min-height 70vh | Parallax |
| P10 | **Feature/USP strip** | 3–4 icon and short-text columns | Icon List (inline) or 4 × (Icon + Heading + Text) | fadeIn with stagger |
| P11 | **Text block** | Centered eyebrow, H2 and up to 720px of copy | Container (boxed 720) → Heading + Text Editor | fadeInUp |
| P12 | **FAQ** | Accordion list | Nested Accordion widget (free) | Native |
| P13 | **Newsletter block** | Dark band, H2, one-line copy, inline email field and button | Container → Heading + Text + HTML widget (`.mf-form` posts to theme handler) | fadeInUp |
| P14 | **Contact form** | Two-column: details on the left, form on the right | Container row → Text/Icon List + HTML widget form | fadeInUp |
| P15 | **Multi-column footer** | Newsletter row, 4 link columns, social, legal bar | Elementor template "Site Footer" (editable) or theme footer widgets | none |
| P16 | **Video block** | Embedded YouTube/Vimeo or hosted video, 16:9 | Video widget (lazy, privacy mode) | fadeIn |

---

## 7. Motion

| Token | Value |
|---|---|
| `--mf-ease-out` | `cubic-bezier(.16, 1, .3, 1)` (expo-out) |
| `--mf-ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` |
| Durations | 150ms (hover), 300ms (menus), 600–900ms (reveals), 12s (hero zoom) |
| Stagger | 100ms per item (Elementor "Animation Delay": 0/100/200/300…) |

Elementor Entrance Animations are set in widget settings (Advanced → Motion Effects): headings `fadeInUp`, images `fadeIn`/`zoomIn`, cards `fadeInUp` with staggered delays, and buttons `fadeInUp` with +200ms.

Theme classes (Advanced → CSS Classes): `mf-reveal`, `mf-hero-zoom`, `mf-parallax`, `mf-marquee`, `mf-hover-zoom`, `mf-btn-fill`, `mf-btn-slide`, `mf-carousel`, `mf-fade-up`, `mf-stagger`. They're documented in the README.

---

## 8. Page and section mapping

### 8.1 Automatic mapping rules (`tools/build-demo.mjs`)
Each scraped section in `scrape/content.json` is classified in this order:

1. `role = header` → menus (Primary/Utility) + logo; announcement text if a short strip sits above the nav → **P1/P2/P3**
2. `role = footer` → footer menus, social links, legal text → **P15**
3. First content section with a large background/image (≥ 60% viewport) or a video + H1/H2 → **P4 Hero**
4. Form with a single email field → **P13 Newsletter**; any other form → **P14 Contact**
5. ≥ 5 images of similar size, each with a heading/caption → **P6 Rail**; 2–4 images with labels/links → **P7 Category tiles**
6. YouTube/Vimeo embed or a `<video>` → **P16 Video**
7. Repeating heading + paragraph pairs (≥ 3) without images → **P12 FAQ** if headings end in "?", otherwise **P10 Features**
8. One image + heading + text → **P8 Split** (sides alternate)
9. Full-width image with little text → **P9 Editorial**
10. Headings/paragraphs only → **P11 Text block**
11. Very short uppercase single line → **P5 Marquee**

The generated per-page result is written to `design/page-mapping.md`. Review it there and override it in `tools/mapping-overrides.json` if needed.

### 8.2 Current mapping (placeholder content, used until the crawl runs)

| Page | Sections → patterns |
|---|---|
| Home | Hero (P4) → Marquee (P5) → Category tiles (P7) → New-in rail (P6) → Split (P8) → Editorial (P9) → Features (P10) → Newsletter (P13) |
| About | Hero (P4, 70vh) → Text block (P11) → Split ×2 (P8) → Editorial (P9) → Features (P10) |
| Collections | Hero (P4, 60vh) → Category tiles (P7) → Rail (P6) → Rail (P6) → Newsletter (P13) |
| FAQ | Text hero (P11) → FAQ (P12) → Contact CTA (P11) |
| Contact | Text hero (P11) → Contact (P14) |
| Global | Announcement (P1), Header (P2/P3), Footer (P15) |
