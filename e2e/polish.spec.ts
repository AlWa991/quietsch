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

test('logo reads QUIETSCH! in a sans word mark', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  const logo = page.locator('.q-title__logo');
  await expect(logo).toHaveText('QUIETSCH!');
  expect(await logo.evaluate((n) => getComputedStyle(n).fontFamily)).toContain('Inter');
  await page.waitForTimeout(400);
  // The logo wobbles forever, so clip a page screenshot instead of waiting for stability.
  const box = await logo.boundingBox();
  if (!box) throw new Error('logo not laid out');
  await page.screenshot({
    path: `${SHOT}/polish-logo.png`,
    clip: { x: box.x - 40, y: box.y - 30, width: box.width + 80, height: box.height + 60 },
  });
  expect(errors).toEqual([]);
});

test('first scream in the Wohnzimmer pops a big hand right next to the chicken', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await boot(page);
  await play(page);
  await page.evaluate(() => window.__game?.actions?.warp(23.5, 9.4));
  await page.waitForTimeout(400);
  await closeCards(page);
  await page.evaluate(() => window.__game?.actions?.scream(0.6));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOT}/polish-hand-scare.png` });
  const near = await page.evaluate(() => {
    const g = window.__game;
    const hands = g?.actions?.spooks().filter((s) => s.kind === 'hand') ?? [];
    const p = g?.pos ?? { x: 0, z: 0 };
    return Math.min(...hands.map((h) => Math.hypot(h.x - p.x, h.z - p.z)));
  });
  expect(near).toBeLessThan(2);
  expect(errors).toEqual([]);
});

test('Rudi wakes with a flicker and glows while driving', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await play(page);
  await page.evaluate(() => window.__game?.actions?.warp(45.3, 29.5));
  await page.waitForTimeout(400);
  await closeCards(page);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__game?.state.missions.jaeger.power === true);
  await page.waitForTimeout(500);
  await closeCards(page);
  // Still deaf during the wake-up flicker.
  expect(
    await page.evaluate(
      () => window.__game?.actions?.spooks().find((s) => s.kind === 'rudi')?.mode,
    ),
  ).toBe('wander');
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.__game?.actions?.warp(42.5, 24.5));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__game?.actions?.scream(0.8));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOT}/polish-rudi.png` });
  // Chasing, or already back off after a catch.
  expect(['chase', 'return']).toContain(
    await page.evaluate(
      () => window.__game?.actions?.spooks().find((s) => s.kind === 'rudi')?.mode,
    ),
  );
  expect(errors).toEqual([]);
});

test('a sock chasing into the Flur triggers the night-light hint once', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await play(page);
  await page.evaluate(() => window.__game?.actions?.warp(12.5, 21.5));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__game?.actions?.scream(1.5));
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.__game?.actions?.warp(18.5, 19.5));
  await page.locator('.q-story').waitFor({ state: 'visible', ...WAIT });
  await expect(page.locator('.q-story')).toContainText('Spuk im Licht anschreien');
  await closeCards(page);
  expect(await page.evaluate(() => window.__game?.state.flags['card:peaceHint'])).toBe(true);
  expect(errors).toEqual([]);
});

for (const id of ['A', 'B'] as const) {
  test(`ending ${id} shows the live scene behind a translucent panel`, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page);
    await play(page);
    await page.evaluate(() => window.__game?.actions?.gotoFinale());
    for (let i = 0; i < 10 && !(await page.locator('.q-choice').isVisible()); i++) {
      if (await page.locator('.q-story').isVisible()) await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
    await page.locator(`[data-testid="choice-${id}"]`).click();
    const ending = page.locator(`.q-ending[data-ending="${id}"]`);
    await ending.waitFor({ state: 'visible', ...WAIT });
    await expect(ending).toContainText('Federn');
    // Transparent overlay, panel at ~70 % opacity: the 3D scene stays visible.
    const alpha = await page
      .locator('.q-ending__panel')
      .evaluate((n) => getComputedStyle(n).backgroundColor);
    expect(alpha).toContain('0.7');
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${SHOT}/polish-ending-${id.toLowerCase()}.png` });
    expect(errors).toEqual([]);
  });
}
