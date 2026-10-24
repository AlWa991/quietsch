import { expect, test, type Page } from '@playwright/test';

// P5 polish: screenshots for the logo, the scripted hand scare and Rudi's readability.

test.describe.configure({ timeout: 120_000 });

const SHOT = 'e2e/screenshots';
const WAIT = { timeout: 30_000 };

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function boot(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/?debug=1');
  await page.waitForFunction(() => window.__game?.ready === true, undefined, WAIT);
  await page.locator('.q-title').waitFor({ state: 'visible', ...WAIT });
}

async function closeCards(page: Page): Promise<void> {
  for (let i = 0; i < 8; i++) {
    if (!(await page.locator('.q-story').isVisible())) {
      await page.waitForTimeout(300);
      if (!(await page.locator('.q-story').isVisible())) return;
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
}

async function play(page: Page): Promise<void> {
  await page.locator('[data-testid="play"]').click();
  await page.locator('.q-story').waitFor({ state: 'visible', ...WAIT });
  await closeCards(page);
  await page.waitForFunction(() => window.__game?.phase === 'play' && !window.__game.modal);
}

test('P7: three pecks defeat a sock and its feathers are collected', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await play(page);
  const before = await page.evaluate(() => window.__game?.state.feathers ?? 0);
  await page.evaluate(() => {
    const a = window.__game?.actions;
    const s = a?.spooks().find((x) => x.kind === 'socke' && !x.gone);
    if (!a || !s) return;
    a.warp(s.x - 1, s.z);
    a.faceTo(s.x, s.z);
  });
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.__game?.actions?.peck());
    await page.waitForTimeout(i === 1 ? 120 : 280);
    if (i === 1) await page.screenshot({ path: `${SHOT}/p7-combat.png` });
    if ((await page.evaluate(() => window.__game?.actions?.kills() ?? 0)) > 0) break;
  }
  await page.waitForFunction(() => (window.__game?.actions?.kills() ?? 0) >= 1, undefined, {
    timeout: 10_000,
  });
  await page.waitForFunction((b) => (window.__game?.state.feathers ?? 0) > b, before, {
    timeout: 10_000,
  });
  expect(errors).toEqual([]);
});

test('P7: fridge power-on shows the Rudi jumpscare', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await play(page);
  await page.evaluate(() => window.__game?.actions?.holdScares(4000));
  await page.evaluate(() => window.__game?.actions?.warp(45.3, 29.5));
  await page.waitForTimeout(400);
  await closeCards(page);
  await page.keyboard.press('KeyE');
  await page.waitForSelector('.js-overlay.js-on', { timeout: 10_000 });
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = 200;
    }
  });
  // The full-screen SVG filters take a moment to rasterise in software rendering.
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOT}/p7-jumpscare-rudi.png` });
  expect(await page.evaluate(() => window.__game?.actions?.scares() ?? 0)).toBe(1);
  expect(errors).toEqual([]);
});
