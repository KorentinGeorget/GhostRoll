import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DB, users, User } from '../db/index.js';

const NOUNS = ['Roller', 'Pilot', 'Marble', 'Sphere', 'Glider', 'Drifter', 'Echo', 'Ghost'];
const ADJECTIVES = ['Neon', 'Quantum', 'Hyper', 'Cyber', 'Sonic', 'Astro', 'Cosmic', 'Solar'];

function generateGamerTag(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun} #${num}`;
}

export async function getOrCreateGuestUser(db: DB, guestToken?: string): Promise<{ user: User; token: string }> {
  if (guestToken) {
    const existing = await db.select().from(users).where(eq(users.guestToken, guestToken)).limit(1);
    if (existing.length > 0) {
      return { user: existing[0], token: guestToken };
    }
  }

  // Create new anonymous user
  const newToken = crypto.randomBytes(32).toString('hex');
  const newUserId = crypto.randomUUID();
  const displayName = generateGamerTag();

  const [newUser] = await db
    .insert(users)
    .values({
      id: newUserId,
      guestToken: newToken,
      displayName,
    })
    .returning();

  return { user: newUser, token: newToken };
}
