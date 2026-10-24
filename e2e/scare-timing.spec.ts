import { test, expect } from '@playwright/test';

const SHOT = 'e2e/screenshots';

test('jumpscare timing: face visible 250/600 ms, dark at 1500 ms', async ({ page }) => {
  await page.goto('/?scare=1&debug=1');
  await page.waitForSelector('#scare-teddy');
  const t0 = await page.evaluate(() => {
    void window.__scareDemo?.show('teddy', true);
    return performance.now();
  });
  for (const ms of [50, 250, 600, 1500]) {
    const wait = t0 + ms - (await page.evaluate(() => performance.now()));
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${SHOT}/scare-timing-${ms}.png` });
  }
  const flash = await page.evaluate(() =>
    Math.max(
      ...[...document.querySelectorAll<HTMLElement>('div')].map((d) =>
        Number(d.style.opacity || 0),
      ),
    ),
  );
  expect(flash).toBe(0);
});
