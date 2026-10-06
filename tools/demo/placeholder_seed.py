#!/usr/bin/env python3
"""
Writes a PLACEHOLDER scrape (scrape/content.json + original abstract images + report.md)
in exactly the schema produced by tools/scraper/crawl.mjs.

It exists only because modafie.io was unreachable from the build environment. Running the real
scraper overwrites everything this script creates:

    cd tools && npm run scrape && npm run build-demo

Usage: python3 -I tools/demo/placeholder_seed.py <scrape-dir>
"""
import hashlib
import json
import math
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "scrape").resolve()
BASE = "https://www.modafie.io"
ACCENT = (59, 91, 255)
media = {}


def grain(img, amount=10, seed=0):
    rnd = random.Random(seed)
    w, h = img.size
    noise = Image.effect_noise((w // 2, h // 2), amount).resize((w, h)).convert("L")
    return Image.blend(img, Image.merge("RGB", (noise, noise, noise)), 0.06 + rnd.random() * 0.02)


def art(name, w, h, seed, mood="dark", accent=False):
    """Original abstract 'studio' composition: tonal gradient, soft light shapes, grain."""
    rnd = random.Random(seed)
    if mood == "dark":
        top, bottom = (rnd.randint(18, 40),) * 3, (rnd.randint(70, 110),) * 3
    elif mood == "mid":
        top, bottom = (rnd.randint(90, 120),) * 3, (rnd.randint(170, 200),) * 3
    else:
        top, bottom = (rnd.randint(205, 225),) * 3, (rnd.randint(235, 246),) * 3
    img = Image.new("RGB", (w, h))
    px = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        px.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(rnd.randint(3, 5)):
        r = rnd.randint(min(w, h) // 6, min(w, h) // 2)
        cx, cy = rnd.randint(0, w), rnd.randint(0, h)
        tone = 255 if mood == "dark" else 0
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(tone, tone, tone, rnd.randint(18, 45)))
    # a tall "figure-like" monolith to give tiles a focal point
    mw = rnd.randint(w // 7, w // 4)
    mx = rnd.randint(w // 5, w - w // 5 - mw)
    shade = 230 if mood == "dark" else 25
    d.rounded_rectangle([mx, int(h * 0.28), mx + mw, h + 40], radius=mw // 2, fill=(shade, shade, shade, 70))
    if accent:
        ax = rnd.randint(0, w)
        d.ellipse([ax - w // 5, h * 0.6, ax + w // 5, h * 0.6 + w // 2.5], fill=ACCENT + (60,))
    layer = layer.filter(ImageFilter.GaussianBlur(min(w, h) // 22))
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    img = grain(img, seed=seed)
    path = OUT / "media" / "images" / f"{name}.jpg"
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=74, optimize=True, progressive=True)
    return register(path, "images", "image/jpeg", w, h, alt="")


ICONS = {
    "icon-quality": '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
    "icon-delivery": '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    "icon-returns": '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
    "icon-community": '<circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M2.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5M13.5 15.2c.9-.8 1.9-1.2 3-1.2 2.2 0 3.9 1.6 4.5 4.5"/>',
}


def icon(name):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" '
           f'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>')
    path = OUT / "media" / "svg" / f"{name}.svg"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg)
    return register(path, "svg", "image/svg+xml", 48, 48)


def register(path, kind, ct, w, h, alt=""):
    data = path.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    rec = {"id": sha[:16], "sha256": sha, "file": f"{kind}/{path.name}", "kind": kind, "contentType": ct,
           "bytes": len(data), "url": f"{BASE}/placeholder/{path.name}", "sources": [], "alt": alt,
           "width": w, "height": h, "placeholder": True}
    media[rec["id"]] = rec
    return rec


def img_block(rec, alt, link=None):
    b = {"type": "image", "src": rec["url"], "alt": alt, "width": rec["width"], "height": rec["height"],
         "mediaId": rec["id"], "file": rec["file"]}
    if link:
        b["link"] = link
    return b


def H(text, level=2):
    return {"type": "heading", "level": level, "text": text}


def P(text):
    return {"type": "paragraph", "text": text, "html": text}


def BTN(text, href):
    return {"type": "button", "text": text, "href": BASE + href}


def section(blocks, bg=None, tag="section", classes=None, color=None):
    s = {"tag": tag, "id": None, "classes": classes or [], "background": {"color": color, "image": None, "video": None}, "blocks": blocks}
    if bg:
        s["background"].update({"image": bg["url"], "mediaId": bg["id"], "file": bg["file"]})
    return s


def page(slug, title, desc, sections):
    url = BASE + ("/" if slug == "home" else f"/{slug}")
    for i, s in enumerate(sections):
        s["index"] = i
    return {"url": url, "requestedUrl": url, "discoveredVia": "placeholder", "slug": slug, "status": 200,
            "title": f"{title} | Modafie", "meta": {"description": desc, "canonical": url, "og": {"og:title": title, "og:description": desc}},
            "lang": "en", "headings": [], "sections": sections, "media": [], "forms": [], "consoleErrors": [], "screenshots": {}}


def main():
    (OUT / "media").mkdir(parents=True, exist_ok=True)
    hero = art("hero-studio", 2400, 1400, 11, "dark", accent=True)
    about_hero = art("about-hero", 2400, 1300, 12, "dark")
    coll_hero = art("collections-hero", 2400, 1300, 13, "mid")
    tiles = [art(f"tile-{n}", 1200, 1600, 20 + i, ["dark", "mid", "dark"][i]) for i, n in enumerate(["one", "two", "three"])]
    cards = [art(f"card-{i + 1}", 1000, 1250, 40 + i, "light" if i % 2 else "mid") for i in range(6)]
    split = [art(f"split-{i + 1}", 1400, 1600, 60 + i, "mid" if i else "dark", accent=i == 0) for i in range(3)]
    editorial = art("editorial-wide", 2400, 1300, 70, "dark", accent=True)
    journal = [art(f"journal-{i + 1}", 1200, 900, 80 + i, ["mid", "dark", "light"][i]) for i in range(3)]
    icons = [icon(n) for n in ICONS]

    card_names = ["Item one", "Item two", "Item three", "Item four", "Item five", "Item six"]
    carousel = [H("New in", 2), {"type": "link", "text": "View all", "href": BASE + "/collections"}]
    for i, c in enumerate(cards):
        carousel += [img_block(c, f"Placeholder image {i + 1}", BASE + "/collections"), H(card_names[i], 3), P("Short supporting line")]
    tile_blocks = [H("Shop by category", 2)]
    for i, (t, label) in enumerate(zip(tiles, ["Category one", "Category two", "Category three"])):
        tile_blocks += [img_block(t, label, BASE + "/collections"), H(label, 3), BTN("Explore", "/collections")]
    values = [H("What we stand for", 2)]
    for ic, (t, d) in zip(icons, [("Quality first", "Replace with a short value statement from modafie."),
                                   ("Fast delivery", "Replace with modafie's delivery promise."),
                                   ("Easy returns", "Replace with modafie's returns policy summary."),
                                   ("Community", "Replace with a line about the modafie community.")]):
        values += [{"type": "svg", "width": 48, "height": 48, "mediaId": ic["id"], "file": ic["file"]}, H(t, 3), P(d)]
    newsletter = section([H("Join the list", 2), P("Placeholder newsletter copy: early access, launches and stories, straight to your inbox."),
                          {"type": "form", "action": None, "method": "post", "submit": "Sign up",
                           "fields": [{"tag": "input", "type": "email", "name": "email", "label": "Email address", "placeholder": "Email address", "required": True}]}], color="#f6f6f6")

    pages = [
        page("home", "Home", "Placeholder home page for the Modafie theme demo.", [
            section([{"type": "paragraph", "text": "New season", "html": "New season", "role": "eyebrow"},
                     H("Your story starts here", 1),
                     P("This is placeholder copy. Every word and image on this page is editable in Elementor."),
                     BTN("Shop now", "/collections"), BTN("Discover", "/about")], bg=hero, classes=["hero"]),
            section([P("Free shipping placeholder ✦ Returns placeholder ✦ New arrivals weekly ✦ Members get early access")], classes=["marquee"]),
            section(carousel),
            section(tile_blocks),
            section([img_block(split[0], "Placeholder story image"), {"type": "paragraph", "text": "Our story", "html": "Our story", "role": "eyebrow"},
                     H("Designed with intent", 2),
                     P("Placeholder paragraph for modafie's brand story. Describe what makes the product different, who it is for and why it exists."),
                     BTN("Read more", "/about")]),
            section([H("Built for every day", 2), BTN("Explore the collection", "/collections")], bg=editorial, classes=["editorial"]),
            section(values),
            section([{"type": "quote", "text": "A short, bold statement that sums up the brand in one breath.", "html": "A short, bold statement that sums up the brand in one breath."}]),
            newsletter,
        ]),
        page("about", "About", "Placeholder about page.", [
            section([H("About us", 1), P("Placeholder intro line for the about page.")], bg=about_hero, classes=["hero"]),
            section([{"type": "quote", "text": "We believe good design should feel effortless.", "html": "We believe good design should feel effortless."}]),
            section([img_block(split[1], "Placeholder image"), H("Where it began", 2),
                     P("Placeholder paragraph. Tell the origin story here - the moment, the problem, the first product."),
                     P("A second placeholder paragraph to show multi-paragraph splits.")]),
            section([img_block(split[2], "Placeholder image"), H("How we make it", 2),
                     P("Placeholder paragraph about materials, process and craft."), BTN("See the collection", "/collections")]),
            section(list(values)),
            section([H("Made to be lived in", 2)], bg=editorial, classes=["editorial"]),
        ]),
        page("collections", "Collections", "Placeholder collections overview.", [
            section([H("Collections", 1), P("Placeholder description of the range.")], bg=coll_hero, classes=["hero"]),
            section(list(tile_blocks)),
            section(list(carousel)),
            json.loads(json.dumps(newsletter)),
        ]),
        page("journal", "Journal", "Placeholder journal.", [
            section([H("Journal", 1), P("Stories, guides and news. Placeholder intro.")]),
            section(sum([[img_block(j, f"Journal placeholder {i + 1}", BASE + "/journal"), {"type": "paragraph", "text": "Placeholder date", "html": "Placeholder date", "role": "eyebrow"},
                          H(["First journal entry title", "Second journal entry title", "Third journal entry title"][i], 3),
                          P("Placeholder excerpt for a journal article - one or two sentences.")] for i, j in enumerate(journal)], [])),
        ]),
        page("faq", "FAQ", "Placeholder FAQ.", [
            section([H("Frequently asked questions", 1)]),
            section(sum([[H(q, 3), P("Placeholder answer. Replace with modafie's answer to this question.")] for q in
                         ["How long does delivery take?", "What is your returns policy?", "How do I find my size?", "Do you ship internationally?", "How can I contact you?"]], [])),
            section([H("Still have questions?", 2), BTN("Contact us", "/contact")]),
        ]),
        page("contact", "Contact", "Placeholder contact page.", [
            section([H("Contact", 1), P("Placeholder: we usually reply within one working day.")]),
            section([H("Get in touch", 2), {"type": "list", "ordered": False, "items": ["hello@example.com", "+00 000 000 000", "Placeholder address"]},
                     {"type": "form", "action": None, "method": "post", "submit": "Send message", "fields": [
                         {"tag": "input", "type": "text", "name": "name", "label": "Name", "placeholder": "Name", "required": True},
                         {"tag": "input", "type": "email", "name": "email", "label": "Email", "placeholder": "Email", "required": True},
                         {"tag": "select", "type": "select-one", "name": "topic", "label": "Topic", "placeholder": "", "required": False, "options": ["General", "Orders", "Press"]},
                         {"tag": "textarea", "type": "textarea", "name": "message", "label": "Message", "placeholder": "Message", "required": True}]}]),
        ]),
        page("privacy-policy", "Privacy Policy", "Placeholder privacy policy.", [
            section([H("Privacy policy", 1), P("Placeholder legal text. Replace with modafie's privacy policy."),
                     H("What we collect", 2), P("Placeholder paragraph."), H("How we use it", 2), P("Placeholder paragraph."),
                     {"type": "list", "ordered": False, "items": ["Placeholder item one", "Placeholder item two", "Placeholder item three"]}]),
        ]),
    ]
    nav = [{"text": "Collections", "href": BASE + "/collections", "children": [
               {"text": "Category one", "href": BASE + "/collections", "children": []},
               {"text": "Category two", "href": BASE + "/collections", "children": []},
               {"text": "Category three", "href": BASE + "/collections", "children": []},
               {"text": "New in", "href": BASE + "/collections", "children": []}]},
           {"text": "About", "href": BASE + "/about", "children": []},
           {"text": "Journal", "href": BASE + "/journal", "children": []},
           {"text": "FAQ", "href": BASE + "/faq", "children": []},
           {"text": "Contact", "href": BASE + "/contact", "children": []}]
    footer = [{"heading": "Shop", "links": [{"text": "Collections", "href": BASE + "/collections"}, {"text": "New in", "href": BASE + "/collections"}]},
              {"heading": "Help", "links": [{"text": "FAQ", "href": BASE + "/faq"}, {"text": "Contact", "href": BASE + "/contact"}]},
              {"heading": "Company", "links": [{"text": "About", "href": BASE + "/about"}, {"text": "Journal", "href": BASE + "/journal"}]},
              {"heading": "Legal", "links": [{"text": "Privacy policy", "href": BASE + "/privacy-policy"}]}]
    content = {"generator": "modafie-placeholder-seed/1.0", "source": "placeholder",
               "note": "modafie.io was blocked by the build environment's network policy. This file is a structural placeholder; run `npm run scrape` in tools/ to replace it.",
               "site": {"base": BASE + "/", "crawledAt": datetime.now(timezone.utc).isoformat(), "favicon": None, "logo": None,
                        "brand": {"palette": [], "accent": None, "themeColor": None}, "fonts": None, "nav": nav, "footer": footer,
                        "headerBlocks": [], "footerBlocks": [{"type": "paragraph", "text": "© Modafie. All rights reserved.", "html": "© Modafie. All rights reserved."}]},
               "pages": pages, "media": media}
    (OUT / "content.json").write_text(json.dumps(content, indent=2, ensure_ascii=False))
    total = sum(m["bytes"] for m in media.values())
    (OUT / "report.md").write_text(f"""# Modafie scrape report

> **Status: NOT SCRAPED, PLACEHOLDER SEED.** Every request to `www.modafie.io` (and `www.gymshark.com`, `wordpress.org`)
> was refused by the build environment's egress proxy (`403` on CONNECT; `WebFetch` returned `EGRESS_BLOCKED`).
> No modafie content, media or screenshots could be captured, so none are in this folder.

- Pages scraped from modafie.io: **0**
- Placeholder pages generated: **{len(pages)}** ({', '.join(p['slug'] for p in pages)})
- Placeholder media generated: **{len(media)}** files ({total / 1048576:.2f} MB). These are original abstract images and line icons, flagged `"placeholder": true`
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

- **page** {BASE}/: CONNECT tunnel failed, response 403 (egress policy)
- **robots** {BASE}/robots.txt: CONNECT tunnel failed, response 403 (egress policy)
- **sitemap** {BASE}/sitemap.xml: CONNECT tunnel failed, response 403 (egress policy)
""")
    print(f"placeholder seed: {len(pages)} pages, {len(media)} media, {total / 1048576:.2f} MB -> {OUT}")


if __name__ == "__main__":
    main()
