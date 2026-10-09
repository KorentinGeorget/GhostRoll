import { GhostSample, LevelDefinition, LevelPalette, ReplayPayload } from '@ghostroll/shared';

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

export interface DailyLevelResponse {
  date: string;
  level: LevelDefinition;
  palette: LevelPalette;
}

export interface ArchiveItem {
  date: string;
  levelId: string;
  name: string;
  palette: LevelPalette;
}

export interface ArchiveResponse {
  archive: ArchiveItem[];
}

export async function fetchDailyLevel(): Promise<DailyLevelResponse | null> {
  try {
    const res = await fetch('/api/levels/daily', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch daily level:', err);
    return null;
  }
}

export async function fetchArchive(): Promise<ArchiveResponse | null> {
  try {
    const res = await fetch('/api/levels/archive', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch archive:', err);
    return null;
  }
}

export async function fetchLevel(levelId: string): Promise<{ level: LevelDefinition; palette: LevelPalette } | null> {
  try {
    const res = await fetch(`/api/levels/${levelId}`, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch level definition:', err);
    return null;
  }
}

