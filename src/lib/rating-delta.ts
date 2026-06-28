import type { MatchRecord } from './storage/definitions';
import { computeEloRatings, getUserEloRating, type EloConfig } from './rating-elo';

function matchDate(m: MatchRecord): Date | null {
  const t = m.date;
  if (!t) {
    return null;
  }
  return t.toDate();
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function endOfLocalDayFromKey(key: string): Date {
  const [y, mo, day] = key.split('-').map(Number);
  return new Date(y, mo - 1, day, 23, 59, 59, 999);
}

/** Distinct local calendar days that have at least one match, newest first. */
function distinctLocalDayKeysDescending(matches: MatchRecord[]): string[] {
  const keys = new Set<string>();
  for (const m of matches) {
    const d = matchDate(m);
    if (d) {
      keys.add(localDayKey(d));
    }
  }
  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}

function startOfLocalDayFromKey(key: string): Date {
  const [y, mo, day] = key.split('-').map(Number);
  return new Date(y, mo - 1, day, 0, 0, 0, 0);
}

function getRecentMatchesWithinYear(allMatches: MatchRecord[]): MatchRecord[] {
  const globalLatest = latestMatchDate(allMatches);
  if (globalLatest === null) {
    return [];
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const windowStart = new Date(globalLatest.getTime() - 365 * msPerDay);

  return allMatches.filter((m) => {
    const d = matchDate(m);
    return d !== null && d >= windowStart;
  });
}

function userIdsOnGlobalPlayDay(matches: MatchRecord[], dayKey: string): Set<string> {
  const dayStart = startOfLocalDayFromKey(dayKey);
  const dayEnd = endOfLocalDayFromKey(dayKey);
  const userIds = new Set<string>();

  for (const m of matches) {
    const d = matchDate(m);
    if (d !== null && d >= dayStart && d <= dayEnd) {
      userIds.add(m.userId);
    }
  }

  return userIds;
}

function latestMatchDate(matches: MatchRecord[]): Date | null {
  const dates = matches
    .map((m) => matchDate(m))
    .filter((d): d is Date => d !== null)
    .map((d) => d.getTime());
  if (dates.length === 0) {
    return null;
  }
  return new Date(Math.max(...dates));
}

function computeRatingSnapshotAtEndOfCutoff(
  allMatches: MatchRecord[],
  neutralSessionIds: Set<string>,
  userId: string,
  cutoffInclusive: Date,
  eloConfig?: Partial<EloConfig>
): number {
  const through = allMatches.filter((m) => {
    const d = matchDate(m);
    return d !== null && d <= cutoffInclusive;
  });

  const userMatches = through.filter((m) => m.userId === userId);
  const eloRatings = computeEloRatings(through, neutralSessionIds, eloConfig, cutoffInclusive);
  return getUserEloRating(eloRatings, userId, userMatches.length > 0);
}

/**
 * Compares rating at end of the globally last playing day vs the previous global playing day
 * (same two calendar days for every player). Uses full cumulative Elo through each cutoff.
 *
 * Match list is limited to the last 365 days from the latest match in the dataset.
 */
export function getRatingDeltaLastTwoPlayingDays(
  allMatches: MatchRecord[],
  neutralSessionIds: Set<string>,
  userId: string,
  eloConfig?: Partial<EloConfig>
): number | null {
  const recentAllMatches = getRecentMatchesWithinYear(allMatches);
  if (recentAllMatches.length === 0) {
    return null;
  }

  const globalDayKeys = distinctLocalDayKeysDescending(recentAllMatches);
  if (globalDayKeys.length < 2) {
    return null;
  }

  const lastKey = globalDayKeys[0];
  const prevKey = globalDayKeys[1];
  const lastDayUserIds = userIdsOnGlobalPlayDay(recentAllMatches, lastKey);
  if (!lastDayUserIds.has(userId)) {
    return null;
  }

  const lastEnd = endOfLocalDayFromKey(lastKey);
  const prevEnd = endOfLocalDayFromKey(prevKey);

  const ratingLast = computeRatingSnapshotAtEndOfCutoff(
    recentAllMatches,
    neutralSessionIds,
    userId,
    lastEnd,
    eloConfig
  );
  const ratingPrev = computeRatingSnapshotAtEndOfCutoff(
    recentAllMatches,
    neutralSessionIds,
    userId,
    prevEnd,
    eloConfig
  );
  return ratingLast - ratingPrev;
}

/**
 * Sign + Arabic digits, two decimal places (e.g. +2.45, -0.12, +0.00).
 */
export function formatRatingDeltaDisplay(delta: number): string {
  const rounded = Math.round(delta * 100) / 100;
  const sign = rounded >= 0 ? '+' : '-';
  const abs = Math.abs(rounded);
  const intPart = Math.floor(abs);
  const frac100 = Math.round((abs - intPart) * 100);
  const fracStr = String(frac100).padStart(2, '0');

  return `${sign}${intPart}.${fracStr}`;
}
