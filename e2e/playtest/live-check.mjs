import { chromium } from '@playwright/test';
const URL = process.argv[2];
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const bad = [];
const reqs = [];
page.on('console', (m) => m.type() === 'error' && bad.push('console: ' + m.text()));
page.on('pageerror', (e) => bad.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => bad.push('failed: ' + r.url()));
page.on('response', (r) => {
  reqs.push(r.status() + ' ' + r.url());
  if (r.status() >= 400) bad.push(r.status() + ' ' + r.url());
});
await page.goto(URL);
await page.waitForFunction(() => window.__game?.ready === true, undefined, { timeout: 60000 });
await page.locator('.q-title').waitFor({ state: 'visible', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'e2e/screenshots/live-title.png' });
console.log('requests', reqs.length, 'glb/font:', reqs.filter((r) => /glb|woff|ttf/.test(r)).length);
console.log('problems', JSON.stringify(bad));
await browser.close();
