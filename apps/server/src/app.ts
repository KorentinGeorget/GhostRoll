import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import crypto from 'node:crypto';
import { eq, and, sql, asc } from 'drizzle-orm';
import { DB, getDb, runs, users } from './db/index.js';
import { getOrCreateGuestUser } from './services/auth.service.js';
import { validateReplay } from './services/validation.service.js';
import { TICKS_PER_SECOND } from '@ghostroll/shared';

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

    // Perform deterministic re-simulation on the server
    const validation = await validateReplay({
      levelId: body.levelId,
      simVersion: body.simVersion,
      claimedTicks: body.claimedTicks,
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
        claimedTicks: body.claimedTicks,
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
      claimedTicks: body.claimedTicks,
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
