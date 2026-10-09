import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WinRunFixture {
  levelId: string;
  simVersion: number;
  claimedTicks: number;
  finalHash: string;
  inputs: Array<{ tiltX: number; tiltZ: number }>;
}

test.describe('Cross-Browser Determinism Invariant', () => {
  const fixturePath = path.resolve(__dirname, '../packages/sim/test/winRun.json');
  const winFixture: WinRunFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  test('executes simulation inside browser engine and matches Node golden hash bit-for-bit', async ({ page }) => {
    await page.goto('/?track=trial-level-1');

    // Wait until simulation engine is mounted and loaded on window
    await page.waitForFunction(() => !!(window as any).__GHOSTROLL_SIM__);

    // Run the full golden run in the browser's JS runtime
    const browserResult = await page.evaluate(async (fixture) => {
      const simHost = (window as any).__GHOSTROLL_SIM__;
      if (!simHost) throw new Error('Simulation engine not found on window');

      await simHost.initPhysics();
      const sim = simHost.createSimulation(simHost.LEVEL_1);

      let finalState = sim.getState();
      for (const input of fixture.inputs) {
        finalState = sim.step(input);
      }

      sim.destroy();

      return {
        ticks: finalState.tick,
        status: finalState.status,
        hash: finalState.hash,
        position: finalState.ball.position,
      };
    }, winFixture);

    // Exact bit-for-bit assertion matching Node.js golden reference
    expect(browserResult.status).toBe('won');
    expect(browserResult.ticks).toBe(winFixture.claimedTicks);
    expect(browserResult.hash).toBe(winFixture.finalHash);

    // Verify UI components rendered
    const title = await page.locator('h1').textContent();
    expect(title).toContain('GHOSTROLL');

    // Submit golden replay to backend from browser
    const submitResult = await page.evaluate(async (fixture) => {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          magic: 'GRRP',
          formatVersion: 1,
          simVersion: fixture.simVersion,
          levelId: fixture.levelId,
          tickCount: fixture.claimedTicks,
          finalHash: fixture.finalHash,
          inputs: fixture.inputs,
        }),
      });
      return await res.json();
    }, winFixture);

    expect(submitResult.success).toBe(true);
    expect(submitResult.finalHash).toBe(winFixture.finalHash);

    // Verify Leaderboard button is clickable and opens modal
    await page.click('button:has-text("Leaderboard")');
    await expect(page.locator('text=Global Leaderboard')).toBeVisible();

    // Verify verified badge is present in leaderboard
    await expect(page.locator('text=Hash b72cbd05').first()).toBeVisible();
  });


  test('loads procedural daily track by default and opens course selector', async ({ page }) => {
    await page.goto('/');

    // Wait until simulation engine is loaded
    await page.waitForFunction(() => !!(window as any).__GHOSTROLL_SIM__);

    // Verify course selector opens
    await page.click('button:has-text("Courses")');
    await expect(page.locator('text=Course Selector')).toBeVisible();
    await expect(page.locator("text=Today's Daily Race")).toBeVisible();
    await expect(page.locator('text=Neon Dawn')).toBeVisible();
  });
});

