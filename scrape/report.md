# Modafie scrape report

> **Status: content supplied by the client; live scrape still blocked.** Every request to `www.modafie.io` and
> `cdn.shopify.com` (where its photos/videos live) is refused by the build environment's egress proxy (`403` on CONNECT;
> `WebFetch`: `EGRESS_BLOCKED`, retried on 2026-10-06 with the same result).

## What is in `content.json`

| Page | Source | Sections |
|---|---|---:|
| Home | client screenshot (homepage, low-res) | 13 |
| About us | client screenshot, verbatim | 8 |
| What we do | client screenshot, verbatim | 9 |
| FAQ | client screenshot, verbatim | 3 |
| Get an offer | **new**: offer/lead form replacing the shop (client request: “not shop orientated, rather ask for an offer style”) | 2 |

- Navigation, as on modafie.io: Home · WhatsApp · About us · What we do (now with links to each service) · FAQ, plus a **Get an offer** header button
- Brand accent **#EC5000**, sampled from the orange MODAFIE marquee / services card
- Media: **22 labelled stand-ins** (0.50 MB). Each says which original photo or video belongs in that slot
  (e.g. “Sewing at the Juki machine”, “Portfolio: embroidered sweatshirt”). The orange brush card is original artwork.

## Lines to verify

These were too small to read in the supplied homepage screenshot (413 px wide) and were reconstructed. Please check them,
or edit them in Elementor:

- **Home → What We Manufacture**: “We manufacture fashion apparel for emerging and established brands — hoodies, trousers, outerwear, and more, from 30 pieces per style.”
- **Home → What We Manufacture**: “Custom branded tote bags manufactured in Europe. Your logo, your material, your finishes — from 30 units.”
- **Home → What We Manufacture**: “We produce wearable textiles from lotus, bamboo, aloe vera, eucalyptus, banana, and rose fibers — sustainable exotic fabrics available exclusively through Modafie.”
- **Home → Ecosystem list**: “European production standards—every single order”
- **Home → Ecosystem list**: “MOQ from just 30 pieces per style”
- **Home → Ecosystem list**: “One point of contact from start to finish”
- **Home → Ecosystem list**: “Sustainable & exotic fabric options available”
- **Home → Ecosystem list**: “Fast sampling turnaround - 3 to 4 weeks”
- **Home → Ecosystem list**: “No hidden fees, ever”
- **Home → closing paragraph**: “We support slow fashion instead.”
- **Home → closing paragraph**: “We've developed a unique collection of sustainable exotic fabrics — crafted from nature's most unexpected materials: rose, lotus, bamboo, banana, eucalyptus, aloe vera, and more. These fibers are woven into something you can actually wear. Curious? Reach out — we'd love to share more.”
- **Home → What We Manufacture**: a 4th card (title starting “Mugs &…”) was cut off in the screenshot, so I didn't add it
- **Logo**: the MODAFIE wordmark with the stylised “O” is an image on modafie.io. Upload it in Appearance → Customize → Site Identity → Logo

## Copy notes (kept verbatim from modafie.io)

- What we do → Sampling: “*From €depends on the complexity of design…*” and Bulk production: “*From €depends on what we are creating…*”: the price seems to be missing after “€”.
- What we do → Tech packs: “Its important…” (missing apostrophe); Marketing list: “meta suits” (probably “Meta suite”).

## How to replace the stand-in media with the real photos/videos

```bash
cd tools && npm install && npm run scrape   # needs www.modafie.io + cdn.shopify.com allowed
```

Or swap them by hand: Elementor → click the image, or the container background for heroes and banners, → choose from the Media Library.
