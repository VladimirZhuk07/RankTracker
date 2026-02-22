import type { MatchRecord, UserStatsData } from './storage/definitions';

export type UserStats = {
  kdRatio: number;
  averageDamage: number;
  rating: number;
  rank: number;
};

export function aggregateMatchesToStats(matches: MatchRecord[]): UserStatsData {
  return matches.reduce(
    (acc, m) => ({
      totalMaps: acc.totalMaps + 1,
      totalKills: acc.totalKills + m.kills,
      totalDeaths: acc.totalDeaths + m.deaths,
      totalDamage: acc.totalDamage + m.damage,
    }),
    { totalMaps: 0, totalKills: 0, totalDeaths: 0, totalDamage: 0 }
  );
}

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
