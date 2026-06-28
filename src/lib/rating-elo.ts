import type { MatchRecord } from './storage/definitions';

export const INITIAL_RATING = 1000;
export const DEFAULT_K_FACTOR = 24;
export const DEFAULT_ELO_SCALE = 400;

export type EloConfig = {
  kFactor: number;
  eloScale: number;
};

export type EloReplayOptions = EloConfig & {
  neutralSessionIds: Set<string>;
  cutoffInclusive?: Date;
};

export const DEFAULT_ELO_CONFIG: EloConfig = {
  kFactor: DEFAULT_K_FACTOR,
  eloScale: DEFAULT_ELO_SCALE,
};

type SessionPlayer = {
  userId: string;
  won: boolean;
};

type SessionBundle = {
  sessionId: string;
  sortTime: number;
  sortCreatedAt: number;
  players: SessionPlayer[];
};

function matchDate(m: MatchRecord): Date | null {
  if (!m.date) {
    return null;
  }
  return m.date.toDate();
}

function matchCreatedAt(m: MatchRecord): number {
  if (!m.createdAt) {
    return 0;
  }
  return m.createdAt.toDate().getTime();
}

export function computeExpectedScore(
  myTeamAvg: number,
  oppTeamAvg: number,
  eloScale: number
): number {
  return 1 / (1 + 10 ** ((oppTeamAvg - myTeamAvg) / eloScale));
}

function resolveEloConfig(config?: Partial<EloConfig>): EloConfig {
  return {
    kFactor: config?.kFactor ?? DEFAULT_K_FACTOR,
    eloScale: config?.eloScale ?? DEFAULT_ELO_SCALE,
  };
}

function buildSessionBundles(
  matches: MatchRecord[],
  neutralSessionIds: Set<string>,
  cutoffInclusive?: Date
): SessionBundle[] {
  const bySession = new Map<string, Map<string, SessionPlayer & { sortCreatedAt: number }>>();

  for (const match of matches) {
    if (!match.sessionId || neutralSessionIds.has(match.sessionId)) {
      continue;
    }

    const date = matchDate(match);
    if (date === null) {
      continue;
    }
    if (cutoffInclusive !== undefined && date > cutoffInclusive) {
      continue;
    }

    const createdAt = matchCreatedAt(match);
    let session = bySession.get(match.sessionId);
    if (!session) {
      session = new Map();
      bySession.set(match.sessionId, session);
    }

    session.set(match.userId, {
      userId: match.userId,
      won: match.won,
      sortCreatedAt: createdAt,
    });
  }

  const bundles: SessionBundle[] = [];

  for (const [sessionId, playersMap] of bySession) {
    const players = Array.from(playersMap.values());
    const sessionDates = matches
      .filter((m) => m.sessionId === sessionId)
      .map((m) => matchDate(m))
      .filter((d): d is Date => d !== null);
    const sessionCreatedAt = matches
      .filter((m) => m.sessionId === sessionId)
      .map((m) => matchCreatedAt(m));

    if (sessionDates.length === 0) {
      continue;
    }

    bundles.push({
      sessionId,
      sortTime: Math.min(...sessionDates.map((d) => d.getTime())),
      sortCreatedAt: Math.min(...sessionCreatedAt),
      players: players.map(({ userId, won }) => ({ userId, won })),
    });
  }

  bundles.sort((a, b) => a.sortTime - b.sortTime || a.sortCreatedAt - b.sortCreatedAt);
  return bundles;
}

function teamAverage(ratings: Map<string, number>, userIds: string[]): number {
  if (userIds.length === 0) {
    return INITIAL_RATING;
  }
  const sum = userIds.reduce((acc, id) => acc + (ratings.get(id) ?? INITIAL_RATING), 0);
  return sum / userIds.length;
}

function getRating(ratings: Map<string, number>, userId: string): number {
  return ratings.get(userId) ?? INITIAL_RATING;
}

function processSession(
  ratings: Map<string, number>,
  players: SessionPlayer[],
  kFactor: number,
  eloScale: number
): void {
  const winners = players.filter((p) => p.won);
  const losers = players.filter((p) => !p.won);

  if (winners.length === 0 || losers.length === 0) {
    return;
  }

  const winnerIds = winners.map((p) => p.userId);
  const loserIds = losers.map((p) => p.userId);
  const winnerAvg = teamAverage(ratings, winnerIds);
  const loserAvg = teamAverage(ratings, loserIds);

  for (const { userId } of winners) {
    const expected = computeExpectedScore(winnerAvg, loserAvg, eloScale);
    const current = getRating(ratings, userId);
    ratings.set(userId, current + kFactor * (1 - expected));
  }

  for (const { userId } of losers) {
    const expected = computeExpectedScore(loserAvg, winnerAvg, eloScale);
    const current = getRating(ratings, userId);
    ratings.set(userId, current + kFactor * (0 - expected));
  }
}

/** Chronological map-based team Elo replay. */
export function replayElo(matches: MatchRecord[], options: EloReplayOptions): Map<string, number> {
  const { neutralSessionIds, cutoffInclusive, kFactor, eloScale } = options;
  const ratings = new Map<string, number>();
  const sessions = buildSessionBundles(matches, neutralSessionIds, cutoffInclusive);

  for (const session of sessions) {
    processSession(ratings, session.players, kFactor, eloScale);
  }

  return ratings;
}

export function computeEloRatings(
  matches: MatchRecord[],
  neutralSessionIds: Set<string>,
  config?: Partial<EloConfig>,
  cutoffInclusive?: Date
): Map<string, number> {
  const resolved = resolveEloConfig(config);
  return replayElo(matches, {
    ...resolved,
    neutralSessionIds,
    cutoffInclusive,
  });
}

export function getUserEloRating(
  ratings: Map<string, number>,
  userId: string,
  hasMatches: boolean
): number {
  if (!hasMatches) {
    return 0;
  }
  return ratings.get(userId) ?? INITIAL_RATING;
}
