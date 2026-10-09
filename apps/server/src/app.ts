import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import crypto from 'node:crypto';
import { eq, and, sql, asc, gt } from 'drizzle-orm';
import { DB, getDb, runs, users, syncCodes } from './db/index.js';

import { getOrCreateGuestUser } from './services/auth.service.js';
import { validateReplay } from './services/validation.service.js';
import { TICKS_PER_SECOND } from '@ghostroll/shared';
import { LEVEL_1, generateDailyLevel, generateDailyPalette } from '@ghostroll/sim';

export interface AppOptions {
  db?: DB;
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  const db = opts.db ?? (await getDb());

  // Setup CORS
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost and any local network IP for mobile testing
      cb(null, true);
    },
    credentials: true,
  });

  // Setup Cookie
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'ghostroll-dev-secret-key-32-chars-min',
    parseOptions: {},
  });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Daily level
  app.get('/api/levels/daily', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { level, palette } = generateDailyLevel(today);
    return { date: today, level, palette };
  });

  // Daily archive (past 7 days)
  app.get('/api/levels/archive', async () => {
    const archive = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const { level, palette } = generateDailyLevel(dateStr);
      archive.push({
        date: dateStr,
        levelId: level.id,
        name: level.name,
        palette,
      });
    }
    return { archive };
  });

  // Level definition by ID
  app.get<{
    Params: { levelId: string };
  }>('/api/levels/:levelId', async (request, reply) => {
    const { levelId } = request.params;
    if (levelId === LEVEL_1.id || levelId === 'trial-level-1') {
      return { level: LEVEL_1, palette: generateDailyPalette('trial01') };
    }

    if (levelId.startsWith('daily-')) {
      const seed = levelId.replace('daily-', '');
      return generateDailyLevel(seed);
    }
    return reply.status(404).send({ error: 'LEVEL_NOT_FOUND' });
  });

  // Auth / Current user
  app.get('/api/me', async (request, reply) => {
    const rawCookie = request.cookies['gr_token'];
    const { user, token } = await getOrCreateGuestUser(db, rawCookie);

    if (!rawCookie || rawCookie !== token) {
      reply.setCookie('gr_token', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 365 * 24 * 3600, // 1 year
      });
    }

    return {
      id: user.id,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };
  });

  // Update Display Name
  app.patch<{
    Body: { displayName?: string };
  }>('/api/me', async (request, reply) => {
    const rawCookie = request.cookies['gr_token'];
    const { user } = await getOrCreateGuestUser(db, rawCookie);

    const { displayName } = request.body || {};
    if (!displayName || typeof displayName !== 'string') {
      return reply.status(400).send({ error: 'INVALID_NAME', message: 'Display name is required' });
    }

    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      return reply.status(400).send({ error: 'INVALID_LENGTH', message: 'Name must be 2-24 characters' });
    }

    await db.update(users).set({ displayName: trimmed }).where(eq(users.id, user.id));

    return {
      id: user.id,
      displayName: trimmed,
      createdAt: user.createdAt,
    };
  });

  // Generate 6-char device sync code (10-minute expiry)
  app.post('/api/me/sync-code', async (request, reply) => {
    const rawCookie = request.cookies['gr_token'];
    const { user } = await getOrCreateGuestUser(db, rawCookie);

    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(syncCodes).values({
      code,
      userId: user.id,
      expiresAt,
    });

    return {
      code,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: 600,
    };
  });

  // Claim sync code to link account across devices
  app.post<{
    Body: { code: string };
  }>('/api/me/claim-code', async (request, reply) => {
    const rawCookie = request.cookies['gr_token'];
    const { user: currentUser } = await getOrCreateGuestUser(db, rawCookie);

    const { code } = request.body || {};
    if (!code || typeof code !== 'string') {
      return reply.status(400).send({ error: 'INVALID_CODE', message: 'Code is required' });
    }

    const formattedCode = code.trim().toUpperCase();

    const existingCodes = await db
      .select()
      .from(syncCodes)
      .where(and(eq(syncCodes.code, formattedCode), gt(syncCodes.expiresAt, new Date())))
      .limit(1);

    if (existingCodes.length === 0) {
      return reply.status(404).send({ error: 'CODE_NOT_FOUND', message: 'Invalid or expired sync code' });
    }

    const activeCode = existingCodes[0];

    if (activeCode.userId === currentUser.id) {
      return reply.status(400).send({ error: 'SAME_USER', message: 'Sync code belongs to current user' });
    }

    const targetUsers = await db.select().from(users).where(eq(users.id, activeCode.userId)).limit(1);
    if (targetUsers.length === 0) {
      return reply.status(404).send({ error: 'USER_NOT_FOUND' });
    }

    const targetUser = targetUsers[0];

    // Merge any runs from currentUser into targetUser
    await db.update(runs).set({ userId: targetUser.id }).where(eq(runs.userId, currentUser.id));

    // Delete used sync code
    await db.delete(syncCodes).where(eq(syncCodes.code, formattedCode));

    // Sign targetUser token and set cookie
    reply.setCookie('gr_token', targetUser.guestToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 3600,
    });

    return {
      success: true,
      user: {
        id: targetUser.id,
        displayName: targetUser.displayName,
        createdAt: targetUser.createdAt,
      },
    };
  });


  // Run Submission & Verification
  app.post<{
    Body: {
      levelId: string;
      simVersion: number;
      claimedTicks: number;
      finalHash: string;
      inputs: Array<{ tiltX: number; tiltZ: number }>;
    };
  }>('/api/runs', async (request, reply) => {
    const rawCookie = request.cookies['gr_token'];
    const { user, token } = await getOrCreateGuestUser(db, rawCookie);

    if (!rawCookie) {
      reply.setCookie('gr_token', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 365 * 24 * 3600,
      });
    }

    const body = request.body;
    if (!body || !body.levelId || !body.inputs) {
      return reply.status(400).send({ error: 'INVALID_PAYLOAD' });
    }

    const runId = crypto.randomUUID();
    const claimedTicks = body.claimedTicks ?? (body as any).tickCount;

    if (claimedTicks === undefined) {
      return reply.status(400).send({ error: 'MISSING_TICKS' });
    }

    // Perform deterministic re-simulation on the server
    const validation = await validateReplay({
      levelId: body.levelId,
      simVersion: body.simVersion,
      claimedTicks,
      finalHash: body.finalHash,
      inputs: body.inputs,
    });


    if (!validation.verified) {
      // Record rejected run for audit / anti-cheat telemetry
      await db.insert(runs).values({
        id: runId,
        userId: user.id,
        levelId: body.levelId,
        simVersion: body.simVersion,
        status: 'rejected',
        rejectionReason: validation.rejectionReason,
        claimedTicks: claimedTicks,
        finalHash: body.finalHash,
        inputs: JSON.stringify(body.inputs),
      });

      return reply.status(422).send({
        success: false,
        error: 'RUN_REJECTED',
        reason: validation.rejectionReason,
      });
    }

    // Valid verified run!
    await db.insert(runs).values({
      id: runId,
      userId: user.id,
      levelId: body.levelId,
      simVersion: body.simVersion,
      status: 'verified',
      claimedTicks: claimedTicks,
      verifiedTicks: validation.verifiedTicks,
      finalHash: validation.finalHash!,
      inputs: JSON.stringify(body.inputs),
      ghostSamples: JSON.stringify(validation.ghostSamples),
    });


    return reply.status(200).send({
      success: true,
      runId,
      verifiedTicks: validation.verifiedTicks,
      finalHash: validation.finalHash,
      timeSeconds: (validation.verifiedTicks! / TICKS_PER_SECOND).toFixed(3),
    });
  });

  // Leaderboard
  app.get<{
    Params: { levelId: string };
  }>('/api/levels/:levelId/leaderboard', async (request, reply) => {
    const { levelId } = request.params;

    // Get verified runs joined with users, selecting best time per user
    const rows = await db
      .select({
        runId: runs.id,
        userId: users.id,
        displayName: users.displayName,
        verifiedTicks: runs.verifiedTicks,
        finalHash: runs.finalHash,
        ghostSamples: runs.ghostSamples,
        createdAt: runs.createdAt,
      })
      .from(runs)
      .innerJoin(users, eq(runs.userId, users.id))
      .where(and(eq(runs.levelId, levelId), eq(runs.status, 'verified')))
      .orderBy(asc(runs.verifiedTicks))
      .limit(50);

    // Filter distinct by user to keep each player's single best run
    const seenUsers = new Set<string>();
    const bestPerUser = [];

    for (const r of rows) {
      if (!seenUsers.has(r.userId)) {
        seenUsers.add(r.userId);
        bestPerUser.push(r);
      }
    }

    // Assign rank and attach ghost samples for top 5
    const leaderboard = bestPerUser.slice(0, 20).map((r, index) => {
      const isTop5 = index < 5;
      return {
        rank: index + 1,
        runId: r.runId,
        displayName: r.displayName,
        ticks: r.verifiedTicks,
        timeSeconds: (r.verifiedTicks! / TICKS_PER_SECOND),
        finalHash: r.finalHash,
        date: r.createdAt,
        ghostSamples: isTop5 && r.ghostSamples ? JSON.parse(r.ghostSamples) : undefined,
      };
    });

    return {
      levelId,
      totalEntries: leaderboard.length,
      leaderboard,
    };
  });

  return app;
}
