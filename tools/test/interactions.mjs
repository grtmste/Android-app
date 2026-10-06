#!/usr/bin/env node
/**
 * Behaviour checks on the imported site: header hide/show + shrink, off-canvas menu, mega menu,
 * carousel buttons, contact-form AJAX submission, prefers-reduced-motion.
 *
 *   node test/interactions.mjs [--base http://localhost:8080]
 */
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const BASE = (argv[argv.indexOf('--base') + 1] && argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'http://localhost:8080').replace(/\/$/, '');
const browser = await chromium.launch();
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); if (!ok) failures++; };
const instant = (y) => window.scrollTo({ top: y, behavior: 'instant' });

// Desktop: header + carousel + mega menu
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const header = page.locator('[data-mf-header]');
  await page.evaluate(instant, 1500); await page.waitForTimeout(150); await page.evaluate(instant, 1900); await page.waitForTimeout(500);
  const hidden = await header.evaluate((h) => h.classList.contains('is-hidden') && h.classList.contains('is-scrolled'));
  check('header hides (and shrinks) when scrolling down', hidden);
  await page.evaluate(instant, 1700); await page.waitForTimeout(500);
  check('header reappears when scrolling up', !(await header.evaluate((h) => h.classList.contains('is-hidden'))));
  await page.evaluate(instant, 0); await page.waitForTimeout(300);

  const rail = page.locator('.mf-carousel').first();
  await rail.scrollIntoViewIfNeeded();
  const before = await rail.evaluate((r) => r.scrollLeft);
  await page.locator('.mf-carousel-btn[data-dir="1"]').first().click();
  await page.waitForTimeout(900);
  const after = await rail.evaluate((r) => r.scrollLeft);
  check('carousel "next" scrolls one card', after > before, `${before} → ${after}`);

  const mega = page.locator('.mf-nav__menu > li.mf-mega').first();
  if (await mega.count()) {
    await page.evaluate(instant, 0);
    await mega.hover(); await page.waitForTimeout(500);
    check('mega menu panel opens on hover', await mega.locator('.mf-mega-panel').evaluate((p) => getComputedStyle(p).visibility === 'visible'));
  }
  const marquee = await page.locator('.mf-marquee__track').first().evaluate((t) => getComputedStyle(t).animationName);
  check('marquee animates', marquee === 'mf-marquee', marquee);
  await page.close();
}

// Mobile: off-canvas menu
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.locator('[data-mf-offcanvas-open]').click();
  await page.waitForTimeout(600);
  const open = await page.locator('[data-mf-offcanvas]').evaluate((o) => o.classList.contains('is-open') && document.documentElement.classList.contains('mf-lock'));
  check('mobile burger opens the off-canvas menu (and locks scroll)', open);
  const items = await page.locator('.mf-mobile-menu > li').count();
  check('off-canvas lists the primary menu', items >= 3, `${items} items`);
  const toggle = page.locator('.mf-mobile-menu .mf-submenu-toggle').first();
  if (await toggle.count()) { await toggle.click(); check('submenu toggle expands', (await toggle.getAttribute('aria-expanded')) === 'true'); }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  check('Escape closes the off-canvas menu', !(await page.locator('[data-mf-offcanvas]').evaluate((o) => o.classList.contains('is-open'))));
  await page.close();
}

// Offer form (AJAX)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/get-an-offer/`, { waitUntil: 'networkidle' });
  const form = page.locator('[data-mf-form]').first();
  await form.locator('button[type=submit]').click();
  await page.waitForTimeout(300);
  check('empty required fields are flagged', (await form.locator('[aria-invalid="true"]').count()) > 0);
  await page.waitForTimeout(2200); // honeypot timer (2 s)
  const fields = form.locator('input.mf-input, textarea.mf-input');
  for (let i = 0; i < await fields.count(); i++) {
    const f = fields.nth(i);
    const type = await f.getAttribute('type');
    await f.fill(type === 'email' ? 'test@example.com' : type === 'tel' ? '+372 5555 5555' : 'Playwright test message');
  }
  const selects = form.locator('select.mf-input');
  for (let i = 0; i < await selects.count(); i++) await selects.nth(i).selectOption({ index: 1 });
  const boxes = form.locator('input[type=checkbox]');
  for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
  await form.locator('button[type=submit]').click();
  await page.waitForSelector('.mf-form__status.is-success, .mf-form__status.is-error', { timeout: 15000 });
  const status = await form.locator('.mf-form__status').innerText();
  check('offer form submits via AJAX', await form.locator('.mf-form__status.is-success').count() > 0, status);
  await page.close();
}

// Reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({
    split: document.querySelectorAll('.mf-line').length,
    marquee: getComputedStyle(document.querySelector('.mf-marquee__track')).animationName,
    h1: getComputedStyle(document.querySelector('h1')).opacity,
    layer: document.querySelector('.mf-hero > .mf-bg-layer') ? getComputedStyle(document.querySelector('.mf-hero > .mf-bg-layer')).animationName : 'none',
  }));
  check('reduced motion: no line-split reveal, heading visible', r.split === 0 && r.h1 === '1', JSON.stringify(r));
  check('reduced motion: marquee and hero zoom stopped', r.marquee === 'none' && r.layer === 'none');
  await ctx.close();
}

await browser.close();
console.log(failures ? `${failures} check(s) failed` : 'All interaction checks passed');
process.exit(failures ? 1 : 0);
