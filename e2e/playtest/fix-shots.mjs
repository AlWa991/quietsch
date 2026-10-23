// Throwaway T13 screenshot harness: node e2e/playtest/fix-shots.mjs [base-url] [only]
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:4417';
const ONLY = process.argv[3] ?? '';
const OUT = 'e2e/screenshots';
const browser = await chromium.launch({
  args: process.env.GPU
    ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']
    : ['--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => m.type() === 'error' && logs.push(`[console] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.addInitScript(() => localStorage.clear());
await page.goto(`${BASE}/?debug=1`);
await page.waitForFunction(() => window.__game?.ready === true);
await page.locator('[data-testid="play"]').click();
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(300);
  if (!(await page.locator('.q-story').isVisible())) break;
  await page.keyboard.press('Enter');
}
await page.waitForFunction(() => window.__game?.phase === 'play' && !window.__game.modal);
await page.waitForTimeout(1500);
const act = (fn, arg) => page.evaluate(fn, arg);
const want = (n) => !ONLY || ONLY.split(',').includes(n);

if (want('chicken')) {
  // Walk a bit so the chicken faces sideways, then crop 3x around the screen centre.
  await act(() => window.__game.actions.warp(24.5, 22.5));
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  await page.waitForTimeout(700);
  await page.screenshot({
    path: `${OUT}/fix-chicken-closeup.png`,
    clip: { x: 640 - 213, y: 360 - 160, width: 427, height: 240 },
    scale: 'css',
  });
  // 1/3-width crop; upscale 3x afterwards: sips -z 720 1281 e2e/screenshots/fix-chicken-closeup.png
}

if (want('reveal')) {
  await act(() => window.__game.actions.warp(8.5, 21.5));
  await page.waitForTimeout(800);
  await act(() => window.__game.actions.scream(1.2));
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${OUT}/fix-reveal.png` });
}

if (want('lightning')) {
  await act(() => window.__game.actions.warp(20.5, 4.5));
  await page.waitForTimeout(1500);
  // Strike, then capture the first rendered frame after it (swiftshader frames take ~70 ms).
  await act(
    () =>
      new Promise((done) => {
        window.__game.actions.lightning();
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }),
  );
  await page.screenshot({ path: `${OUT}/fix-lightning.png` });
}

if (want('socke')) {
  // Stand still next to the sock: the chicken's glow reveals it without waking it.
  await act(() => window.__game.actions.warp(6.4, 16.2));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/fix-socke.png` });
}

if (want('rooms')) {
  for (const r of [0, 1, 2, 3]) {
    await act((r) => window.__game.actions.teleport(r), r);
    await page.waitForTimeout(700);
    await act(() => window.__game.actions.scream(1.5));
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${OUT}/../playtest/room-${r}.png` });
  }
}
console.log(logs.length ? logs.join('\n') : 'no console errors');
await browser.close();
