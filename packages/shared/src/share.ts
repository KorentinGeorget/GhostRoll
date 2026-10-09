import { TICKS_PER_SECOND } from './types.js';

export interface ShareCardData {
  levelName?: string;
  date: string;
  ticks: number;
  timeSeconds: number;
  rank?: number;
  finalHash: string;
  url?: string;
}

export function formatShareCard(data: ShareCardData): string {
  const totalSeconds = data.timeSeconds;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds % 1) * 1000);
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;

  const rankStr = data.rank ? `🏆 Rank: #${data.rank}\n` : '';
  const urlStr = data.url || 'https://ghostroll.dev';

  return `🌀 GHOSTROLL — ${data.date}
⏱️ Time: ${timeFormatted} (${data.ticks} ticks)
${rankStr}✨ Hash: ${data.finalHash} (100% server verified)
Play: ${urlStr}`;
}
