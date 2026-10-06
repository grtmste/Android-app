// Capture theme/modafie/screenshot.png (1200×900) from the running test site's homepage.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto(process.argv[2] || 'http://localhost:8080/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.screenshot({ path: new URL('../../theme/modafie/screenshot.png', import.meta.url).pathname });
await b.close();
