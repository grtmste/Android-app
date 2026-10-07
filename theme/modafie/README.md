# Modafie: WordPress theme for Elementor

A lightweight, Elementor-first theme for an offer-style site (no shop) with an athletic-editorial look: bold condensed caps, a monochrome palette with one brand accent, a sticky hide-on-scroll header with mega menu, and scroll animations you switch on with a CSS class. It ships with a **one-click importer** that rebuilds the whole Modafie site as normal, editable Elementor pages.

- WordPress 6.5+ (tested on 7.1.3), PHP 8.1+ (tested on 8.2)
- Elementor **free** (tested on 4.0). Elementor Pro is optional and never required.
- No external requests: fonts, scripts and demo media are all inside the theme.

---

## 1. Install

1. **Appearance → Themes → Add New → Upload Theme**, choose `modafie-theme.zip`, click **Install Now**, then **Activate**.
2. A notice appears: **Welcome to Modafie!** Click **Import Modafie demo content**. You can also go to **Appearance → Import Modafie Demo** at any time.
3. Click **Import Modafie demo content** and wait for all seven steps to turn green (usually under a minute):

| Step | What it does |
|---|---|
| Elementor | Installs Elementor (free) from WordPress.org if it is missing, then activates it |
| Site Settings | Writes global colours, global fonts, button style, container width and breakpoints into the active **Elementor Kit**, and turns on Flexbox containers, inline SVG icons, optimized markup and lazy-loading |
| Media | Imports every image, SVG icon and video into the Media Library (in batches, so it won't time out) |
| Templates | Saves every section, plus the site footer, to **Templates → Saved Templates** |
| Pages | Creates every page (Home, About us, What we do, FAQ, Get an offer) as Elementor content (`Elementor Full Width` template) and sets **Home** as the static front page |
| Menus | Builds the *Primary* menu (Home · WhatsApp · About us · What we do, whose mega menu links to each service · FAQ) and the *Footer* menu |
| Finish | Sets the footer template, announcement bar and "Get an offer" header button, then regenerates Elementor's CSS |

**Safe to re-run.** Pages, media and templates are matched by an internal key, so running the import again updates them in place and never creates duplicates. Content you created yourself is never touched.

From the command line: `wp modafie import`. If Elementor was installed in the same run, run the command a second time.

> If the server can't reach WordPress.org, step 1 asks you to install Elementor from **Plugins → Add New**. After that, run the import again.

---

## 2. Editing content

Every page is real Elementor content built from standard widgets: Heading, Text Editor, Image, Button, Video, Icon Box, Icon List, Nested Accordion, Containers, plus two theme widgets.

- **Pages → All Pages → Edit with Elementor.** Click any text to change it, or any image to swap it from the Media Library.
- The **Structure** panel shows named sections (Hero, Card carousel, Category tiles, Split image/text, Newsletter, …).
- **Reusable sections:** in the editor, click the folder icon, open **My Templates**, and insert any of the *Modafie · …* sections on another page.
- **Card carousel:** each card is a child container of the rail. Duplicate a card to add one, or delete it to remove one.

### Theme widgets (Elements panel → *Modafie*)

| Widget | Use |
|---|---|
| **Modafie Marquee** | Infinite scrolling text strip. Set the items, separator, speed, direction and pause-on-hover. Style the typography, colours and gap |
| **Modafie Form** | Newsletter or contact form, built without Elementor Pro. Fields can be text, email, phone, textarea, select or consent checkbox, at 50% or 100% width. Layout is stacked or inline. Set the success message, recipient e-mail and optional redirect. Each submission is **e-mailed** and also listed under **Appearance → Form submissions**. Spam protection uses a honeypot, a timing check and a per-IP rate limit |

### Header and footer

- **Logo:** Appearance → Customize → Site Identity → Logo. Without a logo, the site title is shown as a wordmark.
- **Menus:** Appearance → Menus. The *Primary* menu drives the desktop navigation and the mobile off-canvas menu.
  - **Mega menu:** open *Screen Options* and enable **CSS Classes**. Add `mf-mega` to a top-level item; its children become columns and its grandchildren become links.
  - **Mega-menu image tile:** add `mf-mega-feature` to a child item and paste an image URL into its *Description*.
- **Appearance → Customize → Modafie Header & Footer:**
  - Announcement bar on or off, with messages (one per line) shown as a marquee, plus an optional link
  - Hide header on scroll down / show on scroll up
  - Transparent header over the homepage hero
  - Optional header button
  - **Header template / Footer template:** pick any Elementor template to replace the built-in header or footer. The importer sets the footer to *Modafie · Site footer*, which you edit under Templates → Saved Templates
- With Elementor Pro (or another theme-builder plugin), the theme registers the `header` and `footer` locations, so those builders take over automatically.

---

## 3. Colours and fonts (global)

Everything reads from **Elementor → Site Settings** (in the editor: hamburger menu → *Site Settings*):

- **Global Colors:** *Primary* (black), *Secondary*, *Text*, *Accent* (the brand colour), plus custom *White*, *Surface*, *Line*, *Muted* and *Dark surface*.
  Changing **Accent** recolours button hover fills, link hovers, marquee separators and focus rings across the site, including the theme header and footer, which read Elementor's `--e-global-color-*` variables.
- **Global Fonts:** *Primary* (H1), *Secondary* (H3), *Text*, *Accent* (buttons), plus *Display*, *Heading 2*, *Heading 4*, *Statement*, *Card title*, *Small* and *Eyebrow*.
  Pick a different family, size or weight here and every widget that uses it updates.
- **Theme Style → Buttons:** pill radius, padding, colours. **Layout:** content width 1440px and container padding.

The bundled fonts, *Inter* and *Barlow Condensed*, appear in the font picker under **Modafie (self-hosted)** and load from the theme with `font-display: swap`. If you pick a Google font instead, Elementor loads it as usual.

The block editor palette and fonts (`theme.json`) use the same values, for any page you build without Elementor.

---

## 4. Animation classes

Add a class under **Advanced → CSS Classes** on any widget or container, or choose it from **Advanced → Modafie Motion**, which adds the same class and lets you set the parallax strength. Elementor's own **Entrance Animation** (Advanced → Motion Effects) works alongside these; the demo uses `fadeInUp`, `fadeIn` and `zoomIn` with staggered delays, and all of them stay editable.

| Class | Put it on | Effect |
|---|---|---|
| `mf-reveal` | Heading | Line-by-line mask reveal when scrolled into view. It runs immediately inside a hero |
| `mf-hero` | Container with a background image | Slow zoom-out ("Ken Burns") on the background, gentle parallax, and an automatic `mf-reveal` on its headings |
| `mf-parallax` | Image widget | Image drifts gently against the scroll. It runs on the browser's compositor (CSS scroll-driven animation) where supported, otherwise a smoothed JS fallback (strength: `--mf-parallax`) |
| `mf-parallax-bg` | Container with a background image | Background moves at a slower speed than the content |
| `mf-marquee` | Heading or Text Editor | Turns the text into an infinite ticker. Separate items with `✦`, `•` or `\|`. Alternatively, use the *Modafie Marquee* widget |
| `mf-zoom` | Image, card container, anything with an image | Image zooms to 106% on hover/focus |
| `mf-carousel` | Container (Full Width) | Child containers become a horizontal, scroll-snapping rail. Mouse drag with momentum, native swipe on touch, keyboard arrows, prev/next buttons and a progress bar. Shows 4 / 2.4 / 1.3 cards (desktop / tablet / mobile); override with `--mf-slides` in custom CSS |
| `mf-tile` | Container with a background image | Category tile: bottom scrim, background zoom on hover, white heading |
| `mf-stagger` | Container | Children fade up one after another when scrolled into view |
| `mf-btn-light` / `mf-btn-outline` / `mf-btn-outline-light` / `mf-btn-block` | Button | White / outline / outline-on-dark / full-width variants. All buttons get the accent fill-slide on hover |
| `mf-link` | Heading with a link | Small caps link with an animated underline (used for "View all") |
| `mf-eyebrow` | Text Editor | Small, spaced, uppercase label |
| `mf-on-dark` | Modafie Form | Light-on-dark fields and button |
| `mf-video-sound` | Video widget (Self Hosted, Autoplay + Mute on) | Autoplays muted when scrolled into view, pauses when out of view, and adds a **Sound on / off** button. Browsers only allow autoplay without sound |
| `mf-card-item` | Card container | 4:5 image on a grey background; the whole card is clickable via its heading link |

**Built-in behaviours** (no class needed): the header hides on scroll down, shows on scroll up and shrinks after 80px; the mobile off-canvas menu traps focus and closes on Escape; mega-menu panels open on hover, keyboard focus or first tap on touch; the announcement bar is a marquee; buttons get a hover fill-slide.

**Accessibility and performance:**
- Elementor's *Fade In Up*, *Fade In Down* and *Zoom In* entrances are softened by the theme (32px slide, 96% zoom) so large photos don't jump.
- With `prefers-reduced-motion: reduce`, reveals, parallax, zoom, marquee motion and the hero zoom are turned off, and content shows immediately.
- Reveals only animate `transform`/`clip`, so there's no layout shift.
- The theme JS has no dependencies (IntersectionObserver + `requestAnimationFrame`, about 7 KB gzipped) and is deferred.
- Lighthouse mobile on the demo scores 90–97 for performance (accessibility, best practices and SEO 100), with CLS 0.

---

## 5. Offers, WhatsApp and Instagram (no shop)

The site generates leads instead of selling online.

- **Get an offer** (`/get-an-offer/`): a quote request form (Modafie Form widget) asking for name, email, brand, WhatsApp/phone, product type, quantity per style, services needed, project details and consent. Each request is e-mailed (to the address in the widget, or the site admin by default) and listed under **Appearance → Form submissions**. Edit the fields, recipient and thank-you message by clicking the form in Elementor.
- **Header button:** "Get an offer" (Customize → Modafie Header & Footer → Header button).
- **WhatsApp:** every "WhatsApp us" button and the *WhatsApp* menu item link to **`/whatsapp/`**. Set the number once in **Customize → Modafie Header & Footer → WhatsApp number** (international format, e.g. `+37255512345`), optionally with a pre-filled message, and every link opens that chat. **Until a number is set, `/whatsapp/` sends visitors to the Get an offer page.**
- **Instagram:** `/instagram/` opens the profile URL set in the same Customizer section.

---

## 6. Rebuilding the demo from modafie.io

The demo package in `demo/` is generated, not hand-written. The current build uses the copy from modafie.io's pages, supplied by Modafie (`tools/demo/manual_seed.py`). Its photos and videos are **labelled stand-ins**: each one says which original image belongs there (for example "Sewing at the Juki machine"). Replace them in Elementor (click the image, or a container's background), or let the scraper fetch the originals.

Rebuild from the client copy:

```bash
cd tools
python3 -I demo/manual_seed.py ../scrape && npm run build-demo && npm run zip
```

Or from a live crawl of modafie.io, which needs `www.modafie.io` and `cdn.shopify.com` reachable:

```bash
cd tools
npm install
npm run scrape       # crawl https://www.modafie.io  → ../scrape (content.json, media, screenshots, report.md)
npm run build-demo   # content.json → ../theme/modafie/demo (Elementor JSON, kit, menus, media)
npm run zip          # → ../dist/modafie-theme.zip
```

The builder maps each scraped section to a layout pattern (hero, carousel, tiles, split, …) and takes the accent colour from the brand colours it detected. It never drops content: anything it can't classify becomes Heading, Text Editor, Image, Button or Video widgets, in the original order.

---

## 7. Files

```
style.css · functions.php · theme.json · screenshot.png · readme.txt
header.php footer.php index.php page.php single.php archive.php search.php 404.php comments.php …
page-templates/full-width.php          "Modafie Full Width (no title)"
template-parts/header/site-header.php  announcement + sticky header + mega menu + off-canvas
template-parts/footer/site-footer.php  Elementor footer template or menus/widgets fallback
inc/elementor.php                      font group, locations, widgets, Modafie Motion control
inc/widgets/                           Modafie Marquee, Modafie Form
inc/forms.php                          form handler + Appearance → Form submissions
inc/importer/                          one-click importer (admin page, AJAX steps, WP-CLI)
assets/css/theme.css  assets/js/theme.js  assets/fonts/ (OFL)
demo/                                  manifest.json, kit.json, pages/, templates/, media/
```

Licence: GPLv2 or later. Fonts: SIL OFL 1.1 (see `assets/fonts/LICENSE.md`).
