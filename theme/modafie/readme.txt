=== Modafie ===
Contributors: modafie
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A lightweight, Elementor-first theme for Modafie's offer-style site (no shop), with a one-click demo importer.

== Description ==

Modafie is a fast, Elementor-compatible theme: bold condensed headings, a monochrome palette with one brand accent, a sticky hide-on-scroll header with mega menu and off-canvas mobile menu, and scroll animations you switch on with CSS classes (mf-reveal, mf-hero, mf-parallax, mf-parallax-bg, mf-marquee, mf-zoom, mf-carousel, mf-tile, mf-stagger) or from Advanced → Modafie Motion in any Elementor widget.

After activation go to Appearance → Import Modafie Demo and click "Import Modafie demo content". The importer installs/activates Elementor (free) if needed, imports all media, creates every page as editable Elementor content, saves each section as a reusable Elementor template, builds the menus, applies the Elementor Kit (global colours and fonts) and regenerates Elementor CSS. It is safe to run again.

Colours and fonts are edited globally in Elementor → Site Settings → Global Colors / Global Fonts. Header options live in Appearance → Customize → Modafie Header & Footer.

See README.md in the theme folder for the full guide.

== Installation ==

1. Appearance → Themes → Add New → Upload Theme → choose modafie-theme.zip → Install Now → Activate.
2. Click "Import Modafie demo content" in the notice (or Appearance → Import Modafie Demo).

== Frequently Asked Questions ==

= Do I need Elementor Pro? =
No. Everything uses free Elementor widgets plus two theme widgets (Modafie Form, Modafie Marquee).

= How do the WhatsApp buttons work? =
They all link to /whatsapp/. Set your number in Appearance → Customize → Modafie Header & Footer → WhatsApp number and every button opens that chat. Until it is set, /whatsapp/ opens the Get an offer page.

= Where do form submissions go? =
They are e-mailed to the address set in the widget (default: the site admin) and listed under Appearance → Form submissions.

== Changelog ==

= 1.1.0 =
* Content from modafie.io (Home, About us, What we do, FAQ), new Get an offer page, WhatsApp/Instagram links, brand orange accent. No shop.
* Re-running the import updates pages from older demo builds and trashes pages that are no longer part of the demo.

= 1.0.0 =
* Initial release.

== Copyright ==

Modafie WordPress Theme, (C) 2026 Modafie.
Modafie is distributed under the terms of the GNU GPL v2 or later.

This theme bundles the following third-party resources:

Inter, Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)
License: SIL Open Font License, 1.1, https://openfontlicense.org

Barlow Condensed, Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow)
License: SIL Open Font License, 1.1, https://openfontlicense.org

Icons in inc/template-tags.php and demo images are original works created for this theme, GPLv2 or later.
