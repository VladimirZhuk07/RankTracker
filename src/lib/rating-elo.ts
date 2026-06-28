import type { MatchRecord } from './storage/definitions';

export const INITIAL_RATING = 1000;
export const DEFAULT_K_FACTOR = 24;
export const DEFAULT_ELO_SCALE = 400;
export const DEFAULT_OUTCOME_WEIGHT_PCT = 40;
export const DEFAULT_SKILL_WEIGHT_PCT = 60;
export const MIN_SKILL_WEIGHT_PCT = 10;
export const MAX_SKILL_WEIGHT_PCT = 90;
export const MIN_OUTCOME_WEIGHT_PCT = 10;
export const MAX_OUTCOME_WEIGHT_PCT = 90;
export const KD_WEIGHT_IN_PERF = 0.6;
export const ADR_WEIGHT_IN_PERF = 0.4;

export type EloConfig = {
  kFactor: number;
  eloScale: number;
  outcomeWeightPct: number;
  skillWeightPct: number;
};

export type EloReplayOptions = EloConfig & {
  neutralSessionIds: Set<string>;
  cutoffInclusive?: Date;
};

export const DEFAULT_ELO_CONFIG: EloConfig = {
  kFactor: DEFAULT_K_FACTOR,
  eloScale: DEFAULT_ELO_SCALE,
  outcomeWeightPct: DEFAULT_OUTCOME_WEIGHT_PCT,
  skillWeightPct: DEFAULT_SKILL_WEIGHT_PCT,
};

type SessionPlayer = {
  userId: string;
  won: boolean;
  kills: number;
  deaths: number;
  damage: number;
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

export function normalizeRatingWeights(
  outcomeWeightPct?: number,
  skillWeightPct?: number
): Pick<EloConfig, 'outcomeWeightPct' | 'skillWeightPct'> {
  if (skillWeightPct !== undefined) {
    if (skillWeightPct === 0) {
      return { outcomeWeightPct: 100, skillWeightPct: 0 };
    }
    const skill = Math.min(MAX_SKILL_WEIGHT_PCT, Math.max(MIN_SKILL_WEIGHT_PCT, skillWeightPct));
    return { outcomeWeightPct: 100 - skill, skillWeightPct: skill };
  }
  if (outcomeWeightPct !== undefined) {
    if (outcomeWeightPct === 100) {
      return { outcomeWeightPct: 100, skillWeightPct: 0 };
    }
    const outcome = Math.min(
      MAX_OUTCOME_WEIGHT_PCT,
      Math.max(MIN_OUTCOME_WEIGHT_PCT, outcomeWeightPct)
    );
    return { outcomeWeightPct: outcome, skillWeightPct: 100 - outcome };
  }
  return {
    outcomeWeightPct: DEFAULT_OUTCOME_WEIGHT_PCT,
    skillWeightPct: DEFAULT_SKILL_WEIGHT_PCT,
  };
}

export function percentileRank(value: number, values: number[]): number {
  if (values.length === 0) {
    return 0.5;
  }
  if (values.length === 1) {
    return 0.5;
  }
  const less = values.filter((v) => v < value).length;
  const equal = values.filter((v) => v === value).length;
  return (less + (equal - 1) / 2) / (values.length - 1);
}

function kdRatio(kills: number, deaths: number): number {
  return deaths > 0 ? kills / deaths : kills;
}

export function mapPerformanceIndex(player: SessionPlayer, players: SessionPlayer[]): number {
  const kds = players.map((p) => kdRatio(p.kills, p.deaths));
  const adrs = players.map((p) => p.damage);
  const kdPct = percentileRank(kdRatio(player.kills, player.deaths), kds);
  const adrPct = percentileRank(player.damage, adrs);
  return KD_WEIGHT_IN_PERF * kdPct + ADR_WEIGHT_IN_PERF * adrPct;
}

export function computeSkillDelta(
  kFactor: number,
  skillWeightPct: number,
  perfIndex: number
): number {
  if (skillWeightPct <= 0) {
    return 0;
  }
  return (skillWeightPct / 100) * kFactor * (perfIndex - 0.5);
}

export function computeExpectedScore(
  myTeamAvg: number,
  oppTeamAvg: number,
  eloScale: number
): number {
  return 1 / (1 + 10 ** ((oppTeamAvg - myTeamAvg) / eloScale));
}

function resolveEloConfig(config?: Partial<EloConfig>): EloConfig {
  const weights = normalizeRatingWeights(config?.outcomeWeightPct, config?.skillWeightPct);
  return {
    kFactor: config?.kFactor ?? DEFAULT_K_FACTOR,
    eloScale: config?.eloScale ?? DEFAULT_ELO_SCALE,
    ...weights,
  };
}

function buildSessionBundles(
  matches: MatchRecord[],
  neutralSessionIds: Set<string>,
  cutoffInclusive?: Date
): SessionBundle[] {
  const bySession = new Map<
    string,
    Map<string, SessionPlayer & { sortCreatedAt: number }>
  >();

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
      kills: match.kills,
      deaths: match.deaths,
      damage: match.damage,
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
      players: players.map(({ userId, won, kills, deaths, damage }) => ({
        userId,
        won,
        kills,
        deaths,
        damage,
      })),
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
  eloScale: number,
  skillWeightPct: number
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

  for (const player of winners) {
    const expected = computeExpectedScore(winnerAvg, loserAvg, eloScale);
    const outcomeDelta = kFactor * (1 - expected);
    const perfIndex = mapPerformanceIndex(player, players);
    const skillDelta = computeSkillDelta(kFactor, skillWeightPct, perfIndex);
    const current = getRating(ratings, player.userId);
    ratings.set(player.userId, current + outcomeDelta + skillDelta);
  }

  for (const player of losers) {
    const expected = computeExpectedScore(loserAvg, winnerAvg, eloScale);
    const outcomeDelta = kFactor * (0 - expected);
    const perfIndex = mapPerformanceIndex(player, players);
    const skillDelta = computeSkillDelta(kFactor, skillWeightPct, perfIndex);
    const current = getRating(ratings, player.userId);
    ratings.set(player.userId, current + outcomeDelta + skillDelta);
  }
}

/** Chronological map-based team Elo replay. */
export function replayElo(matches: MatchRecord[], options: EloReplayOptions): Map<string, number> {
  const { neutralSessionIds, cutoffInclusive, kFactor, eloScale, skillWeightPct } = options;
  const ratings = new Map<string, number>();
  const sessions = buildSessionBundles(matches, neutralSessionIds, cutoffInclusive);

  for (const session of sessions) {
    processSession(ratings, session.players, kFactor, eloScale, skillWeightPct);
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
