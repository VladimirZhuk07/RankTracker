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
 * MAX_RAW_RATING is back-calculated from a theoretical ceiling player:
 * 312 games/year (6 maps/week), 60% win rate, K/D 3.2:1, avg damage 4,500/map.
 * avgModifier = 0.6×1.1 + 0.4×0.9 = 1.02
 * kdRatio     = 3.2 × 1.02 = 3.264
 * avgDamage   = 4,500 × 1.02 = 4,590/map
 * rawRating   = 3.264×2 + 4,590/100 = 6.528 + 45.9 = 52.428 ≈ 52.43
 */
export const MAX_RAW_RATING = 52.43;

export function calculateWinModifier(won: boolean): number {
  return won ? 1.1 : 0.9;
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

export function aggregateMatchesWeighted(matches: MatchRecord[], neutralSessionIds?: Set<string>): WeightedStatsData {
  return matches.reduce(
    (acc, m) => {
      const isNeutralSession = neutralSessionIds?.has(m.sessionId) ?? false;
      const modifier = isNeutralSession ? 1 : calculateWinModifier(m.won);
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

export function calculateStats(stats: WeightedStatsData): Omit<UserStats, 'rank'> {
  const { effectiveKills, effectiveDeaths, effectiveDamage, totalMaps } = stats;

  const kdRatio = effectiveDeaths > 0 ? effectiveKills / effectiveDeaths : effectiveKills;
  const averageDamage = totalMaps > 0 ? effectiveDamage / totalMaps : 0;
  const rawRating = kdRatio * 2 + averageDamage / 100;
  const normalizedRating = (rawRating / MAX_RAW_RATING) * 100;
  const rating = Math.min(100, normalizedRating);

  return {
    kdRatio,
    averageDamage,
    rating,
  };
}
