import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('requestfailed', (req) => errors.push(`request failed: ${req.url()}`));
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`);
  });
  return errors;
}

test('boots without console errors and renders the 3D view', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.ready === true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screenshots/boot.png' });
  expect(errors).toEqual([]);
});

test('scream reveals the house (ring + outlines)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?debug=1');
  await page.waitForFunction(() => window.__game?.ready === true);
  // Let props load and the first frames settle.
  await page.waitForTimeout(1200);
  const before = await page.evaluate(() => window.__game?.state.feathers ?? -1);
  await page.evaluate(() => window.__game?.actions?.scream(1.0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e/screenshots/reveal.png' });
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => window.__game?.state.feathers ?? -1);
  expect(after).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});

for (const route of ['/?ui=1', '/?audio=1']) {
  test(`demo route ${route} loads without console errors`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(route);
    await page.waitForTimeout(800);
    await expect(page.locator('#ui')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
}
