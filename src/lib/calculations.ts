import type { User } from './definitions';

export type UserStats = {
  kdRatio: number;
  averageDamage: number;
  rating: number;
  rank: number;
};

export function calculateStats(user: User): Omit<UserStats, 'rank'> {
  const { totalKills, totalDeaths, totalDamage, totalMaps } = user;

  const kdRatio = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
  const averageDamage = totalMaps > 0 ? totalDamage / totalMaps : 0;
  
  // New rating formula
  const rating = kdRatio * 2 + averageDamage / 100;

  return {
    kdRatio,
    averageDamage,
    rating,
  };
}
