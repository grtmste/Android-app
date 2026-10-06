# Modafie theme: setup notes

The theme now contains your **real content from modafie.io**:
- All text, the original photos and the MODAFIE logo.
- Your 4 videos: the hero, the sewing loop, the pattern-cutting loop and the designer story.

The videos are recompressed to 720p web versions (7.5 MB in total instead of 79 MB) so they load fast. The full-quality originals are in `scrape/media/videos` locally, or can be downloaded again with `npm run scrape`.

## 1. Install or update

1. **Appearance → Themes → Add New → Upload Theme** → choose `modafie-theme.zip` → **Install Now**.
   If Modafie is already installed, click **Replace active with uploaded**. The theme should then show version **1.1.0**.
2. Click **Import Modafie demo content**, or **Update Modafie content** if you imported before. You'll find it under Appearance → Import Modafie Demo.
   Wait until all 7 steps are green. Pages from the old placeholder demo are moved to the trash.

> **"The uploaded file exceeds the upload_max_filesize directive"?** The zip is about 14 MB, and some hosts limit uploads to 2–8 MB. Any of these works:
> - Ask your host to raise the limit to 64 MB.
> - Upload the unzipped `modafie` folder to `wp-content/themes/` with FTP or the host's file manager.
> - Run `wp theme install modafie-theme.zip --activate`.

## 2. Settings to fill in (Appearance → Customize → Modafie Header & Footer)

| Setting | Why |
|---|---|
| **WhatsApp number**, international format, e.g. `+372…` | Every "WhatsApp us" button and the WhatsApp menu item open this chat. Until it's set, they go to the Get an offer page |
| WhatsApp pre-filled message (optional) | e.g. "Hi Modafie, I'd like an offer" |
| **Instagram URL** | Used by the Instagram link in the footer |
| Announcement messages | The scrolling bar at the top |

The logo is set automatically: black in the header, white over the hero video. Change it under **Customize → Site Identity → Logo**.

## 3. Pages created

| Page | From modafie.io |
|---|---|
| Home | Home page: hero video, services, "Introducing", MODAFIE strip, sewing video, What We Manufacture, Portfolio, full-service banner, Production Ecosystem with video, designer story video, slow fashion |
| About us | `/pages/about-us`: the founder's letter |
| What we do | `/pages/clothing-manufacturing-services`: 7 services, each with its own photo. The "What we do" menu links to each one |
| Tech pack service | `/pages/tech-pack-service` |
| FAQ | `/pages/faq` |
| Contact | `/pages/contact`: the same fields as your Shopify form ("Send us a note") |
| **Get an offer** | **New**: the quote request form (product, quantity per style, services, project details) |
| Privacy policy | `/policies/privacy-policy` |

Form submissions are e-mailed to the site admin (change this by clicking the form in Elementor) and listed under **Appearance → Form submissions**.

**Not migrated:** the Shopify "Products" and "Production" collections (they show "No products found") and the empty News blog.

## 4. Please review

- **Privacy policy:** this is Shopify's generated text. It mentions Shopify, carts and payments, so update it for the new WordPress site before going live.
- **Copy kept exactly as on modafie.io** that you may want to fix:
  - *What we do → Sampling* and *Bulk production*: "From €depends…" is missing the price.
  - *Tech packs*: "Its important… in the production. you can…"
  - *Marketing*: "meta suits" (probably "Meta suite").
- **Wording I added for the offer-style site:** the Get an offer page, the "Start with 30 pieces." bands (that line is from your About page), the FAQ's "Still deciding?" box, and the Contact page intro.

## 5. Changing photos or videos later

| What | How |
|---|---|
| Image | Edit with Elementor → click the image → **Choose Image** → **Update** |
| Banner / hero background | Click the section (Structure panel: "Hero", "Introducing", "Sewing video"…) → **Style → Background** → image, or **Video** with a Video Link |
| Video block | Click the video → **Source: Self Hosted** → choose the MP4 (or paste a YouTube/Vimeo link) |
| Add a portfolio photo or product card | Right-click a card → **Duplicate**, then change its image and text |
