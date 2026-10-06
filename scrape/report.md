# Modafie scrape report

> **Status: NOT SCRAPED, PLACEHOLDER SEED.** Every request to `www.modafie.io` (and `www.gymshark.com`, `wordpress.org`)
> was refused by the build environment's egress proxy (`403` on CONNECT; `WebFetch` returned `EGRESS_BLOCKED`).
> No modafie content, media or screenshots could be captured, so none are in this folder.

- Pages scraped from modafie.io: **0**
- Placeholder pages generated: **7** (home, about, collections, journal, faq, contact, privacy-policy)
- Placeholder media generated: **23** files (0.46 MB). These are original abstract images and line icons, flagged `"placeholder": true`
- Screenshots of the original site: **none** (site unreachable)

## How to produce the real scrape

```bash
cd tools
npm install
npm run scrape        # node scraper/crawl.mjs --base https://www.modafie.io --out ../scrape
npm run build-demo    # regenerates theme/modafie/demo from scrape/content.json
npm run zip           # rebuilds dist/modafie-theme.zip
```

The scraper was validated end-to-end against a local fixture site (`tools/scraper/fixture/`), covering robots.txt disallow,
sitemap index, lazy `srcset`/`<picture>`, CSS backgrounds, `<video>`+poster, YouTube embed, inline SVG, forms, and
desktop+mobile screenshots: 3 pages, 8 media files, 0 failures.

## Failures

- **page** https://www.modafie.io/: CONNECT tunnel failed, response 403 (egress policy)
- **robots** https://www.modafie.io/robots.txt: CONNECT tunnel failed, response 403 (egress policy)
- **sitemap** https://www.modafie.io/sitemap.xml: CONNECT tunnel failed, response 403 (egress policy)
