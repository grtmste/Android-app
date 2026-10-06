#!/usr/bin/env python3
"""
Builds scrape/content.json from the Modafie copy supplied by the client (screenshots of
modafie.io: Home, About us, What we do, FAQ), in exactly the schema tools/scraper/crawl.mjs writes.

Text is verbatim from the client's pages. The only exceptions are the lines flagged with
FLAG_RECONSTRUCTED (too small to read in the supplied homepage screenshot) and the new
"Get an offer" page that turns the site into an offer/lead-generation site (no shop).

Photos and videos: modafie.io (and its Shopify CDN) is unreachable from the build environment,
so every image is a labelled stand-in that says which original photo belongs there. Run the real
scraper once access is allowed, or swap the images in Elementor / the Media Library.

Usage: python3 -I tools/demo/manual_seed.py <scrape-dir>
"""
import hashlib
import json
import math
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "scrape").resolve()
BASE = "https://www.modafie.io"
ACCENT_HEX = "#EC5000"  # sampled from the orange MODAFIE marquee / services card on modafie.io
ACCENT = (236, 80, 0)
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
media = {}
flags = []


def register(path, kind, ct, w, h, alt=""):
    data = path.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    rec = {"id": sha[:16], "sha256": sha, "file": f"{kind}/{path.name}", "kind": kind, "contentType": ct,
           "bytes": len(data), "url": f"{BASE}/stand-in/{path.name}", "sources": [], "alt": alt,
           "width": w, "height": h, "placeholder": True}
    media[rec["id"]] = rec
    return rec


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def slot(name, w, h, label, tone="dark", seed=0, video=False):
    """Labelled stand-in for an original modafie.io photo/video (dark or light studio gradient)."""
    rnd = random.Random(seed)
    top, bottom = ((26, 26, 26), (70, 70, 70)) if tone == "dark" else ((214, 212, 208), (238, 236, 232))
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for _ in range(3):
        r = rnd.randint(min(w, h) // 5, min(w, h) // 2)
        cx, cy = rnd.randint(0, w), rnd.randint(0, h)
        c = 255 if tone == "dark" else 0
        ld.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(c, c, c, 26))
    layer = layer.filter(ImageFilter.GaussianBlur(min(w, h) // 18))
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    d = ImageDraw.Draw(img)
    fg = (235, 235, 235) if tone == "dark" else (40, 40, 40)
    sub = (170, 170, 170) if tone == "dark" else (110, 110, 110)
    wide = w > h * 1.3
    # Wide images are used as section backgrounds under headings: keep the label small, centred near the top (survives cover-cropping).
    big = font(FONT_B, max(16, w // (60 if wide else 26)))
    small = font(FONT_R, max(11, w // (110 if wide else 52)))
    tag = ("VIDEO" if video else "PHOTO") + " · MODAFIE.IO"
    pad = max(20, w // 30)
    lines = [(tag, small, ACCENT), (label, big, fg), ("Stand-in. Replace with the original in Elementor", small, sub)]
    if wide:
        y = int(h * 0.12)
        for text_, f, col in lines:
            tw = d.textlength(text_, font=f)
            d.text(((w - tw) / 2, y), text_, font=f, fill=col)
            y += f.size + 8
    else:
        y = (h - sum(f.size + 6 for _, f, _ in lines)) // 2
        for text_, f, col in lines:
            tw = d.textlength(text_, font=f)
            d.text(((w - tw) / 2, y), text_, font=f, fill=col)
            y += f.size + 6
    if video:
        cx, cy, r = w // 2, h // 2, max(28, w // 24)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=fg, width=3)
        d.polygon([(cx - r // 3, cy - r // 2), (cx - r // 3, cy + r // 2), (cx + r // 2, cy)], fill=fg)
    path = OUT / "media" / "images" / f"{name}.jpg"
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=72, optimize=True, progressive=True)
    return register(path, "images", "image/jpeg", w, h, alt=label)


def brush(name, w, h, seed=7):
    """Original orange brush-stroke artwork for the 'View our services' card."""
    rnd = random.Random(seed)
    img = Image.new("RGB", (w, h), (246, 245, 243))
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for k in range(7):
        cx, cy = rnd.randint(-w // 6, w), rnd.randint(-h // 6, h)
        rx, ry = rnd.randint(w // 4, w // 2), rnd.randint(h // 6, h // 3)
        start = rnd.randint(0, 360)
        for j in range(26):
            width = rnd.randint(w // 40, w // 16)
            shade = tuple(min(255, max(0, c + rnd.randint(-18, 18))) for c in ACCENT)
            d.arc([cx - rx + j * 2, cy - ry + j, cx + rx - j * 2, cy + ry - j], start + j * 3, start + 200 + j * 4, fill=shade + (235,), width=width)
    layer = layer.filter(ImageFilter.GaussianBlur(1.2))
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    path = OUT / "media" / "images" / f"{name}.jpg"
    img.save(path, "JPEG", quality=80, optimize=True, progressive=True)
    return register(path, "images", "image/jpeg", w, h, alt="Orange brush strokes")


# ------------------------------------------------------------------ block helpers
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
    """Bold paragraph (as on the client's pages)."""
    return P(text, f"<strong>{esc(text)}</strong>")


def I(text):
    return P(text, f"<em>{esc(text)}</em>")


def EYE(text):
    return P(text, role="eyebrow")


def L(items):
    out = []
    for it in items:
        if isinstance(it, tuple):  # (plain, html)
            out.append({"text": it[0], "html": it[1]})
        else:
            out.append(it)
    return {"type": "list", "ordered": False, "items": out}


def BTN(text, href):
    return {"type": "button", "text": text, "href": BASE + href}


def IMG(rec, alt=None, link=None):
    b = {"type": "image", "src": rec["url"], "alt": alt or rec["alt"], "width": rec["width"], "height": rec["height"], "mediaId": rec["id"], "file": rec["file"]}
    if link:
        b["link"] = BASE + link
    return b


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def S(blocks, pattern=None, bg=None, **kw):
    s = {"tag": "section", "id": None, "classes": [], "background": {"color": None, "image": None, "video": None}, "blocks": blocks}
    if pattern:
        s["pattern"] = pattern
    if bg:
        s["background"].update({"image": bg["url"], "mediaId": bg["id"], "file": bg["file"]})
    s.update(kw)
    return s


def page(slug, title, desc, sections, path=None):
    url = BASE + (path or ("/" if slug == "home" else f"/pages/{slug}"))
    for i, s in enumerate(sections):
        s["index"] = i
    return {"url": url, "requestedUrl": url, "discoveredVia": "client-supplied", "slug": slug, "status": 200,
            "title": f"{title} | Modafie", "meta": {"description": desc, "canonical": url, "og": {"og:title": title, "og:description": desc}},
            "lang": "en", "headings": [], "sections": sections, "media": [], "forms": [], "consoleErrors": [], "screenshots": {}}


def flag(where, text):
    flags.append(f"- **{where}**: “{text}”")
    return text


WA = "/whatsapp"
OFFER = "/get-an-offer"


def main():
    (OUT / "media").mkdir(parents=True, exist_ok=True)
    m = {
        "hero": slot("hero-video-sequins-sewing", 2400, 1350, "Hero video: sequins / sewing close-up", "dark", 1, video=True),
        "services": brush("view-our-services-brush", 1000, 1250),
        "s_mockup": slot("design-mockup-concept", 1000, 1250, "Design mockup & concept", "light", 2),
        "s_techpack": slot("tech-pack-creation", 1000, 1250, "Tech pack creation", "light", 3),
        "s_sampling": slot("sampling-prototyping", 1000, 1250, "Sampling & prototyping", "dark", 4),
        "s_bulk": slot("bulk-production", 1000, 1250, "Bulk production", "dark", 5),
        "s_packaging": slot("custom-packaging-labeling", 1000, 1250, "Custom packaging & labeling", "light", 6),
        "s_photo": slot("product-photography", 1000, 1250, "Product photography & lookbook", "light", 7),
        "s_marketing": slot("brand-marketing-launch", 1000, 1250, "Brand marketing & launch", "dark", 8),
        "rail": slot("black-garments-on-rail", 2400, 1350, "Black garments on a rail", "dark", 9),
        "sewing": slot("juki-sewing-machine", 2400, 1350, "Sewing at the Juki machine", "dark", 10),
        "m_apparel": slot("fashion-wear-apparel", 1000, 1250, "Fashion wear & apparel (grey joggers)", "light", 11),
        "m_tote": slot("custom-tote-bags", 1000, 1250, "Custom tote bag", "light", 12),
        "m_fabric": slot("sustainable-exotic-fabrics", 1000, 1250, "Exotic fabric rolls", "light", 13),
        "p1": slot("portfolio-embroidered-sweatshirt", 1000, 1000, "Portfolio: embroidered sweatshirt", "dark", 14),
        "p2": slot("portfolio-beige-sweatshirt", 1000, 1000, "Portfolio: beige cropped sweatshirt", "light", 15),
        "p3": slot("portfolio-white-tracksuit", 1000, 1000, "Portfolio: white zip hoodie & trousers", "light", 16),
        "p4": slot("portfolio-piece-4", 1000, 1000, "Portfolio: next piece", "dark", 17),
        "hangers": slot("black-tees-on-hangers", 2400, 1350, "Black tees on grey hangers", "dark", 18),
        "pattern": slot("pattern-cutting", 1400, 1000, "Pattern cutting on the table", "light", 19),
        "client": slot("client-story-video", 2000, 1125, "Video: designer story", "dark", 20, video=True),
        "atelier": slot("atelier-team", 1400, 1600, "The atelier / the team", "dark", 21),
    }

    services = [
        ("mockups", "Design Mockup & Concept", m["s_mockup"]),
        ("tech-packs", "Tech Pack Creation", m["s_techpack"]),
        ("sampling", "Sampling & Prototyping", m["s_sampling"]),
        ("production", "Bulk Production", m["s_bulk"]),
        ("packaging", "Custom Packaging & Labeling", m["s_packaging"]),
        ("photography", "Product Photography", m["s_photo"]),
    ]
    service_cards = [IMG(m["services"], "View our services", "/pages/what-we-do"), H("View our services →", 3, BASE + "/pages/what-we-do")]
    for anchor, title, img in services:
        service_cards += [IMG(img, title, f"/pages/what-we-do#{anchor}"), H(title, 3, BASE + f"/pages/what-we-do#{anchor}")]

    home = page("home", "Low MOQ Clothing Manufacturer in Europe",
                "We produce high-end clothing for fashion brands from just 30 pieces — with zero costly mistakes, delays, or factory risks.", [
        S([H("Low MOQ Clothing Manufacturer in Europe", 1),
           P("We produce high-end clothing for fashion brands from just 30 pieces — with zero costly mistakes, delays, or factory risks."),
           BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)], "hero", bg=m["hero"], title="Hero"),
        S(service_cards, "carousel", title="Services rail"),
        S([EYE("Introducing"), H("High End Clothing Manufacturing in Europe"),
           P("From design mockup to packaged delivery — we handle every step of your production under one roof.")], "editorial", bg=m["rail"], variant="left", title="Introducing"),
        S([P("MODAFIE")], "marquee", variant="accent", title="Brand marquee"),
        S([], "editorial", bg=m["sewing"], title="Sewing image"),
        S([H("What We Manufacture"),
           IMG(m["m_apparel"], "Fashion wear & apparel"), H("Fashion wear & Apparel", 3),
           P(flag("Home → What We Manufacture", "We manufacture fashion apparel for emerging and established brands — hoodies, trousers, outerwear, and more, from 30 pieces per style.")),
           IMG(m["m_tote"], "Custom tote bags"), H("Custom Tote Bags", 3),
           P(flag("Home → What We Manufacture", "Custom branded tote bags manufactured in Europe. Your logo, your material, your finishes — from 30 units.")),
           IMG(m["m_fabric"], "Sustainable exotic fabric collection"), H("Sustainable Exotic Fabric Collection", 3),
           P(flag("Home → What We Manufacture", "We produce wearable textiles from lotus, bamboo, aloe vera, eucalyptus, banana, and rose fibers — sustainable exotic fabrics available exclusively through Modafie."))],
          "carousel", title="What we manufacture"),
        S([H("Our Clothing Manufacturing Portfolio — Fresh From the Factory"),
           IMG(m["p1"]), IMG(m["p2"]), IMG(m["p3"]), IMG(m["p4"])], "carousel", title="Portfolio"),
        S([H("Design, develop, and produce your collection with Europe's most flexible full-service factory."),
           P("We handle mockups, tech packs, sampling, bulk production, packaging, and shipping—so you can focus on your brand.")],
          "editorial", bg=m["hangers"], variant="left", title="Full-service factory"),
        S([P("MODAFIE")], "marquee", variant="small", title="Small marquee"),
        S([IMG(m["pattern"]), H("Your Entire Production Ecosystem — Under One Roof"),
           L([flag("Home → Ecosystem list", "European production standards—every single order"),
              flag("Home → Ecosystem list", "MOQ from just 30 pieces per style"),
              flag("Home → Ecosystem list", "One point of contact from start to finish"),
              flag("Home → Ecosystem list", "Sustainable & exotic fabric options available"),
              flag("Home → Ecosystem list", "Fast sampling turnaround - 3 to 4 weeks"),
              flag("Home → Ecosystem list", "No hidden fees, ever")]),
           BTN("WhatsApp us", WA)], "split", reverse=True, title="Production ecosystem"),
        S([IMG(m["client"], "Designer story video")], "wideimage", title="Client video"),
        S([P(flag("Home → closing paragraph", "We support slow fashion instead.")),
           P(flag("Home → closing paragraph", "We've developed a unique collection of sustainable exotic fabrics — crafted from nature's most unexpected materials: rose, lotus, bamboo, banana, eucalyptus, aloe vera, and more. These fibers are woven into something you can actually wear. Curious? Reach out — we'd love to share more."))],
          "generic", boxed=760, title="Slow fashion"),
        S([H("Start with 30 pieces."), P("Test the market. See what sells. Gather feedback. Then reinvest."),
           BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)], "cta", variant="dark", title="Offer CTA"),
    ])

    about = page("about-us", "About us", "Why Modafie starts at 30 pieces — a letter from our founder, Monagni.", [
        S([EYE("A letter from our founder"), H("About Us", 1)], "title", title="Page title"),
        S([P("My name is Monagni. For years, I stood beside friends, colleagues, and strangers with fire in their eyes and sketches in their hands—only to watch that fire dim when they met reality."),
           P("They'd approach factories with 50-unit orders. Laughter."),
           P("They'd beg for 100 pieces. \"Come back when you have 500.\""),
           P("And the ones who compromised? They'd receive garments that looked nothing like their samples. Terrible communication. Zero accountability. And a mountain of inventory they couldn't sell."),
           P("Here's the truth the industry won't tell you:")], "generic", boxed=760, title="Letter — part 1"),
        S([{"type": "quote", "text": "High MOQs aren't a sign of quality. They're a transfer of risk.", "html": "High MOQs aren't a sign of quality. They're a transfer of risk."}], "statement", title="Statement"),
        S([P("They push the burden onto you—the designer—while they collect their cheque. You're left sitting on boxes of unsold stock, praying you guessed right on sizes, colours, and trends. One wrong bet? Your brand is finished before it started."),
           P("It felt unfair. It felt unnecessary. It felt broken."),
           P("So I built Modafie differently."),
           P("Here, your minimum order quantity doesn't determine your potential. It determines your freedom."),
           P("Start with 30 pieces. Test the market. See what sells. Gather feedback. Then reinvest.", "<strong>Start with 30 pieces.</strong> Test the market. See what sells. Gather feedback. Then reinvest."),
           P("Sell out in a week? Great—we'll run your next 30. Or 300. Or 3,000."),
           P("The model is simple:"),
           L([("Low MOQ means low inventory risk", "<strong>Low MOQ</strong> means <strong>low inventory risk</strong>"),
              ("Low risk means faster profit", "<strong>Low risk</strong> means <strong>faster profit</strong>"),
              ("Fast profit means more collections", "<strong>Fast profit</strong> means <strong>more collections</strong>"),
              ("More collections means an excited audience that never gets bored", "<strong>More collections</strong> means <strong>an excited audience that never gets bored</strong>")]),
           P("You're not guessing what your customers want. You're listening. Adapting. Growing. One small batch at a time."),
           P("And because you can launch limited-edition drops every few weeks, your brand stays fresh. Your audience stays hungry. And you're never stuck with last season's mistakes.")],
          "generic", boxed=760, title="Letter — part 2"),
        S([IMG(m["atelier"]),
           P("Yes, we offer 360° services—from the first sketch to the last shipment."),
           P("Yes, we maintain European standards that rival luxury houses."),
           P("But here's what truly sets us apart:"),
           B("Whether you're producing your first 30 pieces or your 30,000th, you get the same attention. The same quality. The same partnership."),
           P("We don't have a \"small client\" table and a \"big client\" table. There's just one table. And you never graduate from it—you grow at it."),
           P("From the emerging designer testing their first drop to the established brand scaling their tenth collection, the experience is identical. The care is identical. The obsession with your success? Identical."),
           P("Because we believe something the old factories forgot:")], "split", title="One table"),
        S([{"type": "quote", "text": "A brand that starts with 30 today could be the brand ordering 3,000 tomorrow. And we want to be there for both moments.", "html": "A brand that starts with 30 today could be the brand ordering 3,000 tomorrow. And we want to be there for both moments."}], "statement", title="Statement 2"),
        S([B("Cheers,"), B("Monagni")], "generic", boxed=760, title="Signature"),
        S([H("Start with 30 pieces."), BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)], "cta", variant="dark", title="Offer CTA"),
    ])

    wl = "What lands in your inbox:"
    wg = "What you get:"
    what = page("what-we-do", "What we do", "Mockups, tech packs, sampling, bulk production from 30 pieces, packaging, photography and launch support — under one roof.", [
        S([H("What we do", 1),
           P("Look, we could give you a boring list of services with corporate jargon and stock photos of people shaking hands."),
           P("But that's not who we are."),
           P("At Modafie, we're the humans behind the machines. The ones who actually get excited when you send us a napkin sketch. The ones who believe your 30-piece dream deserves the same love as a 3,000-piece order."),
           P("So here's what we actually do. No fluff. Just honest talk about making your brand real.")], "title", title="Page title"),
        S([IMG(m["s_mockup"]), EYE("01"), H("Mockups & Design Development"),
           P("Maybe you have detailed sketches. Maybe you have a mood board covered in tears and magazine cutouts. Maybe just a feeling you can't shake."),
           P("That's enough. Bring it here."),
           P("Our design team sits with you (virtually or in person) and turns that fuzzy dream into a clean digital mockup. We play with fabrics, colours, silhouettes until you make that sound—you know the one. The \"oh yes, that's it\" sound."),
           P("Then we tweak it. Again. And again. Until it's yours."),
           B(wl), L(["Beautiful digital mockups from your scribbles", "Fabric suggestions that won't break the bank", "A design you actually want to wear"]),
           P("You can either design yourself or hire our service. This service is 30-50 euro onwards, sometimes free!")], "split", anchor="mockups", title="01 Mockups"),
        S([IMG(m["s_techpack"]), EYE("02 — Tech Packs"), H("The Boring Stuff That Saves Your Sanity"),
           P("Okay, this part isn't sexy. But neither is getting a sample back that looks nothing like your drawing."),
           P("A tech pack is basically a recipe for your garment. Every measurement, every stitch, every tiny detail written down so there's zero confusion between \"what you imagined\" and \"what arrives at your door.\""),
           P("Its important to have techpack because if there is an error in the production, you can hold the factory accountable to fix it."),
           P("Don't have one? We build it with you. Have a messy one? We clean it up. Just want to understand what the hell a tech pack even is? We'll explain like humans.",
             "Don't have one? We build it with you.<br>Have a messy one? We clean it up.<br>Just want to understand what the hell a tech pack even is? We'll explain like humans."),
           B(wg), L(["Measurements that actually make sense", "Construction details so specific your grandma could sew it", "No more \"lost in translation\" moments"]),
           I("From €60-120. Cheap insurance against disasters. €50 or less for Tshirt.")], "split", anchor="tech-packs", title="02 Tech packs"),
        S([IMG(m["s_sampling"]), EYE("03"), H("Sampling & Prototyping"),
           P("This is my favourite part. Watching a designer hold their sample for the first time."),
           P("We craft your piece with the same care as if it were for our own brand. Then we send it to you. Try it on. Show your mum. Find what's wrong with it (there's always something)."),
           P("Then we fix it together. Once, twice, three times if needed. Until you'd wear it to a party and lie when people ask where you bought it."),
           B(wg), L(["A real, wearable sample", "2-3 rounds of tweaks (we're patient)", "That butterflies-in-stomach feeling"]),
           I("*From €depends on the complexity of design so we know how much our pattern maker needs to work. 1-3 weeks. Worth every day.*")], "split", anchor="sampling", title="03 Sampling"),
        S([IMG(m["s_bulk"]), EYE("04"), H("Bulk Production — From 30 Pieces or No MOQ"),
           P("Here's where most factories break your heart."),
           P("\"Come back when you have 500 pieces.\" \"We don't do small orders.\" \"You're not ready for us.\""),
           P("We've heard it a thousand times from designers who came to us crying. So we built something different."),
           P("At Modafie, you start at 30 pieces. Not 300. Not 500. Thirty."),
           P("Same quality as the big guys get. Same attention. Same machines. Just... less risk. Less inventory sitting in your bedroom. Less praying you guessed right on sizes."),
           P("Sell out in a week? Brilliant. We'll run your next 30. Or 300. Or 3,000. You grow at your pace, not ours."),
           B(wg), L(["Production from 30 pieces (yes, really)", "European quality that doesn't embarrass you", "Room to make mistakes and learn", "Reorders that don't require a second mortgage"]),
           I("*From €depends on what we are creating. Production 4-8 weeks after sample sign-off.")], "split", anchor="production", title="04 Bulk production"),
        S([IMG(m["s_packaging"]), EYE("05"), H("Custom Packaging & Labeling"),
           P("You know that feeling when you open something beautiful? The paper crinkles just right. The box smells expensive. The little details make you smile."),
           P("That should be your brand."),
           P("We make your labels (woven, printed, whatever feels right). Your hang tags. Your care instructions. Your boxes and bags if you want."),
           P("Sustainable materials if that's your thing. Premium finishes if that's your vibe. Just... you."),
           B(wg), L(["Labels that don't fall off after one wash", "Packaging that makes people take photos", "Details that scream \"this is a real brand\""]),
           P("The bulk order already will include price of packaging, labelling, shipping.")], "split", anchor="packaging", title="05 Packaging"),
        S([IMG(m["s_photo"]), EYE("06 — Only if you need"), H("Product Photography & Lookbook Shoots"),
           P("You just spent months making something beautiful. Don't let it die in bad lighting."),
           P("Our photography team treats your garments like art. Flat lays that stop the scroll. Model shots that make people ask \"where can I get that?\" Detail close-ups that prove you didn't cut corners."),
           P("No renting studios. No hunting for photographers. No \"can you just edit this to not look orange?\""),
           P("Just stunning images, ready for your website, your Instagram, your \"oh my god we launched\" moment."),
           B(wg), L(["Flat lays that actually sell", "Real humans wearing your stuff", "Close-ups that show off the stitching you're proud of", "20-30 images that make you look like you've done this before"])],
          "split", anchor="photography", title="06 Photography"),
        S([IMG(m["s_marketing"]), EYE("07"), H("Brand Marketing & Launch Support"),
           P("Here's a secret: amazing products fail all the time. Not because they weren't good. Because no one knew they existed."),
           P("We don't want that to be you."),
           P("Our marketing team helps you sound like yourself (but clearer). We plan your launch so it feels like an event, not a whisper. We help you find the first customers who'll become your biggest fans."),
           P("You built the collection. Let us help the world discover it."),
           B(wg), L(["Words that actually sound like you", "In-depth growth marketing specialist who will work with meta suits, google ad, SEO optimisation etc",
                     "A launch plan that doesn't stress you out", "Constructive guidance towards assured success", "A nudge in the right direction when you're stuck"])],
          "split", anchor="marketing", title="07 Marketing"),
        S([H("Start with 30 pieces."), P("Test the market. See what sells. Gather feedback. Then reinvest."), BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)], "cta", variant="dark", title="Offer CTA"),
    ])

    faqs = [
        ("What is the minimum order quantity at Modafie?", "We accept orders from as few as 30 pieces per style. This makes us ideal for emerging brands, designers testing new collections, or startups who want to produce small runs without large factory minimums."),
        ("Where is Modafie located?", "Modafie is based in Europe. We produce to EU quality standards and ship internationally."),
        ("What services does Modafie offer?", "We provide end-to-end clothing manufacturing including: design mockups, tech pack creation, sample making, bulk production, custom tags and labeling, packaging, shipping, and product photography."),
        ("Can Modafie help with tech packs?", "Yes. We create professional tech packs covering measurements, materials, stitching, trims, and construction details so your sample is made correctly the first time."),
        ("How long does sampling take?", "Sampling typically takes 3 to 4 weeks from tech pack approval."),
        ("Does Modafie work with sustainable fabrics?", "Yes. We have a unique collection of sustainable exotic fabrics made from lotus, bamboo, aloe vera, eucalyptus, banana, and rose fibers."),
        ("How do I get started?", "WhatsApp us directly. We respond within 24 hours."),
    ]
    faq = page("faq", "Frequently Asked Questions", "Minimum order quantity, location, services, tech packs, sampling times and sustainable fabrics — answered.", [
        S([H("Frequently Asked Questions", 1)], "title", title="Page title"),
        S(sum([[H(q, 3), P(a)] for q, a in faqs], []), "faq", title="FAQ"),
        S([H("Still deciding?"), P("Tell us what you want to make and get a tailored offer — or message us on WhatsApp."), BTN("Get an offer", OFFER), BTN("WhatsApp us", WA)], "cta", title="Offer CTA"),
    ])

    offer = page("get-an-offer", "Get an offer", "Tell us what you want to produce — from 30 pieces per style — and get a tailored offer within 24 hours.", [
        S([EYE("From 30 pieces per style"), H("Get an offer", 1),
           P("Tell us what you want to produce and we'll come back with a tailored offer. We respond within 24 hours.")], "title", title="Page title"),
        S([H("How it works"),
           L([("Mockups & design development — or bring your own design", "<strong>Mockups &amp; design development</strong> — or bring your own design"),
              ("Tech pack — every measurement and stitch written down", "<strong>Tech pack</strong> — every measurement and stitch written down"),
              ("Sampling & prototyping — 3 to 4 weeks from tech pack approval", "<strong>Sampling &amp; prototyping</strong> — 3 to 4 weeks from tech pack approval"),
              ("Bulk production from 30 pieces — 4-8 weeks after sample sign-off", "<strong>Bulk production from 30 pieces</strong> — 4-8 weeks after sample sign-off"),
              ("Packaging, labelling and shipping included in the bulk order", "<strong>Packaging, labelling and shipping</strong> included in the bulk order")]),
           P("Prefer to chat? WhatsApp us directly. We respond within 24 hours."),
           BTN("WhatsApp us", WA),
           {"type": "form", "action": None, "method": "post", "submit": "Request my offer", "fields": [
               {"tag": "input", "type": "text", "name": "name", "label": "Your name", "placeholder": "Your name", "required": True},
               {"tag": "input", "type": "email", "name": "email", "label": "Email", "placeholder": "you@brand.com", "required": True},
               {"tag": "input", "type": "text", "name": "brand", "label": "Brand name", "placeholder": "Brand name", "required": False},
               {"tag": "input", "type": "tel", "name": "whatsapp", "label": "WhatsApp / phone", "placeholder": "+00 000 000 000", "required": False},
               {"tag": "select", "type": "select-one", "name": "product", "label": "What would you like to produce?", "placeholder": "", "required": True,
                "options": ["Fashion wear & apparel", "Custom tote bags", "Sustainable exotic fabric collection", "Something else"]},
               {"tag": "select", "type": "select-one", "name": "quantity", "label": "Quantity per style", "placeholder": "", "required": True,
                "options": ["30-50 pieces", "50-100 pieces", "100-300 pieces", "300+ pieces", "Not sure yet"]},
               {"tag": "select", "type": "select-one", "name": "services", "label": "What do you need?", "placeholder": "", "required": False,
                "options": ["Everything — from design to delivery", "Mockups & design development", "Tech pack", "Sampling & prototyping", "Bulk production", "Packaging & labeling", "Product photography", "Brand marketing & launch support"]},
               {"tag": "textarea", "type": "textarea", "name": "project", "label": "Tell us about your project", "placeholder": "Garment types, fabrics, timeline, links to sketches or mood boards…", "required": True},
               {"type": "checkbox", "tag": "input", "name": "consent", "label": "I agree that Modafie may contact me about this request.", "required": True}]}],
          "contact", title="Offer form"),
    ])

    nav = [
        {"text": "Home", "href": BASE + "/", "children": []},
        {"text": "WhatsApp", "href": BASE + WA, "children": []},
        {"text": "About us", "href": BASE + "/pages/about-us", "children": []},
        {"text": "What we do", "href": BASE + "/pages/what-we-do", "children": [
            {"text": t, "href": BASE + f"/pages/what-we-do#{a}", "children": []} for a, t in
            [("mockups", "Mockups & design"), ("tech-packs", "Tech packs"), ("sampling", "Sampling & prototyping"), ("production", "Bulk production"),
             ("packaging", "Packaging & labeling"), ("photography", "Photography"), ("marketing", "Marketing & launch")]]},
        {"text": "FAQ", "href": BASE + "/pages/faq", "children": []},
    ]
    footer = [
        {"heading": "Explore", "links": [{"text": "Home", "href": BASE + "/"}, {"text": "About us", "href": BASE + "/pages/about-us"}, {"text": "What we do", "href": BASE + "/pages/what-we-do"}, {"text": "FAQ", "href": BASE + "/pages/faq"}]},
        {"heading": "Work with us", "links": [{"text": "Get an offer", "href": BASE + OFFER}, {"text": "WhatsApp us", "href": BASE + WA}]},
        {"heading": "Follow", "links": [{"text": "Instagram", "href": BASE + "/instagram"}, {"text": "WhatsApp", "href": BASE + WA}]},
    ]
    pages = [home, about, what, faq, offer]
    # Shopify-style URLs (/pages/<slug>) map to WordPress slugs via the builder's slug logic.
    for p in pages:
        if p["slug"] != "home":
            p["url"] = BASE + ("/" + p["slug"])
    for p in pages:
        for s in p["sections"]:
            for b in s["blocks"]:
                for k in ("href", "link"):
                    if isinstance(b.get(k), str):
                        b[k] = b[k].replace("/pages/", "/")
    for n in nav:
        n["href"] = n["href"].replace("/pages/", "/")
        for c in n["children"]:
            c["href"] = c["href"].replace("/pages/", "/")
    for g in footer:
        for link in g["links"]:
            link["href"] = link["href"].replace("/pages/", "/")

    content = {
        "generator": "modafie-manual-seed/2.0", "source": "client-supplied",
        "note": "Text from the client's modafie.io pages (supplied as screenshots). Photos/videos are labelled stand-ins: modafie.io and cdn.shopify.com were blocked by the build environment's network policy. Run `npm run scrape` in tools/ once access is allowed.",
        "site": {
            "base": BASE + "/", "title": "Modafie", "crawledAt": datetime.now(timezone.utc).isoformat(),
            "favicon": None, "logo": None,
            "brand": {"palette": [{"hex": ACCENT_HEX.lower(), "usage": ["marquee", "services card"]}], "accent": ACCENT_HEX, "themeColor": None},
            "fonts": None, "nav": nav, "footer": footer, "headerBlocks": [],
            "footerBlocks": [P("Low MOQ clothing manufacturer in Europe — high-end production from 30 pieces per style."), P("© 2026 Modafie")],
            "theme_mods": {
                "modafie_announcement_text": "Production from 30 pieces per style\nEuropean quality standards\nSampling in 3–4 weeks\nWe respond within 24 hours",
                "modafie_announcement_link": "{{mf-page:get-an-offer}}",
                "modafie_header_cta_text": "Get an offer",
                "modafie_header_cta_url": "{{mf-page:get-an-offer}}",
                "modafie_header_search": False,
            },
        },
        "pages": pages, "media": media,
    }
    (OUT / "content.json").write_text(json.dumps(content, indent=2, ensure_ascii=False))
    total = sum(x["bytes"] for x in media.values())
    flag_lines = "\n".join(dict.fromkeys(flags))
    (OUT / "report.md").write_text(f"""# Modafie scrape report

> **Status: content supplied by the client; live scrape still blocked.** Every request to `www.modafie.io` and
> `cdn.shopify.com` (where its photos/videos live) is refused by the build environment's egress proxy (`403` on CONNECT;
> `WebFetch`: `EGRESS_BLOCKED`, retried on 2026-10-06 with the same result).

## What is in `content.json`

| Page | Source | Sections |
|---|---|---:|
| Home | client screenshot (homepage, low-res) | {len(home['sections'])} |
| About us | client screenshot, verbatim | {len(about['sections'])} |
| What we do | client screenshot, verbatim | {len(what['sections'])} |
| FAQ | client screenshot, verbatim | {len(faq['sections'])} |
| Get an offer | **new**: offer/lead form replacing the shop (client request: “not shop orientated, rather ask for an offer style”) | {len(offer['sections'])} |

- Navigation, as on modafie.io: Home · WhatsApp · About us · What we do (now with links to each service) · FAQ, plus a **Get an offer** header button
- Brand accent **{ACCENT_HEX}**, sampled from the orange MODAFIE marquee / services card
- Media: **{len(media)} labelled stand-ins** ({total / 1048576:.2f} MB). Each says which original photo or video belongs in that slot
  (e.g. “Sewing at the Juki machine”, “Portfolio: embroidered sweatshirt”). The orange brush card is original artwork.

## Lines to verify

These were too small to read in the supplied homepage screenshot (413 px wide) and were reconstructed. Please check them,
or edit them in Elementor:

{flag_lines}
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
""")
    print(f"client seed: {len(pages)} pages, {len(media)} media ({total / 1048576:.2f} MB), {len(dict.fromkeys(flags))} flagged lines -> {OUT}")


if __name__ == "__main__":
    main()
