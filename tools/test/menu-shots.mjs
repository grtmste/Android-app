#!/usr/bin/env node
// Screenshots of interactive header states: desktop mega menu, mobile off-canvas menu, scrolled header.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8080';
const OUT = new URL('../../screenshots/after/', import.meta.url).pathname;
const b = await chromium.launch();
const d = await b.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(BASE + '/', { waitUntil: 'networkidle' });
await d.locator('.mf-nav__menu > li.mf-mega').first().hover();
await d.waitForTimeout(700);
await d.screenshot({ path: OUT + 'ui-mega-menu-desktop.png' });
const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto(BASE + '/', { waitUntil: 'networkidle' });
await m.locator('[data-mf-offcanvas-open]').click();
await m.waitForTimeout(400);
await m.locator('.mf-mobile-menu .mf-submenu-toggle').first().click();
await m.waitForTimeout(600);
await m.screenshot({ path: OUT + 'ui-offcanvas-menu-mobile.png' });
await b.close();
console.log('ui-mega-menu-desktop.png ui-offcanvas-menu-mobile.png');
