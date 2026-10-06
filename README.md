# Modafie: Elementor WordPress theme + one-click site rebuild

> This repository also contains the unrelated **FitTrain** Android app (`app/`, Gradle files). Everything for the
> Modafie WordPress theme lives in the folders below.

| Deliverable | Where |
|---|---|
| Installable theme | [`dist/modafie-theme.zip`](dist/modafie-theme.zip) (Appearance → Themes → Upload) |
| Theme source | [`theme/modafie/`](theme/modafie/) · user guide: [`theme/modafie/README.md`](theme/modafie/README.md) |
| Scrape | [`scrape/`](scrape/): `content.json`, `media/`, `report.md` (**placeholder, see status below**) and `scraper-validation/` |
| Design system | [`design/design-system.md`](design/design-system.md) |
| Before / after screenshots | [`screenshots/`](screenshots/): `after/` (21 pages × viewports + menus), `before/` (pending), `admin/`, `editor/` |
| Test reports | [`screenshots/verify-report.md`](screenshots/verify-report.md), [`screenshots/lighthouse/summary.md`](screenshots/lighthouse/summary.md), [`screenshots/theme-check.md`](screenshots/theme-check.md) |
| Tooling | [`tools/`](tools/): scraper, demo builder, zip script, Docker test stack, Playwright tests |

## Status

- **Scraped live** from modafie.io (`scrape/`): 12 pages, 31 images, 4 videos, 6 SVGs, plus desktop and mobile screenshots of every page. See `scrape/report.md`.
- The theme demo uses a **curated layout** following modafie.io's own section order, filled with that live content (`tools/demo/curated_seed.py` → `scrape/content.curated.json`).
  It covers Home, About us, What we do, Tech pack service, FAQ, Contact, Privacy policy and a new **Get an offer** page. The site is offer-style; there is no shop.
- Videos are bundled as 720p web versions (`scrape/media/web`). The 1080p originals are git-ignored and can be re-downloaded with `npm run scrape`.
- Setup notes for the site owner: [`MEDIA-INSTRUCTIONS.md`](MEDIA-INSTRUCTIONS.md).

```bash
cd tools && npm install
npm run scrape       # live crawl → scrape/content.json, media, screenshots, report
npm run curate       # curated layout + live content → scrape/content.curated.json
npm run build-demo   # → theme/modafie/demo
npm run zip          # → dist/modafie-theme.zip
```

## Pipeline

```
modafie.io ──crawl.mjs──▶ scrape/content.json + media ──build-demo.mjs──▶ theme/modafie/demo/ ──zip──▶ modafie-theme.zip
 (robots, sitemaps,          (sections → blocks,            (section → layout pattern →           (importer on the target
  link crawl, Playwright      media deduped by sha256,        Elementor containers/widgets,          site resolves media/page
  render + lazy scroll)       screenshots, report)            kit, menus, templates)                 tokens to real IDs/URLs)
```

## Test results (fresh WordPress 7.1.3 / PHP 8.2 / MariaDB 11 / Elementor 4.0 in Docker)

| Check | Result |
|---|---|
| Upload zip via Appearance → Themes → Upload, activate, notice, one-click import | ✅ all 7 steps (`tools/test/admin-import.mjs`, screenshots in `screenshots/admin/`) |
| Re-run import | ✅ no duplicates (pages 8, media 23, library 26, menus 3 before and after) |
| Content vs `content.curated.json` (live text/media) | ✅ 358/358 text blocks, photos, videos and posters present (`verify.mjs`) |
| Elementor editor | ✅ all 7 pages + footer template open without JS errors; headings open "Edit Heading" (`editor-check.mjs`) |
| Interactions | ✅ header hide/show/shrink, mega menu, off-canvas + Escape, carousel, AJAX form, reduced motion (`interactions.mjs`) |
| Browser console | ✅ no errors on any page/viewport (`screenshots.mjs`) |
| PHP error log | ✅ nothing from the theme (only core/Elementor notices caused by the test box having no internet) |
| Theme Check | ✅ 0 required, 0 warnings (1 recommended: custom-header, not applicable to a logo-based header) |
| Lighthouse mobile | ✅ performance 90–97, accessibility/best practices/SEO 100 on all pages, CLS ≤ 0.001 |

Run it yourself:

```bash
cd tools && npm install
npm run zip
cd test && WP_SRC=<WordPress checkout> ELEMENTOR_SRC=<elementor build> THEME_CHECK_SRC=<theme-check> ./reset-site.sh && cd ..
node test/admin-import.mjs     # install zip + one-click import through wp-admin
node test/screenshots.mjs      # → screenshots/after (1440 / 768 / 390)
node test/editor-check.mjs     # → screenshots/editor
node test/verify.mjs           # → screenshots/verify-report.md
node test/interactions.mjs
```

(`reset-site.sh` copies Elementor in as an *inactive* plugin because the test box can't reach WordPress.org. On a normal host,
the importer downloads it.)

## How to install, edit, animate and restyle

See **[theme/modafie/README.md](theme/modafie/README.md)**: install steps, editing pages in Elementor, header/footer,
the `mf-*` animation classes, and changing colours/fonts globally in Elementor → Site Settings.
