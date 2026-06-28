import { describe, expect, it } from 'vitest';
import type { MatchRecord } from './storage/definitions';
import { getNeutralSessionIds } from './neutral-sessions';
import {
  computeEloRatings,
  computeExpectedScore,
  computeSkillDelta,
  DEFAULT_ELO_CONFIG,
  DEFAULT_ELO_SCALE,
  DEFAULT_K_FACTOR,
  DEFAULT_SKILL_WEIGHT_PCT,
  mapPerformanceIndex,
  normalizeRatingWeights,
  percentileRank,
  replayElo,
} from './rating-elo';

type MockTimestamp = { toDate: () => Date };

function ts(date: Date): MockTimestamp {
  return { toDate: () => date };
}

function makeMatch(
  overrides: Partial<MatchRecord> & Pick<MatchRecord, 'userId' | 'sessionId' | 'won'>
): MatchRecord {
  const date = overrides.date ?? ts(new Date('2026-01-01T12:00:00'));
  const createdAt = overrides.createdAt ?? date;
  return {
    id: overrides.id ?? `${overrides.userId}-${overrides.sessionId}`,
    name: overrides.name ?? overrides.userId,
    kills: overrides.kills ?? 10,
    deaths: overrides.deaths ?? 10,
    damage: overrides.damage ?? 2000,
    ...overrides,
    date: date as MatchRecord['date'],
    createdAt: createdAt as MatchRecord['createdAt'],
  } as MatchRecord;
}

function replayOptions(overrides: Partial<typeof DEFAULT_ELO_CONFIG> = {}) {
  return {
    ...DEFAULT_ELO_CONFIG,
    neutralSessionIds: new Set<string>(),
    ...overrides,
  };
}

describe('normalizeRatingWeights', () => {
  it('should_defaultToFortySixty_when_noInput', () => {
    expect(normalizeRatingWeights()).toEqual({
      outcomeWeightPct: 40,
      skillWeightPct: 60,
    });
  });

  it('should_sumTo100_when_skillProvided', () => {
    expect(normalizeRatingWeights(undefined, 50)).toEqual({
      outcomeWeightPct: 50,
      skillWeightPct: 50,
    });
  });

  it('should_clampSkillWeight_when_outOfRange', () => {
    expect(normalizeRatingWeights(undefined, 99).skillWeightPct).toBe(90);
    expect(normalizeRatingWeights(undefined, -5).skillWeightPct).toBe(10);
  });

  it('should_allowPureElo_when_skillWeightZero', () => {
    expect(normalizeRatingWeights(undefined, 0)).toEqual({
      outcomeWeightPct: 100,
      skillWeightPct: 0,
    });
  });
});

describe('percentileRank', () => {
  it('should_returnHalf_when_singleValue', () => {
    expect(percentileRank(5, [5])).toBe(0.5);
  });

  it('should_returnZeroAndOne_forMinMax', () => {
    expect(percentileRank(1, [1, 2, 3])).toBe(0);
    expect(percentileRank(3, [1, 2, 3])).toBe(1);
  });

  it('should_returnHalf_when_allEqual', () => {
    expect(percentileRank(10, [10, 10, 10, 10])).toBe(0.5);
  });
});

describe('computeSkillDelta', () => {
  it('should_returnZero_when_skillWeightZero', () => {
    expect(computeSkillDelta(24, 0, 1)).toBe(0);
  });

  it('should_returnZero_when_perfIndexIsAverage', () => {
    expect(computeSkillDelta(24, 40, 0.5)).toBe(0);
  });

  it('should_matchDocExample_when_topPerformance', () => {
    expect(computeSkillDelta(24, 40, 1)).toBeCloseTo(4.8, 5);
  });

  it('should_matchDocExample_when_skillFiftyPercent', () => {
    expect(computeSkillDelta(24, 50, 1)).toBeCloseTo(6, 5);
    expect(computeSkillDelta(24, 50, 0)).toBeCloseTo(-6, 5);
  });
});

describe('mapPerformanceIndex', () => {
  it('should_rankBestPlayerHighest_inSession', () => {
    const players = [
      { userId: 'a', won: true, kills: 30, deaths: 5, damage: 5000 },
      { userId: 'b', won: true, kills: 10, deaths: 10, damage: 2000 },
      { userId: 'c', won: false, kills: 8, deaths: 12, damage: 1500 },
      { userId: 'd', won: false, kills: 5, deaths: 15, damage: 1000 },
    ];
    const best = mapPerformanceIndex(players[0], players);
    const worst = mapPerformanceIndex(players[3], players);
    expect(best).toBeGreaterThan(worst);
    expect(best).toBeCloseTo(1, 0);
    expect(worst).toBeCloseTo(0, 0);
  });
});

describe('computeExpectedScore', () => {
  it('should_returnHalf_when_teamAveragesEqual', () => {
    expect(computeExpectedScore(1000, 1000, DEFAULT_ELO_SCALE)).toBeCloseTo(0.5, 5);
  });
});

describe('replayElo', () => {
  it('should_applySymmetricDelta_when_equalTeamsWinAndPureElo', () => {
    const matches: MatchRecord[] = [
      makeMatch({ userId: 'a', sessionId: 's1', won: true }),
      makeMatch({ userId: 'b', sessionId: 's1', won: true }),
      makeMatch({ userId: 'c', sessionId: 's1', won: false }),
      makeMatch({ userId: 'd', sessionId: 's1', won: false }),
    ];

    const ratings = replayElo(matches, replayOptions({ skillWeightPct: 0, outcomeWeightPct: 100 }));

    expect(ratings.get('a')).toBeCloseTo(1012, 0);
    expect(ratings.get('c')).toBeCloseTo(988, 0);
  });

  it('should_matchPureElo_when_defaultEqualStats', () => {
    const matches: MatchRecord[] = [
      makeMatch({ userId: 'a', sessionId: 's1', won: true }),
      makeMatch({ userId: 'b', sessionId: 's1', won: false }),
    ];

    const pure = replayElo(matches, replayOptions({ skillWeightPct: 0, outcomeWeightPct: 100 }));
    const defaults = replayElo(matches, replayOptions());

    expect(defaults.get('a')).toBeCloseTo(pure.get('a') ?? 0, 5);
    expect(defaults.get('b')).toBeCloseTo(pure.get('b') ?? 0, 5);
  });

  it('should_giveTopWinnerMoreThanBottomWinner_onSameTeam', () => {
    const matches: MatchRecord[] = [
      makeMatch({ userId: 'top', sessionId: 's1', won: true, kills: 30, deaths: 5, damage: 5000 }),
      makeMatch({ userId: 'bottom', sessionId: 's1', won: true, kills: 5, deaths: 20, damage: 800 }),
      makeMatch({ userId: 'l1', sessionId: 's1', won: false, kills: 10, deaths: 10, damage: 2000 }),
      makeMatch({ userId: 'l2', sessionId: 's1', won: false, kills: 10, deaths: 10, damage: 2000 }),
    ];

    const ratings = replayElo(matches, replayOptions());
    expect(ratings.get('top')).toBeGreaterThan(ratings.get('bottom') ?? 0);
  });

  it('should_loseLess_when_loserHasBestStats', () => {
    const matches: MatchRecord[] = [
      makeMatch({ userId: 'w1', sessionId: 's1', won: true, kills: 10, deaths: 10, damage: 2000 }),
      makeMatch({ userId: 'w2', sessionId: 's1', won: true, kills: 10, deaths: 10, damage: 2000 }),
      makeMatch({ userId: 'carry', sessionId: 's1', won: false, kills: 30, deaths: 5, damage: 5000 }),
      makeMatch({ userId: 'feed', sessionId: 's1', won: false, kills: 2, deaths: 20, damage: 500 }),
    ];

    const ratings = replayElo(matches, replayOptions());
    expect(ratings.get('carry')).toBeGreaterThan(ratings.get('feed') ?? 0);
  });

  it('should_matchDocTableSpotCheck_forTopAndBottomWinners', () => {
    const matches: MatchRecord[] = [
      makeMatch({ userId: 'top', sessionId: 's1', won: true, kills: 30, deaths: 5, damage: 5000 }),
      makeMatch({ userId: 'bottom', sessionId: 's1', won: true, kills: 2, deaths: 20, damage: 500 }),
      makeMatch({ userId: 'l1', sessionId: 's1', won: false, kills: 10, deaths: 10, damage: 1800 }),
      makeMatch({ userId: 'l2', sessionId: 's1', won: false, kills: 9, deaths: 11, damage: 1700 }),
    ];

    const ratings = replayElo(matches, replayOptions());
    expect(ratings.get('top')).toBeCloseTo(1019.2, 1);
    expect(ratings.get('bottom')).toBeCloseTo(1004.8, 1);
  });

  it('should_awardMorePoints_when_underdogWins', () => {
    const matches: MatchRecord[] = [
      makeMatch({
        userId: 'strong',
        sessionId: 'boost',
        won: true,
        date: ts(new Date('2026-01-01')) as MatchRecord['date'],
      }),
      makeMatch({
        userId: 'weak',
        sessionId: 'boost',
        won: false,
        date: ts(new Date('2026-01-01')) as MatchRecord['date'],
      }),
      makeMatch({
        userId: 'strong',
        sessionId: 's2',
        won: false,
        date: ts(new Date('2026-01-02')) as MatchRecord['date'],
      }),
      makeMatch({
        userId: 'weak',
        sessionId: 's2',
        won: true,
        date: ts(new Date('2026-01-02')) as MatchRecord['date'],
      }),
    ];

    const ratings = replayElo(
      matches,
      replayOptions({ skillWeightPct: 0, outcomeWeightPct: 100 })
    );

    const weakAfterFirstMap = 988;
    const upsetGain = (ratings.get('weak') ?? 0) - weakAfterFirstMap;
    expect(upsetGain).toBeGreaterThan(DEFAULT_K_FACTOR / 2);
  });

  it('should_notChangeRatings_when_sessionIsNeutral', () => {
    const matches: MatchRecord[] = [
      makeMatch({ userId: 'a', sessionId: 'neutral', won: false }),
      makeMatch({ userId: 'b', sessionId: 'neutral', won: false }),
    ];
    const neutral = getNeutralSessionIds(matches);

    const ratings = computeEloRatings(matches, neutral, DEFAULT_ELO_CONFIG);
    expect(ratings.size).toBe(0);
  });

  it('should_applyEarlierMapsBeforeLaterOnes', () => {
    const earlyWin: MatchRecord[] = [
      makeMatch({
        userId: 'p1',
        sessionId: 's1',
        won: true,
        date: ts(new Date('2026-01-01')) as MatchRecord['date'],
      }),
      makeMatch({
        userId: 'p2',
        sessionId: 's1',
        won: false,
        date: ts(new Date('2026-01-01')) as MatchRecord['date'],
      }),
    ];
    const lateWin: MatchRecord[] = [
      makeMatch({
        userId: 'p1',
        sessionId: 's2',
        won: false,
        date: ts(new Date('2026-01-02')) as MatchRecord['date'],
      }),
      makeMatch({
        userId: 'p2',
        sessionId: 's2',
        won: true,
        date: ts(new Date('2026-01-02')) as MatchRecord['date'],
      }),
    ];

    const withHistory = replayElo([...earlyWin, ...lateWin], replayOptions({ skillWeightPct: 0, outcomeWeightPct: 100 }));
    const lateOnly = replayElo(lateWin, replayOptions({ skillWeightPct: 0, outcomeWeightPct: 100 }));

    expect(withHistory.get('p1')).not.toBe(lateOnly.get('p1'));
  });

  it('should_skipSession_when_onlyOneSidePresent', () => {
    const matches: MatchRecord[] = [
      makeMatch({ userId: 'a', sessionId: 's1', won: true }),
      makeMatch({ userId: 'b', sessionId: 's1', won: true }),
    ];

    const ratings = replayElo(matches, replayOptions());
    expect(ratings.size).toBe(0);
  });
});
