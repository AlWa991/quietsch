import { expect, test } from '@playwright/test';

test('boots without console errors and renders the 3D view', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.waitForFunction(() => window.__game?.ready === true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screenshots/boot.png' });

  expect(errors).toEqual([]);
});
