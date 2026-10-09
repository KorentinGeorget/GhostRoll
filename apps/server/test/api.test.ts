import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app.js';
import { createTestDb, DB } from '../src/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WinRunFixture {
  levelId: string;
  simVersion: number;
  claimedTicks: number;
  finalHash: string;
  inputs: Array<{ tiltX: number; tiltZ: number }>;
}

describe('Server API & Replay Verification Pipeline', () => {
  let app: FastifyInstance;
  let db: DB;
  let winFixture: WinRunFixture;

  beforeAll(async () => {
    db = await createTestDb();
    app = await buildApp({ db });

    const fixturePath = path.resolve(__dirname, '../../../packages/sim/test/winRun.json');
    winFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 ok', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/me provisions guest session and signed cookie', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.displayName).toMatch(/[A-Za-z]+ #[0-9]{4}/);

    const cookies = res.cookies;
    const tokenCookie = cookies.find((c) => c.name === 'gr_token');
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie?.value).toBeDefined();
  });

  it('PATCH /api/me updates player display name', async () => {
    // 1. Get user and cookie
    const meRes = await app.inject({ method: 'GET', url: '/api/me' });
    const tokenCookie = meRes.cookies.find((c) => c.name === 'gr_token')!;

    // 2. Patch name
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/me',
      cookies: { gr_token: tokenCookie.value },
      payload: { displayName: 'GhostChampion' },
    });

    expect(patchRes.statusCode).toBe(200);
    const body = patchRes.json();
    expect(body.displayName).toBe('GhostChampion');

    // 3. Confirm GET /api/me returns updated name
    const verifyRes = await app.inject({
      method: 'GET',
      url: '/api/me',
      cookies: { gr_token: tokenCookie.value },
    });
    expect(verifyRes.json().displayName).toBe('GhostChampion');
  });

  it('POST /api/me/sync-code and /api/me/claim-code syncs account across devices', async () => {
    // Device A: user A
    const devARes = await app.inject({ method: 'GET', url: '/api/me' });
    const userA = devARes.json();
    const tokenA = devARes.cookies.find((c) => c.name === 'gr_token')!.value;

    // Device A generates sync code
    const codeRes = await app.inject({
      method: 'POST',
      url: '/api/me/sync-code',
      cookies: { gr_token: tokenA },
    });
    expect(codeRes.statusCode).toBe(200);
    const { code } = codeRes.json();
    expect(code).toHaveLength(6);

    // Device B: user B
    const devBRes = await app.inject({ method: 'GET', url: '/api/me' });
    const tokenB = devBRes.cookies.find((c) => c.name === 'gr_token')!.value;

    // Device B claims code
    const claimRes = await app.inject({
      method: 'POST',
      url: '/api/me/claim-code',
      cookies: { gr_token: tokenB },
      payload: { code },
    });
    expect(claimRes.statusCode).toBe(200);
    const claimBody = claimRes.json();
    expect(claimBody.success).toBe(true);
    expect(claimBody.user.id).toBe(userA.id);

    // Device B cookie now belongs to user A
    const claimedCookie = claimRes.cookies.find((c) => c.name === 'gr_token')!;
    const devBAfter = await app.inject({
      method: 'GET',
      url: '/api/me',
      cookies: { gr_token: claimedCookie.value },
    });
    expect(devBAfter.json().id).toBe(userA.id);
  });

  it('POST /api/runs rejects invalid / non-winning replay with 422', async () => {

    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        levelId: winFixture.levelId,
        simVersion: winFixture.simVersion,
        claimedTicks: 50,
        finalHash: 'deadbeef',
        inputs: [{ tiltX: 0, tiltZ: 50 }],
      },
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('RUN_REJECTED');
    expect(body.reason).toContain('GOAL_NOT_REACHED');
  });

  it('POST /api/runs rejects tampered state hash on legitimate path with 422', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        ...winFixture,
        finalHash: '00000000', // tampered hash
      },
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('RUN_REJECTED');
    expect(body.reason).toContain('HASH_MISMATCH');
  });

  it('POST /api/runs verifies legitimate winning replay and records verified run', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: winFixture,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.runId).toBeDefined();
    expect(body.verifiedTicks).toBe(winFixture.claimedTicks);
    expect(body.finalHash).toBe(winFixture.finalHash);
  });

  it('GET /api/levels/:levelId/leaderboard returns verified run and ghost trajectory', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/levels/${winFixture.levelId}/leaderboard`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.levelId).toBe(winFixture.levelId);
    expect(body.totalEntries).toBeGreaterThanOrEqual(1);

    const topRun = body.leaderboard[0];
    expect(topRun.rank).toBe(1);
    expect(topRun.ticks).toBe(winFixture.claimedTicks);
    expect(topRun.finalHash).toBe(winFixture.finalHash);
    expect(topRun.ghostSamples).toBeInstanceOf(Array);
    expect(topRun.ghostSamples.length).toBeGreaterThan(10);
  });

  it('GET /api/levels/daily returns today procedural level and palette', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/levels/daily',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.date).toBeDefined();
    expect(body.level.id).toBe(`daily-${body.date}`);
    expect(body.level.colliders.length).toBeGreaterThan(5);
    expect(body.palette.name).toBeDefined();
    expect(body.palette.trackPrimary).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('GET /api/levels/archive returns past 7 daily tracks', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/levels/archive',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.archive).toBeInstanceOf(Array);
    expect(body.archive.length).toBe(7);
    expect(body.archive[0].levelId).toMatch(/^daily-[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
  });
});
