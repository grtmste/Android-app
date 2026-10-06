# "Before" screenshots (original modafie.io)

Not captured yet. Every request to `www.modafie.io` from the build environment was refused by its network egress policy
(proxy `403` on CONNECT; `WebFetch` returned `EGRESS_BLOCKED`, retried on request with the same result).

Once the host is allowed, the scraper writes full-page desktop (1440px) and mobile (390px) screenshots of every original page
to `scrape/screenshots/<slug>-desktop.png` / `<slug>-mobile.png`:

```bash
cd tools && npm install && npm run scrape
```

The "after" set is in `../after/` (desktop 1440 / tablet 768 / mobile 390 for every rebuilt page).
