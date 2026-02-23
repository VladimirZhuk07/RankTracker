import type { MatchRecord, UserStatsData } from './storage/definitions';

export type UserStats = {
  kdRatio: number;
  averageDamage: number;
  rating: number;
  rank: number;
};

export type WeightedStatsData = {
  effectiveKills: number;
  effectiveDeaths: number;
  effectiveDamage: number;
  totalMaps: number;
};

/**
 * MAX_RAW_RATING = 54 is back-calculated from a theoretical ceiling player:
 * 312 games/year (6 maps/week), 60% win rate, K/D 3.2:1, avg damage 4,500/map.
 * avgModifier = 0.6×1.2 + 0.4×0.8 = 1.04
 * kdRatio     = 3.2 × 1.04 = 3.328
 * avgDamage   = 4,500 × 1.04 = 4,680/map
 * rawRating   = 3.328×2 + 4,680/100 = 6.656 + 46.8 = 53.456 ≈ 54
 */
export const MAX_RAW_RATING = 54;

export function calculateWinModifier(won: boolean): number {
  return won ? 1.2 : 0.8;
}

export function calculateActivityWeight(playerLastMatchDate: Date, referenceDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceLastPlay = (referenceDate.getTime() - playerLastMatchDate.getTime()) / msPerDay;
  return Math.max(0, Math.min(1, 1 - daysSinceLastPlay / 365));
}

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

export function aggregateMatchesWeighted(matches: MatchRecord[]): WeightedStatsData {
  return matches.reduce(
    (acc, m) => {
      const modifier = calculateWinModifier(m.won);
      return {
        effectiveKills: acc.effectiveKills + m.kills * modifier,
        effectiveDeaths: acc.effectiveDeaths + m.deaths,
        effectiveDamage: acc.effectiveDamage + m.damage * modifier,
        totalMaps: acc.totalMaps + 1,
      };
    },
    { effectiveKills: 0, effectiveDeaths: 0, effectiveDamage: 0, totalMaps: 0 }
  );
}

export function calculateStats(
  stats: WeightedStatsData,
  referenceDate: Date,
  playerLastMatchDate: Date
): Omit<UserStats, 'rank'> {
  const { effectiveKills, effectiveDeaths, effectiveDamage, totalMaps } = stats;

  const kdRatio = effectiveDeaths > 0 ? effectiveKills / effectiveDeaths : effectiveKills;
  const averageDamage = totalMaps > 0 ? effectiveDamage / totalMaps : 0;
  const rawRating = kdRatio * 2 + averageDamage / 100;
  const normalizedRating = (rawRating / MAX_RAW_RATING) * 100;
  const activityWeight = calculateActivityWeight(playerLastMatchDate, referenceDate);
  const rating = Math.min(100, normalizedRating * activityWeight);

  return {
    kdRatio,
    averageDamage,
    rating,
  };
}
