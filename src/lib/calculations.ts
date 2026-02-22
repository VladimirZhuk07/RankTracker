import type { UserStatsData } from './storage/definitions';

export type UserStats = {
  kdRatio: number;
  averageDamage: number;
  rating: number;
  rank: number;
};

export function calculateStats(stats: UserStatsData): Omit<UserStats, 'rank'> {
  const { totalKills, totalDeaths, totalDamage, totalMaps } = stats;

  const kdRatio = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
  const averageDamage = totalMaps > 0 ? totalDamage / totalMaps : 0;
  const rating = kdRatio * 2 + averageDamage / 100;

  return {
    kdRatio,
    averageDamage,
    rating,
  };
}
