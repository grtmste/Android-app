#!/usr/bin/env node
// Renders theme/modafie/screenshot.png (1200x900, required by WordPress) from the imported homepage.
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8080';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
await p.goto(base + '/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.screenshot({ path: new URL('../../theme/modafie/screenshot.png', import.meta.url).pathname });
await b.close();
console.log('theme/modafie/screenshot.png');
