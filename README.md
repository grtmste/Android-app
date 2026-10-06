# Modafie: WordPress theme for free Elementor

`modafie-theme.zip` is a lightweight, Elementor-compatible WordPress theme with a Gymshark-inspired design language: monochrome, huge condensed uppercase type, full-bleed imagery, horizontal rails and quiet motion. A one-click importer recreates the whole site as **editable Elementor content**.

> ## ⚠️ Status: real modafie.io content still needs one crawl
> The build environment's network policy **blocked `www.modafie.io`, `www.gymshark.com` and `wordpress.org`**, so the bundled demo package currently contains **clearly labelled placeholder content** (instructional copy and generated images stamped "PLACEHOLDER IMAGE"). The importer page warns about this too.
>
> The pipeline that swaps in the real site is finished and tested end to end (see [Rebuilding with the real modafie.io content](#rebuilding-with-the-real-modafieio-content)). From a machine that can reach modafie.io:
>
> ```bash
> cd tools && npm install && node scrape.mjs && node build-demo.mjs && bash package-theme.sh
> ```
>
> This rewrites `scrape/`, `theme/modafie/demo/`, `design/page-mapping.md` and `modafie-theme.zip`. The brand accent colour is detected from the site automatically.

---

## Contents

| Path | What it is |
|---|---|
| `modafie-theme.zip` | **Deliverable.** Install via Appearance → Themes → Upload |
| `theme/modafie/` | Theme source (`demo/` = bundled import package) |
| `design/design-system.md` | Design system: tokens, components, 16 layout patterns, motion, mapping rules |
| `design/page-mapping.md` | Generated: which pattern each page section uses |
| `scrape/` | Crawl output: `content.json`, `brand.json`, `media/`, `screenshots/`, `report.md` |
| `screenshots/after/` | Screenshots of the imported site at 1440 / 768 / 390, the editor, the importer, plus `e2e-results.json` and `lighthouse-mobile.json` |
| `tools/` | Crawler, demo builder, packager, Docker test site, end-to-end test |

---

## Install (one click)

1. **Appearance → Themes → Add New → Upload Theme** → `modafie-theme.zip` → Install → **Activate**.
2. A notice appears: **"Import Modafie demo content"**. Click it (or go to **Appearance → Modafie Setup**) and press the button. The importer:
   1. installs and activates the free **Elementor** plugin if it's missing (TGM-style, from WordPress.org)
   2. imports every image into the Media Library and rewrites all Elementor image URLs/IDs to the new attachments
   3. creates every page with its Elementor data, sets the homepage as the static front page, and builds the menus
   4. saves every section as a reusable template (**Templates → Saved Templates**), including the "Site Footer"
   5. applies the Elementor Kit (Global Colours, Global Fonts, button/form styles, layout) and regenerates Elementor CSS
3. Done. It typically takes about 25 seconds.

**Safe to re-run.** Media, pages, templates and menus are tracked by internal IDs, so nothing is duplicated (a second run takes about 4 seconds). Pages and templates you have edited since the last import are **kept**, unless you tick "Also reset pages and templates I have edited".

Everything is bundled in the theme (`demo/`), so no external server is needed. Requirements: WordPress 6.4+ (tested on 7.1.2), PHP 8.1+, Elementor (free; tested with 4.3.2).

From the command line (staging/agency deploys):

```bash
wp theme install modafie-theme.zip --activate
wp modafie import --user=admin          # add --reset to overwrite edited pages
```

---

## Editing the site

| What | Where |
|---|---|
| Any text, image or button on a page | **Pages → hover → Edit with Elementor**. Every heading, text, image, button, carousel, accordion and form is a standard Elementor widget. |
| Colours for the whole site | Elementor editor → ☰ → **Site Settings → Global Colors** (Primary, Secondary, Text, Accent + White, Surface, Border, Muted Dark) |
| Fonts for the whole site | **Site Settings → Global Fonts** (Primary = H1, Secondary = H3, Text, Accent = eyebrow + Display XL, Heading 2, Lead, Button, Card title, Small) |
| Button and form-field style | **Site Settings → Buttons / Form Fields** |
| Header menus | **Appearance → Menus** (locations: Primary, Utility, Mobile, Footer legal, Social) |
| Mega menu | Give a top-level Primary menu item the CSS class `mf-mega` (Menus → Screen Options → CSS Classes). Its children become columns, and grandchildren become links. A child with class `mf-mega-promo` becomes an image tile (put the image URL in its Description). |
| Announcement bar | **Appearance → Customize → Modafie Theme → Announcement bar** (one message per line, optional `Text \| https://link`, rotate/marquee/static, dark/light/accent) |
| Header behaviour | Customize → Modafie Theme → Header: hide on scroll down / show on scroll up, always sticky, or static; transparent over the homepage hero; search icon |
| Footer | **Templates → Saved Templates → "Site Footer" → Edit with Elementor**. To use the classic widget footer instead, set Customize → Modafie Theme → Footer → *Elementor footer template* to "Theme default". |
| Replace the header | Build any Elementor template and choose it in Customize → Modafie Theme → Header → *Elementor header template*. Elementor Pro Theme Builder locations are supported too, but not required. |
| Reusable sections | In the Elementor editor, click the folder icon → My Templates → insert any "Page — N. Pattern" section |

Colours and fonts are single-source. The theme's own CSS (header, footer, menus, forms) reads Elementor's `--e-global-*` variables, so changing a Global Colour or Font restyles the entire site, theme chrome included. The fonts are self-hosted (SIL OFL) and registered with Elementor as "Modafie (self-hosted)", so Elementor never loads Google Fonts.

### Forms (free Elementor has no Form widget)
Contact and newsletter forms are **HTML widgets** whose markup posts to the theme's handler. Edit the fields freely: any input named `mf_*` is included in the email, and `mf_email` is required.

```html
<form class="mf-form" method="post" action="/wp-admin/admin-post.php">
  <input type="hidden" name="action" value="modafie_form">
  <input type="hidden" name="mf_form_type" value="contact"> <!-- or "newsletter" -->
  <input type="email" name="mf_email" required>
  <textarea name="mf_message"></textarea>
  <button type="submit">Send</button>
</form>
```

Submissions are emailed to the site admin address, and newsletter sign-ups are also listed under Appearance → Modafie Setup. Spam protection is a honeypot, a minimum fill time and a per-IP rate limit. Modifiers: `mf-form--inline`, `mf-form--dark`.

---

## Animations

### 1. Elementor Entrance Animations (editable per widget)
The imported pages already use Elementor's built-in entrance animations: headings `fadeInUp`, images `fadeIn`, cards and tiles `fadeInUp` with staggered delays (0 / 100 / 200 / 300 ms), and buttons `fadeInUp` +200–350 ms. Change or remove them under **widget → Advanced → Motion Effects → Entrance Animation / Animation Delay**.

### 2. Theme animation classes
Add these under **widget/container → Advanced → CSS Classes** (space-separated, combinable):

| Class | Put it on | Effect |
|---|---|---|
| `mf-reveal` | Heading or Text Editor | Line-by-line masked text reveal when scrolled into view |
| `mf-hero-zoom` | Container with a background image (or Image widget) | Slow 9-second "settle" zoom on the image |
| `mf-parallax` | Container with a background image, or Image widget | Parallax on scroll. Add `mf-parallax--strong` for more movement. |
| `mf-marquee` | Heading / Text Editor (any widget) | Infinite ticker, pauses on hover. Speed: `mf-marquee--slow` / `mf-marquee--fast`; direction: `mf-marquee--reverse` |
| `mf-carousel` | Container (Full width, Direction: row) whose children are cards | Horizontal rail: scroll-snap, mouse drag with momentum, arrows and progress bar |
| `mf-hover-zoom` | Image widget or container with a background image | Image zooms 1.05× on hover |
| `mf-btn-fill` | Button widget | Hover fill wipes in from the left. Variants: `mf-btn-fill--light`, `mf-btn-fill--accent` |
| `mf-btn-slide` | Button widget | Label slides up and is replaced on hover |
| `mf-fade-up` | Any widget/container | Fade and rise on scroll (lighter than an Elementor animation) |
| `mf-stagger` | Container | Its children fade up one after another (100 ms steps) |
| `mf-ratio-4x5` / `-3x4` / `-16x9` / `-1x1` | Image widget | Fixed aspect-ratio crop |
| `mf-tile`, `mf-card-item` | Containers | Category-tile gradient overlay / product-card styling |

The header shrink and hide-on-scroll and the announcement rotation are automatic.

**Accessibility and performance.** Everything respects `prefers-reduced-motion` (all motion off and content shown immediately). Effects use transforms and opacity only (no layout shift, CLS ≤ 0.022). Scripts are vanilla JS (IntersectionObserver + `requestAnimationFrame`, about 10 KB, no GSAP needed). In the Elementor editor, the marquee and text reveal stay static so inline text editing keeps working.

---

## Rebuilding with the real modafie.io content

```bash
cd tools
npm install                                   # Playwright (uses the system Chromium if PLAYWRIGHT_BROWSERS_PATH is set)
node scrape.mjs                               # → ../scrape/ (≈1 request/s, 3 retries with backoff)
node build-demo.mjs                           # → ../theme/modafie/demo + ../design/page-mapping.md
bash package-theme.sh                         # → ../modafie-theme.zip
```

- **`scrape.mjs`** reads robots.txt (honours `Disallow`), the sitemaps (including sitemap indexes, `wp-sitemap.xml` and `sitemap_index.xml`), and then crawls internal links recursively. Each page is rendered in headless Chromium, scrolled to the bottom (lazy media), with collapsed accordions and tabs expanded. It saves the URL, slug, title, meta description, OG/Twitter tags, JSON-LD, sections with blocks in reading order (headings with levels, paragraphs, lists, tables, buttons/CTAs with links, form fields, nav), and all media: `<img>` (largest srcset variant), `<picture>`, CSS backgrounds, `<video>` and posters, YouTube/Vimeo embeds (kept as links), inline SVGs, favicon, logo and font files (with a licence note; only OFL/Google fonts are considered redistributable). Media is deduplicated by SHA-256 into `media/{images,videos,svg,fonts}`. It also takes desktop and mobile full-page screenshots, detects brand colours and fonts (`brand.json`), and writes `report.md` (counts, sizes, failures). Options: `--base URL --max-pages N --delay ms --no-screenshots --include-archives`.
- **`build-demo.mjs`** maps every crawled section onto a design-system pattern using the rules in `design/design-system.md` §8.1. **No copy is dropped**: anything a pattern doesn't place itself is kept in an adjacent text block. It then generates Elementor JSON, templates, menus (including mega menus), the announcement bar, footer columns, the Kit (with the detected accent colour) and the manifest. Override a mapping with `tools/mapping-overrides.json`:
  ```json
  { "about": { "2": "split", "5": "skip" } }
  ```
- The pipeline was verified with a round trip: I crawled the imported placeholder site and rebuilt from that crawl, and it reproduced the original pattern mapping, menus (with the mega menu), announcement, footer columns and FAQ answers on every page.

---

## Testing (Phase 6)

```bash
ELEMENTOR_DIR=/path/to/elementor bash tools/test/setup.sh   # fresh WP (Docker) + theme installed from the zip
node tools/test/e2e.mjs --rerun                              # import via the real button, twice, then verify
```

Results on WordPress 7.1.2 + PHP 8.2 + Elementor 4.3.2 (details in `screenshots/after/`):

| Check | Result |
|---|---|
| Theme installs from the zip and activates; activation notice is shown | ✅ |
| One-click import (real button) | ✅ about 25 s, all 7 steps green |
| Re-run: no duplicate pages or media (21/21) | ✅ about 4 s |
| Edited page kept on re-import; restored with `--reset` | ✅ |
| Every text string and image from the package rendered on every page (desktop) | ✅ 149 strings, 36 images |
| No horizontal scroll at 1440 / 768 / 390 | ✅ |
| Every page opens in the Elementor editor and a heading is selectable and editable | ✅ 5/5 |
| Browser console | ✅ 0 errors from the theme (the only errors are blocked outbound requests in the sandbox) |
| PHP `debug.log` | ✅ nothing from the theme (only WP core / Elementor "can't reach wordpress.org" notices caused by the sandbox) |
| Theme Check (GitHub master, 2026-09-01) | ✅ **0 REQUIRED, 0 WARNING**; 2 INFO (TGM-style `WP_Filesystem` use, single text domain), 1 RECOMMENDED (custom-header: not applicable) |
| Lighthouse **mobile** (3 runs per page, median) | Performance: home 88, about 87, collections 87, FAQ 91, contact 91 (every run ≥ 86). Accessibility 98–100, Best Practices 100, SEO 100. CLS ≤ 0.022 |
| Missing Elementor, wordpress.org unreachable | ✅ clean error message, no fatal error; pages still render their plain-HTML fallback |

The Lighthouse numbers come from a local Docker Apache (HTTP/1.1, no page cache), so a production host with HTTP/2 and caching should score higher. Theme-level performance work includes: self-hosted fonts with preload and metric-matched fallbacks, the hero background preloaded with `fetchpriority=high`, below-the-fold images lazy under background heroes, jQuery moved to the footer, the Kit and page CSS inlined, and the animation JS loaded before Elementor's scripts so the hero text reveal never delays LCP.

**Before/after.** The "before" screenshots of modafie.io could not be taken, because the site was unreachable from the build environment. `scrape.mjs` saves them to `scrape/screenshots/{desktop,mobile}/` when it runs. "After" screenshots of every page at 3 widths are in `screenshots/after/` (`overview.png` is a contact sheet).

---

## WooCommerce
No shop could be detected (the crawl was blocked), so WooCommerce support is **conditional**: if WooCommerce is active, the theme loads a Gymshark-style product grid (4/3/2 columns, 4:5 image cards on a surface background, pill buttons, sale badge in the accent colour), a two-column product page and a header account/bag icon with a live count. Nothing loads otherwise.

## Design
See `design/design-system.md`. Inspiration is limited to Gymshark's **patterns** (announcement bar, sticky minimal header, mega menu, full-bleed hero, horizontal rails, category tiles, editorial splits, newsletter, multi-column footer). No Gymshark logo, imagery, copy, icons, fonts or name are used. Fonts: Barlow Condensed and Inter (SIL OFL). Icons and placeholder images are original (GPL).

## Licence
Theme code: GPLv2 or later. Fonts: SIL OFL 1.1 (licences in `theme/modafie/assets/fonts/`). Content and media crawled from modafie.io belong to Modafie.
