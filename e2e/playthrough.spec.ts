import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

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

const SHOT = 'e2e/screenshots';
const WAIT = { timeout: 30_000 };

/** Fresh start: storage cleared once per test (not on reloads, so the save test can reload). */
async function boot(page: Page, clear = true): Promise<void> {
  if (clear) {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('__e2e_cleared')) {
        localStorage.clear();
        sessionStorage.setItem('__e2e_cleared', '1');
      }
    });
  }
  await page.goto('/?debug=1');
  await page.waitForFunction(() => window.__game?.ready === true, undefined, WAIT);
}

async function startPlay(page: Page): Promise<void> {
  await page.locator('.q-title').waitFor({ state: 'visible', ...WAIT });
  await page.locator('[data-testid="play"]').click();
  await page.locator('.q-story').waitFor({ state: 'visible', ...WAIT });
  await closeCards(page);
  await page.waitForFunction(
    () => window.__game?.phase === 'play' && !window.__game.modal,
    undefined,
    WAIT,
  );
}

/** Close story cards with Enter until none is visible. */
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

test('playthrough: shop, three missions, finale, ending A', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await page.locator('.q-title').waitFor({ state: 'visible', ...WAIT });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOT}/title.png` });

  await startPlay(page);

  await page.evaluate(() => window.__game?.actions?.giveFeathers(300));
  const before = await page.evaluate(() => window.__game?.state.feathers ?? -1);
  await page.evaluate(() => window.__game?.actions?.openShop());
  await page.locator('.q-shop').waitFor({ state: 'visible', ...WAIT });
  await page.locator('[data-testid="shop-item-lunge"]').click();
  await page.waitForFunction(
    () => (window.__game?.state.upgrades.lunge ?? 0) === 1,
    undefined,
    WAIT,
  );
  const after = await page.evaluate(() => window.__game?.state.feathers ?? -1);
  expect(before - after).toBe(80);
  await page.screenshot({ path: `${SHOT}/shop.png` });
  await page.locator('[data-testid="shop-close"]').click();
  await page.locator('.q-shop').waitFor({ state: 'hidden', ...WAIT });

  const missions = [
    ['echo', 'kinderzimmer', 1],
    ['jaeger', 'kueche', 2],
    ['uhr', 'wohnzimmer', 3],
  ] as const;
  // Mission 1 for real: scream in the Kinderzimmer, the answering box echoes, open it with E.
  const BOX_CELLS = [
    [13, 14],
    [4, 19],
    [10, 18],
    [13, 24],
    [3, 28],
    [8, 29],
  ] as const;
  await page.evaluate(() => window.__game?.actions?.teleport('kinderzimmer'));
  await page.waitForTimeout(600);
  await closeCards(page);
  await page.evaluate(() => window.__game?.actions?.warp(8.5, 21.5));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__game?.actions?.scream(1.5));
  await page.waitForTimeout(2500);
  const answer = await page.evaluate(() => window.__game?.state.missions.echo.answer ?? -1);
  expect(answer).toBeGreaterThanOrEqual(0);
  const cell = BOX_CELLS[answer];
  if (!cell) throw new Error(`no box cell for answer ${answer}`);
  await page.evaluate(([x, z]) => window.__game?.actions?.warp(x, z), [
    cell[0] + 0.5,
    cell[1] + 1.4,
  ] as [number, number]);
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__game?.state.locksOpened === 1, undefined, WAIT);
  await page.waitForTimeout(600);
  await closeCards(page);
  expect(await page.evaluate(() => window.__game?.state.locksOpened ?? -1)).toBe(1);
  await page.screenshot({ path: `${SHOT}/mission-1.png` });

  // Missions 2 and 3 stay on the shortcut.
  for (const [id, room, n] of missions.slice(1)) {
    await page.evaluate((r) => window.__game?.actions?.teleport(r), room);
    await page.waitForTimeout(600);
    await closeCards(page);
    await page.evaluate((m) => window.__game?.actions?.completeMission(m), id);
    await page.waitForTimeout(600);
    await closeCards(page);
    const locks = await page.evaluate(() => window.__game?.state.locksOpened ?? -1);
    expect(locks).toBe(n);
    await page.screenshot({ path: `${SHOT}/mission-${n}.png` });
  }

  await page.evaluate(() => window.__game?.actions?.gotoFinale());
  for (let i = 0; i < 10 && !(await page.locator('.q-choice').isVisible()); i++) {
    if (await page.locator('.q-story').isVisible()) await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
  await page.locator('.q-choice').waitFor({ state: 'visible', ...WAIT });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOT}/finale.png` });

  await page.locator('[data-testid="choice-A"]').click();
  await page.locator('.q-ending[data-ending="A"]').waitFor({ state: 'visible', ...WAIT });
  await expect(page.locator('.q-ending')).toContainText('Federn');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT}/ending-a.png` });

  expect(errors).toEqual([]);
});

test('playthrough: ending B and replay returns to title', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await startPlay(page);

  await page.evaluate(() => window.__game?.actions?.gotoFinale());
  for (let i = 0; i < 10 && !(await page.locator('.q-choice').isVisible()); i++) {
    if (await page.locator('.q-story').isVisible()) await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
  await page.locator('.q-choice').waitFor({ state: 'visible', ...WAIT });
  await page.locator('[data-testid="choice-B"]').click();
  await page.locator('.q-ending[data-ending="B"]').waitFor({ state: 'visible', ...WAIT });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT}/ending-b.png` });

  await page.locator('[data-testid="replay"]').click();
  await page.locator('.q-title').waitFor({ state: 'visible', ...WAIT });
  expect(errors).toEqual([]);
});

test('save: progress survives a reload via Weiter', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await startPlay(page);

  await page.evaluate(() => window.__game?.actions?.completeMission('echo'));
  await page.waitForFunction(() => window.__game?.state.locksOpened === 1, undefined, WAIT);
  await closeCards(page);
  // Give the autosave a moment to flush.
  await page.waitForTimeout(1500);

  await page.reload();
  await page.waitForFunction(() => window.__game?.ready === true, undefined, WAIT);
  await page.locator('[data-testid="continue"]').waitFor({ state: 'visible', ...WAIT });
  await page.locator('[data-testid="continue"]').click();
  await closeCards(page);
  await page.waitForFunction(() => window.__game?.phase === 'play', undefined, WAIT);
  const locks = await page.evaluate(() => window.__game?.state.locksOpened ?? -1);
  expect(locks).toBe(1);
  expect(errors).toEqual([]);
});
