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

    // Switch to Neon Dawn track and verify level changes and URL updates
    await page.click('button:has-text("Neon Dawn")');
    await expect(page.locator('text=Course Selector')).not.toBeVisible();
    await expect(page.locator('text=Neon Dawn').first()).toBeVisible();
    await expect(page).toHaveURL(/track=trial-level-1/);

    // Switch to a random level and verify level changes
    await page.click('button:has-text("Courses")');
    await page.click('button:has-text("Random Track")');
    await expect(page.locator('text=Course Selector')).not.toBeVisible();
    await expect(page).toHaveURL(/track=seed-/);
  });

  test('opens profile modal, generates device sync code, and switches language to French', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => !!(window as any).__GHOSTROLL_SIM__);

    // Click profile / gamer tag button in HUD
    await page.click('button:has(svg.lucide-user)');
    await expect(page.locator('text=Player Profile & Device Sync')).toBeVisible();

    // Generate cross-device sync code
    await page.click('button:has-text("Generate Sync Code")');
    await expect(page.locator('text=Code expires in 10 min')).toBeVisible();

    // Switch language to French
    await page.click('button:has-text("Français")');
    await expect(page.locator('text=Profil Joueur & Synchronisation')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Fermer")');

    // Verify HUD reflects French translation
    await expect(page.locator('text=Chrono')).toBeVisible();
    await expect(page.locator('button:has-text("Pistes")')).toBeVisible();
  });
});


