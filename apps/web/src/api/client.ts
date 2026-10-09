import { GhostSample, ReplayPayload } from '@ghostroll/shared';

export interface UserProfile {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface RunSubmitResponse {
  success: boolean;
  runId?: string;
  verifiedTicks?: number;
  finalHash?: string;
  timeSeconds?: string;
  error?: string;
  reason?: string;
}

export interface LeaderboardEntry {
  rank: number;
  runId: string;
  displayName: string;
  ticks: number;
  timeSeconds: number;
  finalHash: string;
  date: string;
  ghostSamples?: GhostSample[];
}

export interface LeaderboardResponse {
  levelId: string;
  totalEntries: number;
  leaderboard: LeaderboardEntry[];
}

export async function fetchMe(): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch user profile:', err);
    return null;
  }
}

export async function submitRun(payload: ReplayPayload): Promise<RunSubmitResponse> {
  try {
    const res = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      reason: err?.message || 'Could not connect to verification server',
    };
  }
}

export async function fetchLeaderboard(levelId: string): Promise<LeaderboardResponse | null> {
  try {
    const res = await fetch(`/api/levels/${levelId}/leaderboard`, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch leaderboard:', err);
    return null;
  }
}
