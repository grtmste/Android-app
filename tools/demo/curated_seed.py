#!/usr/bin/env python3
"""
Builds scrape/content.curated.json: the curated Modafie site layout (modelled on modafie.io's own section order)
filled with the REAL text, photos and videos from the live scrape in scrape/content.json.

  - Every word comes from modafie.io (live scrape). The only additions are the "Get an offer" page/form and the
    call-to-action bands that turn the site into an offer/lead-generation site (client request: no shop).
  - Photos are the original files from scrape/media/images. Videos are 720p web versions of the originals
    (scrape/media/web, made with ffmpeg, see tools/demo/README or the report), plus the MODAFIE wordmark cropped
    from the original logo artwork in a white (hero) and black (header) version.

Usage: python3 -I tools/demo/curated_seed.py <scrape-dir>
"""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "scrape").resolve()
LIVE = json.loads((OUT / "content.json").read_text())
BASE = "https://modafie.io"
ACCENT_HEX = "#EC5000"  # orange used on modafie.io (MODAFIE marquee, services card)
media = {}


# ------------------------------------------------------------------ media
def live(name):
    """Media record of an original file from the live scrape, by file name."""
    for rec in LIVE["media"].values():
        if Path(rec["file"]).name == name:
            media[rec["id"]] = dict(rec)
            return media[rec["id"]]
    raise SystemExit(f"missing scraped media file: {name}")


def web(name, kind, ct, w, h, alt=""):
    """A processed web version (scrape/media/web/...)."""
    path = OUT / "media" / "web" / name
    data = path.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    rec = {"id": sha[:16], "sha256": sha, "file": f"web/{name}", "kind": kind, "contentType": ct, "bytes": len(data),
           "url": f"{BASE}/web/{name}", "sources": [], "alt": alt, "width": w, "height": h}
    media[rec["id"]] = rec
    return rec


def live_page(slug):
    return next(p for p in LIVE["pages"] if p["slug"] == slug)


def live_blocks(slug):
    return [b for s in live_page(slug)["sections"] for b in s["blocks"]]


def live_alt(name):
    for p in LIVE["pages"]:
        for s in p["sections"]:
            for b in s["blocks"]:
                if b.get("file", "").endswith(name) and b.get("alt"):
                    return b["alt"]
    return ""


# ------------------------------------------------------------------ block helpers
def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def H(text, level=2, link=None):
    b = {"type": "heading", "level": level, "text": text}
    if link:
        b["link"] = link
    return b


def P(text, html=None, role=None):
    b = {"type": "paragraph", "text": text, "html": html or esc(text)}
    if role:
        b["role"] = role
    return b


def B(text):
    return P(text, f"<strong>{esc(text)}</strong>")


def I(text):
    return P(text, f"<em>{esc(text)}</em>")


def EYE(text):
    return P(text, role="eyebrow")


def L(items):
    return {"type": "list", "ordered": False, "items": [{"text": i[0], "html": i[1]} if isinstance(i, tuple) else i for i in items]}


def BTN(text, href):
    return {"type": "button", "text": text, "href": BASE + href}


def IMG(rec, alt=None, link=None, role=None):
    b = {"type": "image", "src": rec["url"], "alt": alt if alt is not None else (rec.get("alt") or ""), "width": rec.get("width"), "height": rec.get("height"),
         "mediaId": rec["id"], "file": rec["file"]}
    if link:
        b["link"] = BASE + link
    if role:
        b["role"] = role
    return b


def VID(rec, poster=None, loop=False):
    b = {"type": "video", "src": rec["url"], "mediaId": rec["id"], "file": rec["file"], "autoplay": loop, "loop": loop, "muted": loop, "controls": not loop}
    if poster:
        b.update({"poster": poster["url"], "posterMediaId": poster["id"], "posterFile": poster["file"]})
    return b


def S(blocks, pattern=None, bg=None, video=None, **kw):
    s = {"tag": "section", "id": None, "classes": [], "background": {"color": None, "image": None, "video": None}, "blocks": blocks}
    if pattern:
        s["pattern"] = pattern
    if bg:
        s["background"].update({"image": bg["url"], "mediaId": bg["id"], "file": bg["file"]})
    if video:
        s["background"].update({"video": video["url"], "videoMediaId": video["id"], "videoFile": video["file"]})
    s.update(kw)
    return s


def page(slug, title, desc, sections, source=None):
    for i, s in enumerate(sections):
        s["index"] = i
    url = BASE + ("/" if slug == "home" else f"/{slug}")
    return {"url": url, "requestedUrl": source or (BASE + ("/" if slug == "home" else f"/pages/{slug}")), "discoveredVia": "live scrape (curated layout)", "slug": slug, "status": 200,
            "title": f"{title} | Modafie", "meta": {"description": desc or "", "canonical": url, "og": {"og:title": title, "og:description": desc or ""}},
            "lang": "en", "headings": [], "sections": sections, "media": [], "forms": [], "consoleErrors": [], "screenshots": {}}


def desc(slug):
    return (live_page(slug)["meta"] or {}).get("description") or ""


WA = "/whatsapp"
OFFER = "/get-an-offer"
WWD = "/what-we-do"


# ------------------------------------------------------------------ "What we do" from the live services page
def services_sections(service_images):
    blocks = live_blocks("pages--clothing-manufacturing-services")
    intro, groups, cur = [], [], None
    for b in blocks:
        t = b.get("text", "")
        if b["type"] == "heading" and (re.match(r"^\d+\.\s", t) or (t.startswith("(") and cur is not None and not cur["blocks"] and cur["sub"] is None and False)):
            cur = {"title": t, "sub": None, "blocks": []}
            groups.append(cur)
            continue
        if b["type"] == "heading" and t.startswith("(") and cur is not None and not cur["blocks"]:
            cur["sub"] = t.strip("()")
            continue
        if b["type"] == "heading" and t.startswith("("):
            cur = {"title": t, "sub": None, "blocks": []}
            groups.append(cur)
            continue
        if cur is None:
            if b["type"] != "heading":
                intro.append(P(t, b.get("html")))
            continue
        cur["blocks"].append(b)

    anchors = ["mockups", "tech-packs", "sampling", "production", "packaging", "photography", "marketing"]
    sections = [S([H("What we do", 1)] + intro, "title", title="Page title")]
    for i, g in enumerate(groups):
        raw = g["title"]
        m = re.match(r"^(\d+)\.\s*(.*)$", raw)
        number = f"{int(m.group(1)):02d}" if m else f"{i + 1:02d}"
        title = (m.group(2) if m else raw.strip("()")).strip()
        eyebrow = number
        # "The Boring Stuff That Saves Your Sanity- Techpack" + "(Tech Packs)"
        if title.endswith("- Techpack"):
            title = title[: -len("- Techpack")].strip()
            eyebrow = f"{number} — Tech Packs"
        po = re.match(r"^(.*?)\s*\(\s*only if you need\s*\)\s*$", title, re.I)
        if po:
            title, eyebrow = po.group(1).strip(), f"{number} — Only if you need"
        out = [IMG(service_images[i]), EYE(eyebrow), H(title)]
        for b in g["blocks"]:
            t = b.get("text", "")
            if b["type"] == "list":
                out.append(L([x if isinstance(x, str) else x.get("text", "") for x in b["items"]]))
            elif re.match(r"^(what you get|what lands in your inbox):?$", t.strip(), re.I):
                out.append(B(t))
            elif t.startswith("*") or t.startswith("From €"):
                out.append(I(t))
            elif b["type"] == "heading":
                out.append(H(t, 3))
            else:
                out.append(P(t, b.get("html")))
        sections.append(S(out, "split", anchor=anchors[i] if i < len(anchors) else None, title=f"{number} {title}"))
    return sections


# ------------------------------------------------------------------ Tech pack page from live
def techpack_sections(img):
    blocks = live_blocks("pages--tech-pack-service")
    title = blocks[0]["text"]
    out = [EYE("Tech pack service"), H(title, 1)]
    body = []
    for b in blocks[1:]:
        html = b.get("html") or esc(b.get("text", ""))
        text = b.get("text", "")
        lines = [re.sub(r"<[^>]+>", "", x).strip() for x in re.split(r"<br\s*/?>", html)]
        lines = [x for x in lines if x]
        if len(lines) == 1 and len(text) < 70 and (text.endswith("?") or text in ("How It Works",) or text.startswith("What Modafie")):
            body.append(H(text, 2))
        elif len(lines) > 1 and all(re.match(r"^(•|✓|\d+\.)\s*", x) for x in lines[1:]) and not re.match(r"^(•|✓|\d+\.)", lines[0]):
            body.append(P(lines[0]))
            body.append(L([re.sub(r"^(•|✓)\s*", "", x) for x in lines[1:]]))
        elif len(lines) > 1 and all(re.match(r"^(•|✓|\d+\.)\s*", x) for x in lines):
            body.append(L([re.sub(r"^(•|✓)\s*", "", x) for x in lines]))
        else:
            body.append(P(" ".join(lines)))
    cta_i = next((i for i, b in enumerate(body) if b.get("text") == "Ready to Start?"), len(body))
    main, cta = body[:cta_i], body[cta_i:]
    secs = [S(out, "title", title="Page title"), S([IMG(img)] + main[:4], "split", title="What is a tech pack"), S(main[4:], "generic", boxed=760, title="Service details")]
    if cta:
        secs.append(S(cta + [BTN("WhatsApp us", WA), BTN("Get an offer", OFFER)], "cta", variant="dark", title="Offer CTA"))
    return secs


def main():
    # originals
    hero_logo = web("modafie-logo-white.png", "images", "image/png", 1200, 385, "Modafie")
    header_logo = web("modafie-logo-black.png", "images", "image/png", 1200, 385, "Modafie")
    v_hero = web("hero-sewing-sequins.mp4", "videos", "video/mp4", 1280, 720)
    v_hero_p = web("hero-sewing-sequins-poster.jpg", "images", "image/jpeg", 1280, 720, "Sequins being sewn at Modafie")
    v_sew = web("sewing-machine-loop.mp4", "videos", "video/mp4", 1280, 720)
    v_sew_p = web("sewing-machine-loop-poster.jpg", "images", "image/jpeg", 1280, 720, "Sewing at the Modafie factory")
    v_cut = web("pattern-cutting-loop.mp4", "videos", "video/mp4", 1280, 720)
    v_cut_p = web("pattern-cutting-loop-poster.jpg", "images", "image/jpeg", 1280, 720, "Pattern cutting at Modafie")
    v_story = web("designer-story.mp4", "videos", "video/mp4", 1280, 720)
    v_story_p = web("designer-story-poster.jpg", "images", "image/jpeg", 1280, 720, "Designer story")

    services_card = live("img-7247-2.jpg")
    svc = {
        "Design Mockup & Concept": ("img-7090-2.jpg", "mockups"),
        "Tech Pack Creation": ("img-7089-3.jpg", "tech-packs"),
        "Sample Making & Approval": ("img-7091-2.jpg", "sampling"),
        "Bulk Production from 30 Pieces": ("img-7087-2.jpg", "production"),
        "Custom Tags & Labeling": ("img-7101.jpg", "packaging"),
        "Packaging & Worldwide Shipping": ("img-1599.jpg", "packaging"),
        "Marketing & Branding Assets": ("img-7107.jpg", "marketing"),
        "Product Photography": ("img-7093.jpg", "photography"),
    }
    # titles exactly as in the live services rail (order preserved)
    home_live = live_page("home")["sections"]
    rail = next(s for s in home_live if any(b.get("text") == "Design Mockup & Concept" for b in s["blocks"]))
    rail_titles = [b["text"] for b in rail["blocks"] if b["type"] == "heading"]
    view_services = next(b["text"] for b in rail["blocks"] if b["type"] == "paragraph")
    service_cards = [IMG(services_card, "View our services", WWD), H(view_services.replace("->", "→"), 3, BASE + WWD)]
    for t in rail_titles:
        f, a = svc[t]
        service_cards += [IMG(live(f), t, f"{WWD}#{a}"), H(t, 3, BASE + f"{WWD}#{a}")]

    hero = next(s for s in home_live if any(b.get("text") == "Low MOQ Clothing Manufacturer in Europe" for b in s["blocks"]))
    hero_h = [b["text"] for b in hero["blocks"] if b["type"] == "heading"]
    intro = next(s for s in home_live if any(b.get("text", "").upper() == "INTRODUCING" for b in s["blocks"]))
    intro_h = [b["text"] for b in intro["blocks"] if b["type"] == "heading"]
    manu = next(s for s in home_live if any(b.get("text") == "What We Manufacture" for b in s["blocks"]))
    manu_blocks = [H("What We Manufacture")]
    for b in manu["blocks"]:
        if b["type"] == "image":
            manu_blocks.append(IMG(live(Path(b["file"]).name), b.get("alt") or ""))
        elif b["type"] in ("heading", "paragraph") and b["text"] != "What We Manufacture":
            # card titles are headings, except "Custom Tote Bags" which the live theme renders as a paragraph
            is_title = b["type"] == "heading" or len(b["text"]) < 40
            manu_blocks.append(H(b["text"], 3) if is_title else P(b["text"]))
    for b in manu_blocks:
        if b["type"] == "image" and not b["alt"]:
            pass
    port = next(s for s in home_live if any(b.get("text", "").startswith("Our Clothing Manufacturing Portfolio") for b in s["blocks"]))
    port_blocks = [H(next(b["text"] for b in port["blocks"] if b["type"] == "heading"))] + [IMG(live(Path(b["file"]).name), b.get("alt") or "") for b in port["blocks"] if b["type"] == "image"]
    full = next(s for s in home_live if any(b.get("text", "").startswith("Design, develop, and produce") for b in s["blocks"]))
    full_h = [b["text"] for b in full["blocks"] if b["type"] == "heading"]
    eco = next(s for s in home_live if any(b.get("text", "").startswith("Your Entire Production Ecosystem") for b in s["blocks"]))
    eco_title = next(b["text"] for b in eco["blocks"] if b.get("text", "").startswith("Your Entire"))
    eco_list = next(b for b in eco["blocks"] if b["type"] == "list")
    slow = next(b for s in home_live for b in s["blocks"] if b.get("text", "").startswith("We support slow fashion"))

    hero_blocks = [IMG(hero_logo, "Modafie", role="logo"), H(hero_h[0], 1), P(hero_h[1]), BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)]
    home = page("home", "Low MOQ Clothing Manufacturer in Europe", desc("home"), [
        S(hero_blocks, "hero", bg=v_hero_p, video=v_hero, title="Hero"),
        S(service_cards, "carousel", title="Services rail"),
        S([EYE(intro_h[0].capitalize()), H(intro_h[1]), P(intro_h[2])], "editorial", bg=live("img-7148.jpg"), variant="left", title="Introducing"),
        S([P("MODAFIE")], "marquee", variant="accent", title="Brand marquee"),
        S([], "editorial", bg=v_sew_p, video=v_sew, title="Sewing video"),
        S(manu_blocks, "carousel", title="What we manufacture"),
        S(port_blocks, "carousel", title="Portfolio"),
        S([H(full_h[0]), P(full_h[1]), EYE(full_h[2].lstrip("-"))], "editorial", bg=live("img-7149.jpg"), variant="left", title="Full-service factory"),
        S([P("MODAFIE")], "marquee", variant="small", title="Small marquee"),
        S([VID(v_cut, v_cut_p, loop=True), H(eco_title), L([re.sub(r"^✓\s*", "", x) for x in eco_list["items"]]), BTN("WhatsApp us", WA), BTN("Get an offer", OFFER)],
          "split", reverse=True, title="Production ecosystem"),
        S([VID(v_story, v_story_p)], "video", title="Designer story video"),
        S([P(slow["text"], slow.get("html"))], "generic", boxed=760, title="Slow fashion"),
        S([H("Start with 30 pieces."), P("Test the market. See what sells. Gather feedback. Then reinvest."), BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)],
          "cta", variant="dark", title="Offer CTA"),
    ])

    # About us: letter text from the live page, laid out with two pull-quotes
    ab = [b for b in live_blocks("pages--about-us")]
    ab_text = [b for b in ab if b["type"] in ("paragraph", "list")]
    def part(start, end=None):
        out, on = [], False
        for b in ab_text:
            t = b.get("text", "")
            if t.startswith(start):
                on = True
            if on and end and t.startswith(end):
                break
            if on:
                if b["type"] == "list":
                    out.append(L([(x if isinstance(x, str) else x.get("text", ""), None) for x in b["items"]]))
                else:
                    out.append(P(t, b.get("html")))
        return out
    for blk in ab_text:  # list items keep their bold "X means Y" markup
        pass
    about_list = next((b for b in ab if b["type"] == "list"), None)
    about = page("about-us", "About us", desc("pages--about-us"), [
        S([EYE("A letter from our founder"), H("About Us", 1)], "title", title="Page title"),
        S(part("My name is Monagni", "High MOQs"), "generic", boxed=760, title="Letter — part 1"),
        S([{"type": "quote", "text": "High MOQs aren't a sign of quality. They're a transfer of risk.", "html": "High MOQs aren't a sign of quality. They're a transfer of risk."}], "statement", title="Statement"),
        S(part("They push the burden", "Yes, we offer 360"), "generic", boxed=760, title="Letter — part 2"),
        S([IMG(live("img-1264.jpg"))] + part("Yes, we offer 360", "A brand that starts with 30"), "split", title="One table"),
        S([{"type": "quote", "text": "A brand that starts with 30 today could be the brand ordering 3,000 tomorrow. And we want to be there for both moments.",
            "html": "A brand that starts with 30 today could be the brand ordering 3,000 tomorrow. And we want to be there for both moments."}], "statement", title="Statement 2"),
        S(part("Cheers"), "generic", boxed=760, title="Signature"),
        S([H("Start with 30 pieces."), BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)], "cta", variant="dark", title="Offer CTA"),
    ])
    # bold list markup from the live HTML ("<strong>Low MOQ</strong> means <strong>…</strong>") is restored here
    for s in about["sections"]:
        for b in s["blocks"]:
            if b["type"] == "list":
                b["items"] = [{"text": i["text"], "html": re.sub(r"^(.*?) means (.*)$", r"<strong>\1</strong> means <strong>\2</strong>", esc(i["text"]))} for i in b["items"]]

    images = [live(svc[t][0]) for t in ("Design Mockup & Concept", "Tech Pack Creation", "Sample Making & Approval", "Bulk Production from 30 Pieces",
                                         "Custom Tags & Labeling", "Product Photography", "Marketing & Branding Assets")]
    what = page("what-we-do", "What we do", desc("pages--clothing-manufacturing-services"), services_sections(images) + [
        S([H("Start with 30 pieces."), P("Test the market. See what sells. Gather feedback. Then reinvest."), BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)],
          "cta", variant="dark", title="Offer CTA")])

    # FAQ from the live page (question in <strong>, answer after <br>)
    qa = []
    for b in live_blocks("pages--faq"):
        html = b.get("html") or ""
        m = re.match(r"^\s*<strong>(.*?)</strong>\s*(?:<br>)?\s*(.*)$", html, re.S)
        if m and m.group(1).strip().endswith("?"):
            qa.append((re.sub(r"<[^>]+>", "", m.group(1)).strip(), re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", m.group(2))).replace("\xa0", " ").strip()))
    faq = page("faq", "Frequently Asked Questions", "Minimum order quantity, location, services, tech packs, sampling times and sustainable fabrics — answered.", [
        S([H("Frequently Asked Questions", 1)], "title", title="Page title"),
        S(sum([[H(q, 3), P(a)] for q, a in qa], []), "faq", title="FAQ"),
        S([H("Still deciding?"), P("Tell us what you want to make and get a tailored offer — or message us on WhatsApp."), BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)], "cta", title="Offer CTA"),
    ])

    techpack = page("tech-pack-service", "Tech Pack Service for Fashion Brands", desc("pages--tech-pack-service"), techpack_sections(live("img-7089-3.jpg")))

    cform = next(b for b in live_blocks("pages--contact") if b["type"] == "form")
    contact_fields = []
    for f in cform["fields"]:
        label = f["label"].rstrip("*").strip()
        contact_fields.append({"tag": f["tag"], "type": f["type"], "name": re.sub(r"^contact\[(.*)\]$", r"\1", f["name"]), "label": "Message" if label == "Comment" else label,
                               "placeholder": "Message" if f["placeholder"] == "Comment" else f["placeholder"], "required": f["label"].endswith("*") or f["type"] == "textarea"})
    contact = page("contact", "Contact", "Contact Modafie — low MOQ clothing manufacturer in Europe. WhatsApp us or send a note; we respond within 24 hours.", [
        S([H("Contact", 1), P("WhatsApp us directly and we'll get back to you within 24 hours.")], "title", title="Page title"),
        S([H("Talk to us"), P("Prefer a tailored quote? Use the Get an offer form."), BTN("WhatsApp us", WA), BTN("Get an offer", OFFER),
           {"type": "form", "action": None, "method": "post", "submit": cform["submit"], "fields": contact_fields}], "contact", title="Contact form"),
    ])

    offer = page("get-an-offer", "Get an offer", "Tell us what you want to produce — from 30 pieces per style — and get a tailored offer within 24 hours.", [
        S([EYE("From 30 pieces per style"), H("Get an offer", 1),
           P("Tell us what you want to produce and we'll come back with a tailored offer. We respond within 24 hours.")], "title", title="Page title"),
        S([H("How it works"),
           L([("Mockups & design development — or bring your own design", "<strong>Mockups &amp; design development</strong> — or bring your own design"),
              ("Tech pack — every measurement and stitch written down", "<strong>Tech pack</strong> — every measurement and stitch written down"),
              ("Sampling & prototyping — 3 to 4 weeks from tech pack approval", "<strong>Sampling &amp; prototyping</strong> — 3 to 4 weeks from tech pack approval"),
              ("Bulk production from 30 pieces — 4-6 weeks after sample sign-off", "<strong>Bulk production from 30 pieces</strong> — 4-6 weeks after sample sign-off"),
              ("Packaging, labelling and shipping included in the bulk order", "<strong>Packaging, labelling and shipping</strong> included in the bulk order")]),
           P("Prefer to chat? WhatsApp us directly. We respond within 24 hours."),
           BTN("WhatsApp us", WA),
           {"type": "form", "action": None, "method": "post", "submit": "Request my offer", "fields": [
               {"tag": "input", "type": "text", "name": "name", "label": "Your name", "placeholder": "Your name", "required": True},
               {"tag": "input", "type": "email", "name": "email", "label": "Email", "placeholder": "you@brand.com", "required": True},
               {"tag": "input", "type": "text", "name": "brand", "label": "Brand name", "placeholder": "Brand name", "required": False},
               {"tag": "input", "type": "tel", "name": "whatsapp", "label": "WhatsApp / phone", "placeholder": "+00 000 000 000", "required": False},
               {"tag": "select", "type": "select-one", "name": "product", "label": "What would you like to produce?", "placeholder": "", "required": True,
                "options": ["Fashion wear & apparel", "Custom tote bags", "Sustainable exotic fabric collection", "Mugs & branded bottles", "Something else"]},
               {"tag": "select", "type": "select-one", "name": "quantity", "label": "Quantity per style", "placeholder": "", "required": True,
                "options": ["30-50 pieces", "50-100 pieces", "100-300 pieces", "300+ pieces", "Not sure yet"]},
               {"tag": "select", "type": "select-one", "name": "services", "label": "What do you need?", "placeholder": "", "required": False,
                "options": ["Everything — from design to delivery", "Mockups & design development", "Tech pack", "Sampling & prototyping", "Bulk production",
                            "Custom tags, labeling & packaging", "Product photography", "Marketing & branding assets"]},
               {"tag": "textarea", "type": "textarea", "name": "project", "label": "Tell us about your project", "placeholder": "Garment types, fabrics, timeline, links to sketches or mood boards…", "required": True},
               {"type": "checkbox", "tag": "input", "name": "consent", "label": "I agree that Modafie may contact me about this request.", "required": True}]}],
          "contact", title="Offer form"),
    ])

    # Privacy policy from the live page (Shopify-generated; see report)
    pp = live_page("policies--privacy-policy")
    pblocks = [b for s in pp["sections"] for b in s["blocks"]]
    privacy = page("privacy-policy", "Privacy policy", "How Modafie collects and uses personal information.", [
        S([H(pblocks[0]["text"], 1)], "title", title="Page title"),
        S([({**b, "level": 2} if b["type"] == "heading" else b) for b in pblocks[1:]], "generic", boxed=760, title="Policy"),
    ])

    nav = [
        {"text": "Home", "href": BASE + "/", "children": []},
        {"text": "WhatsApp", "href": BASE + WA, "children": []},
        {"text": "About us", "href": BASE + "/about-us", "children": []},
        {"text": "What we do", "href": BASE + WWD, "children": [
            {"text": t, "href": BASE + f"{WWD}#{a}", "children": []} for a, t in
            [("mockups", "Mockups & design"), ("tech-packs", "Tech packs"), ("sampling", "Sampling & prototyping"), ("production", "Bulk production"),
             ("packaging", "Packaging & labeling"), ("photography", "Photography"), ("marketing", "Marketing & launch")]] +
            [{"text": "Tech pack service", "href": BASE + "/tech-pack-service", "children": []}]},
        {"text": "FAQ", "href": BASE + "/faq", "children": []},
    ]
    footer = [
        {"heading": "Explore", "links": [{"text": "Home", "href": BASE + "/"}, {"text": "About us", "href": BASE + "/about-us"}, {"text": "What we do", "href": BASE + WWD},
                                         {"text": "Tech pack service", "href": BASE + "/tech-pack-service"}, {"text": "FAQ", "href": BASE + "/faq"}]},
        {"heading": "Work with us", "links": [{"text": "Get an offer", "href": BASE + OFFER}, {"text": "Contact", "href": BASE + "/contact"}, {"text": "WhatsApp us", "href": BASE + WA}]},
        {"heading": "Follow", "links": [{"text": "Instagram", "href": BASE + "/instagram"}, {"text": "WhatsApp", "href": BASE + WA}, {"text": "Privacy policy", "href": BASE + "/privacy-policy"}]},
    ]
    pages = [home, about, what, techpack, faq, contact, offer, privacy]
    content = {
        "generator": "modafie-curated-seed/3.0", "source": "live",
        "note": "Curated layout filled with the live modafie.io scrape (scrape/content.json): real text, original photos, 720p web versions of the original videos.",
        "site": {
            "base": BASE + "/", "title": "Modafie", "crawledAt": LIVE["site"].get("crawledAt") or datetime.now(timezone.utc).isoformat(),
            "favicon": None, "logo": {"src": header_logo["url"], "alt": "Modafie", "mediaId": header_logo["id"], "file": header_logo["file"]},
            "brand": {"palette": LIVE["site"].get("brand", {}).get("palette", []), "accent": ACCENT_HEX, "themeColor": None},
            "fonts": LIVE["site"].get("fonts"), "nav": nav, "footer": footer, "headerBlocks": [],
            "footerBlocks": [P(hero_h[0] + " — " + hero_h[1]), P(f"© {datetime.now().year} Modafie")],
            "theme_mods": {
                "modafie_announcement_text": "Production from 30 pieces per style\nEuropean production standards\nSampling in 3–4 weeks\nWe respond within 24 hours",
                "modafie_announcement_link": "{{mf-page:get-an-offer}}",
                "modafie_header_cta_text": "Get an offer",
                "modafie_header_cta_url": "{{mf-page:get-an-offer}}",
                "modafie_header_search": False,
            },
        },
        "pages": pages, "media": media,
    }
    (OUT / "content.curated.json").write_text(json.dumps(content, indent=2, ensure_ascii=False))
    total = sum(x["bytes"] for x in media.values())
    print(f"curated seed: {len(pages)} pages, {len(media)} media ({total / 1048576:.2f} MB) -> {OUT / 'content.curated.json'}")


if __name__ == "__main__":
    main()
