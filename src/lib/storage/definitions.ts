import type { Timestamp } from 'firebase/firestore';

export const CS2_MAPS = [
  'Ancient',
  'Anubis',
  'Dust II',
  'Inferno',
  'Mirage',
  'Nuke',
  'Overpass',
] as const;

export type UserStatsData = {
  totalMaps: number;
  totalKills: number;
  totalDeaths: number;
  totalDamage: number;
};

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  /** Community-assigned achievement ids (admin only). */
  manualAchievementIds?: string[];
};

export type MatchRecord = {
  id: string;
  userId: string;
  name: string;
  kills: number;
  deaths: number;
  damage: number;
  won: boolean;
  date: Timestamp;
  sessionId: string;
  createdAt: Timestamp;
};

export type SessionRecord = {
  id: string;       // same value as sessionId on MatchRecord
  mapIndex: number;
  date: Timestamp;
  createdAt: Timestamp;
};
