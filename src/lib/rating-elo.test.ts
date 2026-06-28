import { describe, expect, it } from 'vitest';
import type { MatchRecord } from './storage/definitions';
import { getNeutralSessionIds } from './neutral-sessions';
import {
  computeEloRatings,
  computeExpectedScore,
  DEFAULT_ELO_SCALE,
  DEFAULT_K_FACTOR,
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
  };
}

describe('computeExpectedScore', () => {
  it('should_returnHalf_when_teamAveragesEqual', () => {
    expect(computeExpectedScore(1000, 1000, DEFAULT_ELO_SCALE)).toBeCloseTo(0.5, 5);
  });
});

describe('replayElo', () => {
  it('should_applySymmetricDelta_when_equalTeamsWin', () => {
    const neutral = new Set<string>();
    const matches: MatchRecord[] = [
      makeMatch({ userId: 'a', sessionId: 's1', won: true }),
      makeMatch({ userId: 'b', sessionId: 's1', won: true }),
      makeMatch({ userId: 'c', sessionId: 's1', won: false }),
      makeMatch({ userId: 'd', sessionId: 's1', won: false }),
    ];

    const ratings = replayElo(matches, {
      neutralSessionIds: neutral,
      kFactor: DEFAULT_K_FACTOR,
      eloScale: DEFAULT_ELO_SCALE,
    });

    expect(ratings.get('a')).toBeCloseTo(1012, 0);
    expect(ratings.get('c')).toBeCloseTo(988, 0);
  });

  it('should_awardMorePoints_when_underdogWins', () => {
    const neutral = new Set<string>();
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

    const ratings = replayElo(matches, {
      neutralSessionIds: neutral,
      kFactor: DEFAULT_K_FACTOR,
      eloScale: DEFAULT_ELO_SCALE,
    });

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

    const ratings = computeEloRatings(matches, neutral);
    expect(ratings.size).toBe(0);
  });

  it('should_applyEarlierMapsBeforeLaterOnes', () => {
    const neutral = new Set<string>();
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

    const withHistory = replayElo([...earlyWin, ...lateWin], {
      neutralSessionIds: neutral,
      kFactor: DEFAULT_K_FACTOR,
      eloScale: DEFAULT_ELO_SCALE,
    });
    const lateOnly = replayElo(lateWin, {
      neutralSessionIds: neutral,
      kFactor: DEFAULT_K_FACTOR,
      eloScale: DEFAULT_ELO_SCALE,
    });

    expect(withHistory.get('p1')).not.toBe(lateOnly.get('p1'));
  });

  it('should_skipSession_when_onlyOneSidePresent', () => {
    const neutral = new Set<string>();
    const matches: MatchRecord[] = [
      makeMatch({ userId: 'a', sessionId: 's1', won: true }),
      makeMatch({ userId: 'b', sessionId: 's1', won: true }),
    ];

    const ratings = replayElo(matches, {
      neutralSessionIds: neutral,
      kFactor: DEFAULT_K_FACTOR,
      eloScale: DEFAULT_ELO_SCALE,
    });

    expect(ratings.size).toBe(0);
  });
});
