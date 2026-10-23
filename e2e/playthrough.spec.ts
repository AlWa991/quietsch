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
  // Retry: a sock alerted by the scream may knock the chicken away before E lands.
  for (let i = 0; i < 4; i++) {
    await page.evaluate(([x, z]) => window.__game?.actions?.warp(x, z), [
      cell[0] + 0.5,
      cell[1] + 1.4,
    ] as [number, number]);
    await page.waitForTimeout(400);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(500);
    if (await page.evaluate(() => window.__game?.state.locksOpened === 1)) break;
    await closeCards(page);
  }
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
  await expect(page.locator('.q-ending')).toContainText('Befriedete Spuks');
  await expect(page.locator('.q-ending')).toContainText('Geheimnis gefunden');
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

test('keller: hollow wall, stairs, twist 2 and Krone', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await startPlay(page);

  // A short squeak next to the hollow wall in the Flur: it knocks back.
  await page.evaluate(() => window.__game?.actions?.warp(19.5, 30.2));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__game?.actions?.scream(0.1));
  await page.waitForFunction(
    () => window.__game?.state.flags['keller:heard'] === true,
    undefined,
    WAIT,
  );
  await expect(page.locator('.q-toasts')).toContainText('Hohl.');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT}/hollow.png` });

  // E opens it; walk down the stairs for real (collision must let the chicken through).
  await page.keyboard.press('KeyE');
  await page.waitForFunction(
    () => window.__game?.state.flags['keller:open'] === true,
    undefined,
    WAIT,
  );
  await page.waitForTimeout(800);
  await page.keyboard.down('KeyS');
  await page.waitForFunction(() => (window.__game?.pos.z ?? 0) > 33, undefined, WAIT);
  await page.keyboard.up('KeyS');

  // Spendenkarton: twist 2 exactly once, Krone worn, +3 Geisterlichter.
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__game?.actions?.warp(21.5, 34.4));
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(500);
    if (await page.evaluate(() => window.__game?.state.flags['keller:box'] === true)) break;
  }
  await page.locator('.q-story').waitFor({ state: 'visible', ...WAIT });
  await expect(page.locator('.q-story')).toContainText('Du solltest weggegeben werden.');
  await closeCards(page);
  const st = await page.evaluate(() => {
    const s = window.__game?.state;
    return { hats: s?.hats, hat: s?.hat, lights: s?.ghostlights, card: s?.flags['card:twist2'] };
  });
  expect(st).toEqual({ hats: ['krone'], hat: 'krone', lights: 3, card: true });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(600);
  expect(await page.locator('.q-story').isVisible()).toBe(false);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT}/keller.png` });
  expect(errors).toEqual([]);
});

test('geisterlichter: a scream in lightning pacifies a sofa hand', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await startPlay(page);
  await page.evaluate(() => window.__game?.actions?.warp(19.5, 9.6));
  await page.waitForTimeout(500);
  await closeCards(page);
  await page.evaluate(() => window.__game?.actions?.lightning());
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__game?.actions?.scream(0.1));
  await page.waitForFunction(
    () => window.__game?.actions?.spooks().some((s) => s.kind === 'hand' && s.peaceful) === true,
    undefined,
    WAIT,
  );
  await expect(page.locator('.q-toasts')).toContainText('Friedlich');
  // It follows the chicken to the Korb and pays a Geisterlicht.
  await page.evaluate(() => window.__game?.actions?.teleport('flur'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__game?.actions?.warp(23.5, 27.4));
  await page.waitForFunction(() => (window.__game?.state.ghostlights ?? 0) >= 1, undefined, WAIT);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOT}/peaceful.png` });
  expect(errors).toEqual([]);
});

test('köder: bought in the shop, Shift throws, a sock goes for the ball', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await startPlay(page);
  await page.evaluate(() => window.__game?.actions?.giveFeathers(200));
  await page.evaluate(() => window.__game?.actions?.openShop());
  await page.locator('[data-testid="shop-item-koeder"]').click();
  await page.waitForFunction(() => (window.__game?.state.upgrades.koeder ?? 0) === 1);
  await page.locator('[data-testid="shop-close"]').click();
  await expect(page.locator('.q-bait')).toBeVisible();

  // Kinderzimmer, facing west: the ball lands ~5 m to the left, near the first sock.
  await page.evaluate(() => window.__game?.actions?.warp(11.5, 17.5));
  await page.waitForTimeout(500);
  await closeCards(page);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(150);
  await page.keyboard.up('KeyA');
  await page.waitForTimeout(400);
  await page.keyboard.press('Shift');
  await page.waitForFunction(
    () => (window.__game?.actions?.bait().squeaks ?? 0) >= 1,
    undefined,
    WAIT,
  );
  await expect(page.locator('.q-bait')).not.toHaveClass(/q-bait--ready/);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOT}/koeder.png` });
  await page.waitForFunction(
    () => {
      const g = window.__game?.actions;
      const b = g?.bait();
      if (!g || !b) return false;
      return g
        .spooks()
        .some((s) => s.kind === 'socke' && Math.hypot(s.targetX - b.x, s.targetZ - b.z) < 0.3);
    },
    undefined,
    WAIT,
  );
  expect(errors).toEqual([]);
});

test('dachboden: 7 stars open the ladder, Bello card, Halsband', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await startPlay(page);

  // Locked below 7 stars.
  await page.evaluate(() => window.__game?.actions?.warp(27.5, 13.6));
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.q-toasts')).toContainText('Die Leiter ist zu hoch.');
  expect(await page.evaluate(() => window.__game?.pos.x ?? 0)).toBeLessThan(40);

  for (const id of ['echo', 'jaeger', 'uhr'] as const) {
    await page.evaluate((m) => window.__game?.actions?.completeMission(m), id);
    await page.waitForTimeout(200);
  }
  await closeCards(page);
  await page.evaluate(() => window.__game?.actions?.warp(27.5, 13.6));
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => (window.__game?.pos.x ?? 0) > 49, undefined, WAIT);

  // Bellos Decke: story card. Halsband: worn at once, HUD timer.
  await page.evaluate(() => window.__game?.actions?.warp(51.5, 4.6));
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await page.locator('.q-story').waitFor({ state: 'visible', ...WAIT });
  await expect(page.locator('.q-story')).toContainText('Bello war hier');
  await closeCards(page);
  await page.evaluate(() => window.__game?.actions?.warp(54.5, 4.6));
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__game?.state.flags['attic:collar'] === true);
  await expect(page.locator('.q-collar')).toContainText('Halsband');
  await expect(page.locator('.q-collar')).toHaveClass(/q-collar--on/);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOT}/dachboden.png` });
  expect(errors).toEqual([]);
});
