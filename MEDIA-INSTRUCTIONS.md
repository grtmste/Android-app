# Modafie: replacing the stand-in photos and videos

Every image in the demo is a **labelled stand-in**: grey, with a caption saying which modafie.io photo belongs there. The copy is real; only the media needs swapping. Everything is done in Elementor, no code.

## Before you start

1. **Media → Add New**: upload your original photos and videos.
   - Photos: JPG or WebP, about 2000px on the long side, under 500 KB each.
   - Videos: MP4 (H.264), under 10 MB, ideally 10–20 s with no audio for backgrounds.
2. **Appearance → Customize → Site Identity → Logo**: upload the MODAFIE wordmark. Use a PNG or SVG with a transparent background, and a white version if the header is set to transparent.
3. **Appearance → Customize → Modafie Header & Footer**:
   - **WhatsApp number** in international format, e.g. `+372…`. Until it's set, every "WhatsApp us" button goes to the Get an offer page.
   - Optional pre-filled WhatsApp message.
   - **Instagram URL**.

## How to swap each type

| What you see | How to replace it |
|---|---|
| **Image inside a card or split** (most images) | Edit the page with Elementor → click the image → **Choose Image** → pick from the Media Library → **Update** |
| **Full-width background** (hero, banners) | Click an empty part of the section → in the **Structure** panel, select the section (e.g. "Hero", "Introducing") → **Style → Background → Image** → choose → **Update** |
| **Background video** (hero) | Same section → **Style → Background → Background Type: Video** → paste the MP4's Media Library URL into **Video Link** → set **Background Fallback** to a still image → turn on **Play on mobile** if you want it there |
| **Video block** (client story) | Click the image → delete it → drag a **Video** widget into the same place → **Source: Self Hosted** (pick the MP4) or YouTube/Vimeo |

Then **Update** the page. Elementor regenerates its CSS automatically.

## Slot list

### Home
| # | Section (Structure panel) | Stand-in label | Put here |
|---|---|---|---|
| 1 | **Hero**, background | *Hero video: sequins / sewing close-up* | The hero **video** (sequins/sewing). Set it as a background video, with a still as the fallback |
| 2 | **Services rail**, card 1 | (orange brush artwork) | Keep it, or swap for your orange brush image |
| 3 | Services rail, card 2 | *Design mockup & concept* | Sketches, tape measure and hoodie photo |
| 4 | Services rail, card 3 | *Tech pack creation* | Person drawing tech packs at a desk |
| 5–8 | Services rail, cards 4–7 | *Sampling & prototyping*, *Bulk production*, *Custom packaging & labeling*, *Product photography* | Matching service photos |
| 9 | **Introducing**, background | *Black garments on a rail* | Black garments on a rail |
| 10 | **Sewing image**, background | *Sewing at the Juki machine* | Juki sewing machine close-up |
| 11 | **What we manufacture**, card 1 | *Fashion wear & apparel (grey joggers)* | Grey joggers with gloved hands |
| 12 | What we manufacture, card 2 | *Custom tote bag* | Lime "Curv" tote bag |
| 13 | What we manufacture, card 3 | *Exotic fabric rolls* | Fabric rolls on shelves |
| — | What we manufacture, card 4 | (missing) | It was cut off in the screenshot ("Mugs &…"). To add it, right-click card 3 → **Duplicate**, then edit the image and text |
| 14–17 | **Portfolio**, images 1–4 | *Portfolio: embroidered sweatshirt*, *beige cropped sweatshirt*, *white zip hoodie & trousers*, *next piece* | Portfolio photos. Duplicate a card to add more |
| 18 | **Full-service factory**, background | *Black tees on grey hangers* | Black tees on hangers |
| 19 | **Production ecosystem**, image | *Pattern cutting on the table* | Pattern-cutting photo |
| 20 | **Client video** | *Video: designer story* | Replace with a **Video** widget showing the designer with the microphone |

### About us
| # | Section | Stand-in label | Put here |
|---|---|---|---|
| 21 | **One table**, image | *The atelier / the team* | Founder, team or atelier photo |

### What we do
The 7 service sections (**01 Mockups … 07 Marketing**) reuse the service photos from the homepage rail. Each image is independent, so you can also give each service its own photo.

## Text to double-check

These lines were too small to read in the homepage screenshot, so I reconstructed them. Edit them in Elementor if they differ from the live site:

- **What we manufacture**: the three card descriptions under *Fashion wear & Apparel*, *Custom Tote Bags* and *Sustainable Exotic Fabric Collection*
- **Production ecosystem**: the six bullet points
- **Slow fashion**: the two paragraphs above "Start with 30 pieces."

Copy kept exactly as on modafie.io that you may want to fix:
- *What we do → Sampling* and *Bulk production*: "From €depends…" is missing the price.
- *Tech packs*: "Its important…" is missing the apostrophe.
- *Marketing*: "meta suits" (probably "Meta suite").

## Tip: change a photo everywhere at once

To replace a stand-in on every page in one go, open **Media Library**, click the stand-in, then use **Replace media** (needs a plugin such as *Enable Media Replace*). Every page that uses it updates.
