import { test, expect } from '@playwright/test';

const SHOT = 'e2e/screenshots';
const MARKS = [30, 400, 1200, 1700, 2300];

test('jumpscare timing: face instant at 30 ms, held to 1700 ms, dark at 2300 ms', async ({
  page,
}) => {
  await page.goto('/?scare=1&debug=1');
  await page.waitForSelector('#scare-teddy');
  // let the boot warm-up finish
  await page.waitForFunction(() => !document.querySelector('.js-overlay.js-warm'));
  // In-page sampler (software rendering makes screenshots slow, so assert on samples, not on shots).
  const t0 = await page.evaluate(() => {
    const w = window as unknown as { __samples: { t: number; face: boolean; op: number }[] };
    w.__samples = [];
    const t = performance.now();
    void window.__scareDemo?.show('teddy', true);
    const tick = (): void => {
      const o = document.querySelector<HTMLElement>('.js-overlay');
      const f = document.querySelector<HTMLElement>('.js-face.js-show');
      w.__samples.push({
        t: performance.now() - t,
        face: !!f && getComputedStyle(f).visibility === 'visible',
        op: o ? Number(getComputedStyle(o).opacity) : -1,
      });
      if (performance.now() - t < 2600) requestAnimationFrame(tick);
    };
    tick();
    return t;
  });
  await page.waitForTimeout(2800); // sampler run finishes, dark beat ends
  // Screenshots are slow under software rendering: one fresh trigger per mark.
  for (const ms of MARKS) {
    await page.waitForFunction(() => !document.querySelector('.js-overlay.js-dark'), null, {
      timeout: 10_000,
    });
    const t = await page.evaluate(() => {
      void window.__scareDemo?.show('teddy', true);
      return performance.now();
    });
    const wait = t + ms - (await page.evaluate(() => performance.now()));
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${SHOT}/scare-timing-${ms}.png` });
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(500);
  const samples = await page.evaluate(
    () =>
      (window as unknown as { __samples: { t: number; face: boolean; op: number }[] }).__samples,
  );
  const at = (ms: number) => samples.find((s) => s.t >= ms);
  expect(samples[0]?.t ?? 999, 'first frame after trigger').toBeLessThan(50);
  expect(samples[0]?.face, 'face on first frame').toBe(true);
  for (const ms of [400, 1200, 1700]) {
    expect(at(ms)?.face, `face at ${ms} ms`).toBe(true);
    expect(at(ms)?.op, `overlay at ${ms} ms`).toBeGreaterThan(0.9);
  }
  expect(at(2300)?.face, 'face gone at 2300 ms').toBe(false);
  expect(at(2300)?.op, 'dark beat at 2300 ms').toBe(1);
});
